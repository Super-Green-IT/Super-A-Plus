import { NextResponse } from 'next/server'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import path from 'path'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { DOCUMENT_MAX_BYTES, getDocumentMimeType, getDocumentStorageDirectory, getDocumentUrl } from '@/lib/storage/documents'
import { writeAuditLog } from '@/lib/audit'

const labelSchema = z.string().trim().min(1).max(80)
const supportedTypes = new Map([
  ['image/jpeg', { extension: 'jpg', signature: (bytes: Buffer) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }],
  ['image/png', { extension: 'png', signature: (bytes: Buffer) => bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) }],
  ['image/webp', { extension: 'webp', signature: (bytes: Buffer) => bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' }],
  ['application/pdf', { extension: 'pdf', signature: (bytes: Buffer) => bytes.subarray(0, 5).toString('ascii') === '%PDF-' }],
])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('members:edit')
  if (!auth.user) return auth.response

  let savedPath: string | undefined
  try {
    const { id: memberId } = await params
    if (!z.string().uuid().safeParse(memberId).success) return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 })
    const contentLength = Number(request.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > DOCUMENT_MAX_BYTES + 1024 * 1024) {
      return NextResponse.json({ error: 'Document must be 10 MB or smaller' }, { status: 413 })
    }
    const member = await prisma.member.findFirst({
      where: auth.user.role === 'ADMIN'
        ? { id: memberId }
        : { id: memberId, centre: { branchId: auth.user.branchId! } },
      select: { id: true },
    })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file')
    const parsedLabel = labelSchema.safeParse(formData.get('label') ?? 'Document')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'A document file is required' }, { status: 400 })
    }
    if (!parsedLabel.success) {
      return NextResponse.json({ error: 'Document label must be between 1 and 80 characters' }, { status: 400 })
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      return NextResponse.json({ error: 'Document must be 10 MB or smaller' }, { status: 413 })
    }

    const fileType = supportedTypes.get(file.type)
    if (!fileType) return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and PDF files are allowed' }, { status: 400 })

    const bytes = Buffer.from(await file.arrayBuffer())
    if (!fileType.signature(bytes)) {
      return NextResponse.json({ error: 'File contents do not match the selected file type' }, { status: 400 })
    }

    const filename = `${randomUUID()}.${fileType.extension}`
    const storageDirectory = getDocumentStorageDirectory()
    await mkdir(storageDirectory, { recursive: true, mode: 0o700 })
    savedPath = path.join(storageDirectory, filename)
    await writeFile(savedPath, bytes, { flag: 'wx', mode: 0o600 })

    try {
      const document = await prisma.$transaction(async (tx) => {
        const created = await tx.document.create({
          data: {
            memberId,
            label: parsedLabel.data,
            storagePath: filename,
            mimeType: file.type,
          },
        })
        await writeAuditLog(tx, {
          userId: auth.user.id,
          action: 'DOCUMENT_UPLOADED',
          tableName: 'documents',
          recordId: created.id,
          newValues: { memberId, label: created.label, mimeType: created.mimeType },
        })
        return created
      })
      return NextResponse.json({
        document: { ...document, storagePath: getDocumentUrl(memberId, document.id) },
      }, { status: 201 })
    } catch (error) {
      await unlink(savedPath).catch(() => undefined)
      throw error
    }
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('members:view')
  if (!auth.user) return auth.response

  try {
    const { id: memberId } = await params
    if (!z.string().uuid().safeParse(memberId).success) return NextResponse.json({ error: 'Invalid member ID' }, { status: 400 })
    const member = await prisma.member.findFirst({
      where: auth.user.role === 'ADMIN'
        ? { id: memberId }
        : { id: memberId, centre: { branchId: auth.user.branchId! } },
      select: { id: true },
    })
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    const documents = await prisma.document.findMany({
      where: { memberId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({
      documents: documents.map((document) => ({
        ...document,
        mimeType: getDocumentMimeType(document.storagePath) ?? 'application/octet-stream',
        storagePath: getDocumentUrl(memberId, document.id),
      })),
    })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}
