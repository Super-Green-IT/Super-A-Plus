import { NextResponse } from 'next/server'
import { lstat, readFile } from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { DOCUMENT_MAX_BYTES, getDocumentMimeType, getDocumentPath } from '@/lib/storage/documents'
import { z } from 'zod'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const auth = await authorizeApi('members:view')
  if (!auth.user) return auth.response

  try {
    const { id: memberId, documentId } = await params
    if (!z.string().uuid().safeParse(memberId).success || !z.string().uuid().safeParse(documentId).success) {
      return NextResponse.json({ error: 'Invalid document reference' }, { status: 400 })
    }
    const member = await prisma.member.findFirst({
      where: auth.user.role === 'ADMIN'
        ? { id: memberId }
        : { id: memberId, centre: { branchId: auth.user.branchId! } },
      select: { id: true },
    })
    if (!member) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const document = await prisma.document.findFirst({
      where: { id: documentId, memberId },
      select: { storagePath: true },
    })
    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const filePath = getDocumentPath(document.storagePath)
    const mimeType = getDocumentMimeType(document.storagePath)
    if (!filePath || !mimeType) return NextResponse.json({ error: 'Document is unavailable' }, { status: 404 })

    let content: Buffer
    try {
      const fileInfo = await lstat(filePath)
      if (!fileInfo.isFile() || fileInfo.isSymbolicLink()) {
        return NextResponse.json({ error: 'Document is unavailable' }, { status: 404 })
      }
      if (fileInfo.size > DOCUMENT_MAX_BYTES) {
        return NextResponse.json({ error: 'Document exceeds the allowed size' }, { status: 413 })
      }
      content = await readFile(filePath)
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
        return NextResponse.json({ error: 'Document file is missing' }, { status: 404 })
      }
      throw error
    }

    return new Response(new Uint8Array(content), {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(content.byteLength),
        'Content-Disposition': `${mimeType.startsWith('image/') ? 'inline' : 'attachment'}; filename="member-document.${document.storagePath.split('.').pop()}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Document download error:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}
