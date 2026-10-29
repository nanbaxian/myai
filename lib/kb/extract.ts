// lib/kb/extract.ts
// Turns an uploaded file into plain text, one entry per page (or one entry for formats without pages).
// Supported: PDF, DOCX, Markdown, plain text, CSV, JSON, HTML.

import { unzipSync, strFromU8 } from 'fflate'
import { extractText as extractPdfText } from 'unpdf'

export const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'md', 'markdown', 'txt', 'csv', 'json', 'html', 'htm'] as const

export type ExtractedUnit = {
  text: string
  page_num?: number
}

export class UnsupportedFormatError extends Error {
  constructor(name: string) {
    super(`Unsupported file type: ${name}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`)
  }
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase()
}

export function titleFromFileName(name: string): string {
  const dot = name.lastIndexOf('.')
  return (dot > 0 ? name.slice(0, dot) : name).trim() || 'Untitled document'
}

export async function extractUnits(name: string, bytes: Uint8Array): Promise<ExtractedUnit[]> {
  switch (fileExtension(name)) {
    case 'pdf':
      return extractPdf(bytes)
    case 'docx':
      return [{ text: extractDocx(bytes) }]
    case 'html':
    case 'htm':
      return [{ text: htmlToText(decodeUtf8(bytes)) }]
    case 'md':
    case 'markdown':
    case 'txt':
    case 'csv':
    case 'json':
      return [{ text: decodeUtf8(bytes) }]
    default:
      throw new UnsupportedFormatError(name)
  }
}

function decodeUtf8(bytes: Uint8Array): string {
  // Strip a UTF-8 BOM so headers and first lines are not polluted.
  const start = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0
  return new TextDecoder('utf-8').decode(bytes.subarray(start))
}

async function extractPdf(bytes: Uint8Array): Promise<ExtractedUnit[]> {
  const { text } = await extractPdfText(bytes, { mergePages: false })
  const pages = Array.isArray(text) ? text : [text]
  return pages
    .map((pageText, idx) => ({ text: pageText.trim(), page_num: idx + 1 }))
    .filter(unit => unit.text.length > 0)
}

// DOCX is a zip archive; the body lives in word/document.xml.
// Headings are emitted as Markdown "#" lines so the chunker can attach them as sections.
function extractDocx(bytes: Uint8Array): string {
  const entries = unzipSync(bytes, { filter: file => file.name === 'word/document.xml' })
  const xml = entries['word/document.xml']
  if (!xml) throw new Error('Invalid DOCX: word/document.xml not found')

  const doc = strFromU8(xml)
  const paragraphs = doc.match(/<w:p[ >][\s\S]*?<\/w:p>/g) ?? []

  return paragraphs
    .map(paragraph => {
      const text = (paragraph.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) ?? [])
        .map(run => decodeEntities(run.replace(/<[^>]+>/g, '')))
        .join('')
        .trim()
      if (!text) return ''
      const style = paragraph.match(/<w:pStyle w:val="Heading(\d)"/)
      return style ? `${'#'.repeat(Number(style[1]))} ${text}` : text
    })
    .filter(Boolean)
    .join('\n\n')
}

function htmlToText(html: string): string {
  const body = html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<h([1-6])[^>]*>/gi, (_, level) => `\n\n${'#'.repeat(Number(level))} `)
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<(br|\/p|\/div|\/li|\/tr)\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(body)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim()
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
}
