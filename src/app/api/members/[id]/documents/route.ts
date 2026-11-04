import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const label = (formData.get('label') as string) || 'Document'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Verify member exists
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    })
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prepare upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    await mkdir(uploadDir, { recursive: true })

    // Generate safe unique filename
    const ext = path.extname(file.name) || '.jpg'
    const safeName = `doc-${memberId}-${Date.now()}${ext}`
    const filePath = path.join(uploadDir, safeName)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const storagePath = `/uploads/documents/${safeName}`

    // Create Document record in DB
    const document = await prisma.document.create({
      data: {
        memberId,
        label,
        storagePath,
        mimeType: file.type || 'image/jpeg',
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params
    const documents = await prisma.document.findMany({
      where: { memberId },
      orderBy: { uploadedAt: 'desc' },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}
