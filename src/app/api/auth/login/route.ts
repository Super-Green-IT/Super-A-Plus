import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { readJson } from '@/lib/http/json'

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Invalid email or password'),
}).strict()

export async function POST(request: Request) {
  try {
    const body = await readJson(request)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = loginSchema.safeParse(body.value)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid credentials' },
        { status: 400 }
      )
    }

    const { email, password } = parsed.data

    const user = await prisma.userProfile.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
    }

    await createSession(sessionUser, user.authVersion)

    return NextResponse.json({
      user: sessionUser,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_CREATION_REJECTED') {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing your request' },
      { status: 500 }
    )
  }
}
