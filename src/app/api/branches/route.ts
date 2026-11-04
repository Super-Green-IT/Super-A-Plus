import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const branchSchema = z.object({
  name: z.string().min(2, 'Branch name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
})

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        centres: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: { staff: true, loans: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ branches })
  } catch (error) {
    console.error('Error fetching branches:', error)
    return NextResponse.json({ error: 'Failed to fetch branches' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = branchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid branch data' },
        { status: 400 }
      )
    }

    const branch = await prisma.branch.create({
      data: parsed.data,
    })

    return NextResponse.json({ branch }, { status: 201 })
  } catch (error) {
    console.error('Error creating branch:', error)
    return NextResponse.json({ error: 'Failed to create branch' }, { status: 500 })
  }
}
