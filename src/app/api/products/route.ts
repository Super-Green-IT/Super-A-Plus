import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
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
  try {
    const body = await req.json()
    const {
      name,
      loanType,
      interestMethod,
      annualInterestRate,
      minAmount,
      maxAmount,
      minTermWeeks,
      maxTermWeeks,
      processingFeeRate,
      requiresGuarantor,
    } = body

    if (!name || !loanType || !interestMethod || annualInterestRate == null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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
        minAmount: String(minAmount ?? 0),
        maxAmount: String(maxAmount ?? 0),
        minTermWeeks: Number(minTermWeeks ?? 1),
        maxTermWeeks: Number(maxTermWeeks ?? 52),
        processingFeeRate: String(processingFeeRate ?? 0),
        requiresGuarantor: Boolean(requiresGuarantor ?? true),
        isActive: true,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Error creating loan product:', error)
    return NextResponse.json({ error: 'Failed to create loan product' }, { status: 500 })
  }
}
