import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { parsePagination } from '@/lib/http/query'

export async function GET(request: Request) {
  const auth = await authorizeApi('audit:view')
  if (!auth.user) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const pagination = parsePagination(searchParams, 50)
    if (!pagination) return NextResponse.json({ error: 'Invalid pagination values' }, { status: 400 })

    const action = searchParams.get('action')?.trim()
    const tableName = searchParams.get('tableName')?.trim()
    if (action && (!z.string().min(1).max(80).safeParse(action).success)) {
      return NextResponse.json({ error: 'Invalid action filter' }, { status: 400 })
    }
    if (tableName && !z.string().min(1).max(80).safeParse(tableName).success) {
      return NextResponse.json({ error: 'Invalid table filter' }, { status: 400 })
    }

    const where = {
      ...(action ? { action } : {}),
      ...(tableName ? { tableName } : {}),
    }
    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          action: true,
          tableName: true,
          recordId: true,
          oldValues: true,
          newValues: true,
          createdAt: true,
          user: { select: { id: true, fullName: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({
      entries,
      pagination: { page: pagination.page, limit: pagination.limit, total, totalPages: Math.ceil(total / pagination.limit) },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
