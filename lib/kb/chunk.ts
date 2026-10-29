// lib/kb/chunk.ts
// Splits extracted units into overlapping chunks that keep page number and section heading for citations.

import type { ExtractedUnit } from './extract'

export type Chunk = {
  content: string
  chunk_index: number
  page_num: number | null
  section: string | null
}

const DEFAULT_SIZE = 800
const DEFAULT_OVERLAP = 120
const HEADING = /^#{1,6}\s+(.+)$/

export function chunkUnits(units: ExtractedUnit[], size = DEFAULT_SIZE, overlap = DEFAULT_OVERLAP): Chunk[] {
  const chunks: Chunk[] = []
  let section: string | null = null

  for (const unit of units) {
    let current = ''
    let currentSection: string | null = section
    let carry = ''

    const flush = () => {
      const content = current.trim()
      if (!content) return
      chunks.push({ content, chunk_index: chunks.length, page_num: unit.page_num ?? null, section: currentSection })
      carry = content.slice(-overlap)
      current = ''
    }

    for (const paragraph of unit.text.split(/\n\s*\n/)) {
      const trimmed = paragraph.trim()
      if (!trimmed) continue

      // A new heading starts a new chunk so each chunk carries exactly one section label.
      const heading = trimmed.match(HEADING)
      if (heading) {
        flush()
        carry = ''
        section = heading[1].trim().slice(0, 120)
      }

      for (const piece of splitLong(trimmed, size)) {
        if (current && current.length + piece.length + 2 > size) {
          flush()
          current = carry ? `${carry}\n\n` : ''
        }
        if (!current) currentSection = section
        current += (current && !current.endsWith('\n\n') ? '\n\n' : '') + piece
      }
    }
    flush()
  }

  return chunks
}

// Breaks a paragraph longer than the chunk size at sentence or whitespace boundaries.
function splitLong(text: string, size: number): string[] {
  if (text.length <= size) return [text]
  const parts: string[] = []
  let rest = text
  while (rest.length > size) {
    let cut = Math.max(rest.lastIndexOf('。', size), rest.lastIndexOf('. ', size), rest.lastIndexOf(' ', size))
    if (cut < size / 2) cut = size
    parts.push(rest.slice(0, cut + 1).trim())
    rest = rest.slice(cut + 1)
  }
  if (rest.trim()) parts.push(rest.trim())
  return parts
}
