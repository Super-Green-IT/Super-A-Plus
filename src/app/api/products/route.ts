import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { productCreateSchema } from '@/lib/validation/products'

export async function GET() {
  const auth = await authorizeApi('products:view')
  if (!auth.user) return auth.response

  try {
    const products = await prisma.loanProduct.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ products })
  } catch (error) {
    console.error('Error fetching loan products:', error)
    return NextResponse.json({ error: 'Failed to fetch loan products' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeApi('settings:manage')
  if (!auth.user) return auth.response

  try {
    const parsed = productCreateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product data' }, { status: 400 })
    }
    const { name, loanType, interestMethod, annualInterestRate, minAmount, maxAmount, minTermWeeks, maxTermWeeks, processingFeeRate, requiresGuarantor } = parsed.data

    // Check unique name
    const existing = await prisma.loanProduct.findFirst({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'A product with this name already exists' }, { status: 409 })
    }

    const product = await prisma.loanProduct.create({
      data: {
        name,
        loanType,
        interestMethod,
        annualInterestRate: String(annualInterestRate),
        minAmount: String(minAmount),
        maxAmount: String(maxAmount),
        minTermWeeks,
        maxTermWeeks,
        processingFeeRate: String(processingFeeRate),
        requiresGuarantor,
        isActive: true,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Error creating loan product:', error)
    return NextResponse.json({ error: 'Failed to create loan product' }, { status: 500 })
  }
}
