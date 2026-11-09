import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { formatSLPhone } from '@/lib/validation/nic'

const leadCreateSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  phone: z.string().min(9, 'Valid phone number is required'),
  source: z.string().default('FACEBOOK'),
  notes: z.string().optional().nullable(),
  appointmentAt: z.string().optional().nullable(),
})

const leadUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['NEW', 'CONTACTED', 'APPOINTMENT_SET', 'CONVERTED', 'LOST']).optional(),
  notes: z.string().optional().nullable(),
  appointmentAt: z.string().optional().nullable(),
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim()
    const status = searchParams.get('status')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '30', 10)))
    const skip = (page - 1) * limit

    const where: any = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [leads, total, newCount, contactedCount, apptCount, convertedCount] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { status: 'NEW' } }),
      prisma.lead.count({ where: { status: 'CONTACTED' } }),
      prisma.lead.count({ where: { status: 'APPOINTMENT_SET' } }),
      prisma.lead.count({ where: { status: 'CONVERTED' } }),
    ])

    return NextResponse.json({
      leads,
      metrics: {
        total,
        new: newCount,
        contacted: contactedCount,
        appointment: apptCount,
        converted: convertedCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = leadCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid lead details' },
        { status: 400 }
      )
    }

    const { fullName, phone, source, notes, appointmentAt } = parsed.data

    const lead = await prisma.lead.create({
      data: {
        fullName: fullName.trim(),
        phone: formatSLPhone(phone.trim()),
        source: source.trim() || 'FACEBOOK',
        notes: notes?.trim() || null,
        appointmentAt: appointmentAt ? new Date(appointmentAt) : null,
        status: appointmentAt ? 'APPOINTMENT_SET' : 'NEW',
      },
      include: {
        assignedTo: { select: { id: true, fullName: true } },
      },
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('Error creating lead:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const parsed = leadUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid update data' },
        { status: 400 }
      )
    }

    const { id, status, notes, appointmentAt, fullName, phone } = parsed.data

    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (appointmentAt !== undefined) {
      updateData.appointmentAt = appointmentAt ? new Date(appointmentAt) : null
    }
    if (fullName !== undefined) updateData.fullName = fullName.trim()
    if (phone !== undefined) updateData.phone = formatSLPhone(phone.trim())

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, fullName: true } },
      },
    })

    return NextResponse.json({ lead })
  } catch (error) {
    console.error('Error updating lead:', error)
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
  }
}
