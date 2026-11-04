import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const centreSchema = z.object({
  name: z.string().min(2, 'Centre name is required'),
  branchId: z.string().uuid('Valid Branch ID is required'),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const branchId = searchParams.get('branchId')

    const centres = await prisma.centre.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ centres })
  } catch (error) {
    console.error('Error fetching centres:', error)
    return NextResponse.json({ error: 'Failed to fetch centres' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = centreSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid centre data' },
        { status: 400 }
      )
    }

    const centre = await prisma.centre.create({
      data: parsed.data,
      include: { branch: true },
    })

    return NextResponse.json({ centre }, { status: 201 })
  } catch (error) {
    console.error('Error creating centre:', error)
    return NextResponse.json({ error: 'Failed to create centre' }, { status: 500 })
  }
}
