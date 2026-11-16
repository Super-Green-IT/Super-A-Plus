import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { productUpdateSchema } from '@/lib/validation/products'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('products:view')
  if (!auth.user) return auth.response

  try {
    const { id } = await params
    const product = await prisma.loanProduct.findUnique({ where: { id } })
    if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('settings:manage')
  if (!auth.user) return auth.response

  try {
    const { id } = await params
    const parsed = productUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product data' }, { status: 400 })
    }
    const { name, loanType, interestMethod, annualInterestRate, minAmount, maxAmount, minTermWeeks, maxTermWeeks, processingFeeRate, requiresGuarantor, isActive } = parsed.data

    // Check unique name collision (exclude self)
    if (name) {
      const existing = await prisma.loanProduct.findFirst({
        where: { name, NOT: { id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'A product with this name already exists' }, { status: 409 })
      }
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (loanType !== undefined) data.loanType = loanType
    if (interestMethod !== undefined) data.interestMethod = interestMethod
    if (annualInterestRate !== undefined) data.annualInterestRate = String(annualInterestRate)
    if (minAmount !== undefined) data.minAmount = String(minAmount)
    if (maxAmount !== undefined) data.maxAmount = String(maxAmount)
    if (minTermWeeks !== undefined) data.minTermWeeks = Number(minTermWeeks)
    if (maxTermWeeks !== undefined) data.maxTermWeeks = Number(maxTermWeeks)
    if (processingFeeRate !== undefined) data.processingFeeRate = String(processingFeeRate)
    if (requiresGuarantor !== undefined) data.requiresGuarantor = Boolean(requiresGuarantor)
    if (isActive !== undefined) data.isActive = Boolean(isActive)

    const product = await prisma.loanProduct.update({ where: { id }, data })
    return NextResponse.json({ product })
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('settings:manage')
  if (!auth.user) return auth.response

  try {
    const { id } = await params
    // Check for active loans using this product
    const loanCount = await prisma.loan.count({ where: { productId: id } })
    if (loanCount > 0) {
      // Soft-delete: mark inactive instead of hard delete
      await prisma.loanProduct.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ message: 'Product deactivated (has associated loans)' })
    }
    await prisma.loanProduct.delete({ where: { id } })
    return NextResponse.json({ message: 'Product deleted' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
