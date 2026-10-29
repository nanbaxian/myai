'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { apiUrl } from '@/lib/api-url'

const TENANT_ID = 'tenant_demo'
const ACCEPT = '.pdf,.docx,.md,.markdown,.txt,.csv,.json,.html,.htm'
const MAX_FILE_BYTES = 20 * 1024 * 1024

type DocumentRow = {
  id: string
  title: string
  file_name: string | null
  status: 'processing' | 'ready' | 'failed' | string
  error_msg: string | null
  created_at: string
}

type Upload = {
  name: string
  state: 'uploading' | 'done' | 'error'
  message?: string
}

const statusStyle: Record<string, string> = {
  ready: 'bg-emerald-400/15 text-emerald-200',
  processing: 'bg-amber-300/15 text-amber-100',
  failed: 'bg-rose-400/15 text-rose-200',
}

export default function KnowledgeUploader() {
  const { getToken } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [uploads, setUploads] = useState<Upload[]>([])
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/documents'), { headers: { 'X-Tenant-Id': TENANT_ID } })
      if (res.ok) setDocuments(await res.json())
    } catch {
      // Keep the last known list when the network request fails.
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const updateUpload = (index: number, patch: Partial<Upload>) => {
    setUploads(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const uploadFiles = async (files: File[]) => {
    if (!files.length || busy) return
    setBusy(true)
    setUploads(files.map(file => ({ name: file.name, state: 'uploading' })))

    const token = await getToken()
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.size > MAX_FILE_BYTES) {
        updateUpload(i, { state: 'error', message: 'File too large (max 20 MB)' })
        continue
      }

      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(apiUrl('/api/knowledge/ingest'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': TENANT_ID },
          body: form,
        })
        const data = (await res.json().catch(() => ({}))) as { chunks?: number; error?: string; error_msg?: string | null }
        if (res.ok) {
          updateUpload(i, { state: 'done', message: `${data.chunks ?? 0} chunks indexed` })
        } else {
          updateUpload(i, { state: 'error', message: data.error_msg || data.error || `HTTP ${res.status}` })
        }
      } catch (error) {
        updateUpload(i, { state: 'error', message: error instanceof Error ? error.message : 'Network error' })
      }
    }

    setBusy(false)
    await loadDocuments()
    if (inputRef.current) inputRef.current.value = ''
  }

  const onDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    uploadFiles(Array.from(event.dataTransfer.files))
  }

  return (
    <div className="mt-6 space-y-6">
      <label
        onDragOver={event => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[2rem] border border-dashed px-6 py-12 text-center backdrop-blur-xl transition ${
          dragging ? 'border-amber-200/70 bg-white/10' : 'border-white/15 bg-white/5 hover:bg-white/8'
        } ${busy ? 'pointer-events-none opacity-70' : ''}`}
      >
        {busy ? <Loader2 className="h-7 w-7 animate-spin text-amber-100" /> : <FileUp className="h-7 w-7 text-amber-100" />}
        <span className="text-base font-medium text-white">{busy ? 'Indexing documents…' : 'Drop files here or click to upload'}</span>
        <span className="text-sm text-white/45">PDF, DOCX, Markdown, TXT, CSV, JSON, HTML · up to 20 MB each</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={event => uploadFiles(Array.from(event.target.files ?? []))}
        />
      </label>

      {uploads.length > 0 && (
        <ul className="space-y-2 text-sm">
          {uploads.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <span className="truncate text-white">{item.name}</span>
              <span className={item.state === 'error' ? 'text-rose-200' : 'text-white/60'}>
                {item.state === 'uploading' ? 'Uploading…' : item.message}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 backdrop-blur-xl">
        <div className="grid grid-cols-[2fr_1fr_1fr] border-b border-white/10 px-5 py-4 text-xs uppercase tracking-[0.24em] text-white/45">
          <span>Document</span>
          <span>Status</span>
          <span>Uploaded</span>
        </div>
        {documents.length === 0 && <p className="px-5 py-6 text-sm text-white/45">No documents yet.</p>}
        {documents.map(doc => (
          <div key={doc.id} className="grid grid-cols-[2fr_1fr_1fr] items-center border-b border-white/6 px-5 py-4 text-sm last:border-b-0">
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{doc.title}</p>
              {doc.error_msg && <p className="mt-1 truncate text-xs text-rose-200">{doc.error_msg}</p>}
            </div>
            <span>
              <span className={`rounded-full px-3 py-1 text-xs ${statusStyle[doc.status] ?? 'bg-white/10 text-white/70'}`}>{doc.status}</span>
            </span>
            <span className="text-white/65">{new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
