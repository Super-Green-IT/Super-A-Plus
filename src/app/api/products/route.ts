import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { productCreateSchema } from '@/lib/validation/products'
import { writeAuditLog } from '@/lib/audit'
import { readJson } from '@/lib/http/json'

export async function GET(request: Request) {
  const auth = await authorizeApi('products:view')
  if (!auth.user) return auth.response

  try {
    const includeInactive = auth.user.role === 'ADMIN' && new URL(request.url).searchParams.get('includeInactive') === 'true'
    const products = await prisma.loanProduct.findMany({
      where: includeInactive ? {} : { isActive: true },
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
    const body = await readJson(req)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = productCreateSchema.safeParse(body.value)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product data' }, { status: 400 })
    }
    const { name, loanType, interestMethod, annualInterestRate, minAmount, maxAmount, minTermWeeks, maxTermWeeks, processingFeeRate, requiresGuarantor } = parsed.data

    // Check unique name
    const existing = await prisma.loanProduct.findFirst({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'A product with this name already exists' }, { status: 409 })
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.loanProduct.create({
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
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'PRODUCT_CREATED',
        tableName: 'loan_products',
        recordId: created.id,
        newValues: { name: created.name, isActive: created.isActive },
      })
      return created
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'A product with this name already exists' }, { status: 409 })
    }
    console.error('Error creating loan product:', error)
    return NextResponse.json({ error: 'Failed to create loan product' }, { status: 500 })
  }
}
