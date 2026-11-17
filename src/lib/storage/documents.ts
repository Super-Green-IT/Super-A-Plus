import 'server-only'
import path from 'path'

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024

const documentDirectory = process.env.DOCUMENT_STORAGE_DIR || path.join(process.cwd(), 'storage', 'documents')

export function getDocumentStorageDirectory(): string {
  const resolved = path.resolve(documentDirectory)
  const publicDirectory = path.resolve(process.cwd(), 'public')
  const relative = path.relative(publicDirectory, resolved)
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('DOCUMENT_STORAGE_DIR must be outside the public directory')
  }
  return resolved
}

export function getDocumentPath(filename: string): string | null {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf|bin)$/.test(filename)) return null
  return path.join(getDocumentStorageDirectory(), filename)
}

export function getDocumentMimeType(filename: string): string | null {
  switch (path.extname(filename).toLowerCase()) {
    case '.jpg': return 'image/jpeg'
    case '.png': return 'image/png'
    case '.webp': return 'image/webp'
    case '.pdf': return 'application/pdf'
    case '.bin': return 'application/octet-stream'
    default: return null
  }
}

export function getDocumentUrl(memberId: string, documentId: string): string {
  return `/api/members/${memberId}/documents/${documentId}`
}
