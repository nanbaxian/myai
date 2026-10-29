// functions/api/knowledge/ingest.ts
// POST /api/knowledge/ingest — upload one document (multipart "file"), parse, chunk, embed and index it.
// Accepts PDF, DOCX, Markdown, TXT, CSV, JSON and HTML. Requires Clerk auth.

import { verifyClerkToken } from '../../../lib/api-middleware'
import { createApiLogger } from '../../../lib/api-log'
import { dbRun, readTenantId, upsertDocument, type D1Document, type D1Env } from '../../../lib/knowledgeos-d1'
import { chunkUnits } from '../../../lib/kb/chunk'
import {
  extractUnits,
  fileExtension,
  SUPPORTED_EXTENSIONS,
  titleFromFileName,
  UnsupportedFormatError,
} from '../../../lib/kb/extract'
import { deleteChunks, embedTexts, insertChunks } from '../../../lib/kb/retrieve'
import { json, options } from '../_knowledgeos-shared'

interface Env extends D1Env {
  BUCKET: R2Bucket
  AI: Ai
}

const MAX_FILE_BYTES = 20 * 1024 * 1024

export const onRequestOptions = options

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const { request, env } = ctx
  const log = createApiLogger('knowledge:ingest', ctx)
  log.start()

  let userId: string
  try {
    const auth = await verifyClerkToken(request.headers.get('Authorization') || '')
    userId = auth.userId
  } catch (e: any) {
    log.fail(e, { stage: 'auth' })
    return json({ error: 'Unauthorized', detail: e?.message }, 401)
  }

  const tenantId = readTenantId(request)

  let file: File | null
  try {
    const form = await request.formData()
    file = form.get('file') as File | null
  } catch {
    return json({ error: 'Expected multipart/form-data with a "file" field' }, 400)
  }
  if (!file || file.size === 0) return json({ error: 'Missing file' }, 400)
  if (file.size > MAX_FILE_BYTES) return json({ error: 'File too large (max 20 MB)' }, 413)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const now = new Date().toISOString()
  const docId = `doc_${crypto.randomUUID()}`
  const r2Key = crypto.randomUUID()

  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(fileExtension(file.name))) {
    return json({ error: new UnsupportedFormatError(file.name).message }, 415)
  }

  await env.BUCKET.put(r2Key, bytes, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })

  const pending: D1Document = {
    id: docId,
    tenant_id: tenantId,
    source_id: null,
    title: titleFromFileName(file.name),
    file_name: file.name,
    r2_key: r2Key,
    status: 'processing',
    error_msg: null,
    version: 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await upsertDocument(env, pending)

  try {
    const units = await extractUnits(file.name, bytes)
    const chunks = chunkUnits(units)
    if (chunks.length === 0) throw new Error('No readable text found (scanned PDFs need OCR first)')

    const vectors = await embedTexts(env, chunks.map(chunk => chunk.content))
    await deleteChunks(env, docId)
    await insertChunks(env, tenantId, docId, chunks, vectors, now)

    await dbRun(env, `UPDATE documents SET status = 'ready', updated_at = ? WHERE id = ?`, [new Date().toISOString(), docId])
    log.ok({ userId, tenantId, docId, units: units.length, chunks: chunks.length })
    return json({ ...pending, status: 'ready', chunks: chunks.length }, 201)
  } catch (e: any) {
    const message = e instanceof UnsupportedFormatError ? e.message : (e?.message ?? 'Ingestion failed')
    await dbRun(env, `UPDATE documents SET status = 'failed', error_msg = ?, updated_at = ? WHERE id = ?`, [
      message,
      new Date().toISOString(),
      docId,
    ])
    log.fail(e, { userId, tenantId, docId, stage: 'ingest' })
    const status = e instanceof UnsupportedFormatError ? 415 : 422
    return json({ ...pending, status: 'failed', error_msg: message }, status)
  }
}
