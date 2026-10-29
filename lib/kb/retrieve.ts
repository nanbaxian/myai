// lib/kb/retrieve.ts
// Embedding, chunk storage and top-k search over D1. Embeddings are stored as JSON text and
// compared in the Worker with cosine similarity. Good for a few thousand chunks per tenant;
// move to Vectorize when a tenant outgrows that.

import type { Chunk } from './chunk'

export const EMBEDDING_MODEL = '@cf/baai/bge-m3'
const EMBED_BATCH = 32
const INSERT_BATCH = 50

type KbEnv = { myai?: D1Database; AI: Ai }

export type SearchHit = {
  title: string
  section: string | null
  page_num: number | null
  content: string
  score: number
  source_label: string
}

export async function embedTexts(env: Pick<KbEnv, 'AI'>, texts: string[]): Promise<number[][]> {
  const vectors: number[][] = []
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH)
    const res = await env.AI.run(EMBEDDING_MODEL, { text: batch, truncate_inputs: true })
    vectors.push(...res.data)
  }
  return vectors
}

export async function insertChunks(
  env: KbEnv,
  tenantId: string,
  documentId: string,
  chunks: Chunk[],
  vectors: number[][],
  createdAt: string,
): Promise<void> {
  if (!env.myai) throw new Error('D1 binding "myai" is not available')
  const db = env.myai
  for (let i = 0; i < chunks.length; i += INSERT_BATCH) {
    const statements = chunks.slice(i, i + INSERT_BATCH).map((chunk, offset) => {
      const idx = i + offset
      return db
        .prepare(
          `INSERT INTO document_chunks (id, document_id, tenant_id, chunk_index, content, page_num, section, embedding, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          `${documentId}_${chunk.chunk_index}`,
          documentId,
          tenantId,
          chunk.chunk_index,
          chunk.content,
          chunk.page_num,
          chunk.section,
          JSON.stringify(vectors[idx]),
          createdAt,
        )
    })
    await db.batch(statements)
  }
}

export async function deleteChunks(env: KbEnv, documentId: string): Promise<void> {
  if (!env.myai) return
  await env.myai.prepare(`DELETE FROM document_chunks WHERE document_id = ?`).bind(documentId).run()
}

export async function searchChunks(env: KbEnv, tenantId: string, query: string, topK: number): Promise<SearchHit[]> {
  if (!env.myai) return []

  const [queryVector] = await embedTexts(env, [query])
  if (!queryVector) return []

  const rows = await env.myai
    .prepare(
      `SELECT c.content, c.page_num, c.section, c.embedding, d.title, d.file_name
       FROM document_chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.tenant_id = ? AND d.status = 'ready' AND d.deleted_at IS NULL`,
    )
    .bind(tenantId)
    .all<{
      content: string
      page_num: number | null
      section: string | null
      embedding: string
      title: string
      file_name: string | null
    }>()

  return rows.results
    .map(row => ({
      row,
      score: cosine(queryVector, JSON.parse(row.embedding) as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ row, score }) => ({
      title: row.title,
      section: row.section,
      page_num: row.page_num,
      content: row.content,
      score,
      source_label: row.file_name ? `${row.title} (${row.file_name})` : row.title,
    }))
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
}
