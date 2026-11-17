import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authorizeApi } from '@/lib/auth/api'
import { productUpdateSchema } from '@/lib/validation/products'
import type { Prisma } from '@prisma/client'
import { writeAuditLog } from '@/lib/audit'
import { readJson } from '@/lib/http/json'
import { z } from 'zod'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeApi('products:view')
  if (!auth.user) return auth.response

  try {
    const { id } = await params
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
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
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    const body = await readJson(req)
    if (!body.success) return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
    const parsed = productUpdateSchema.safeParse(body.value)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid product data' }, { status: 400 })
    }
    const { name, loanType, interestMethod, annualInterestRate, minAmount, maxAmount, minTermWeeks, maxTermWeeks, processingFeeRate, requiresGuarantor, isActive } = parsed.data
    const existingProduct = await prisma.loanProduct.findUnique({ where: { id } })
    if (!existingProduct) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

    const nextMinAmount = minAmount ?? Number(existingProduct.minAmount)
    const nextMaxAmount = maxAmount ?? Number(existingProduct.maxAmount)
    const nextMinTerm = minTermWeeks ?? existingProduct.minTermWeeks
    const nextMaxTerm = maxTermWeeks ?? existingProduct.maxTermWeeks
    if (nextMinAmount >= nextMaxAmount) {
      return NextResponse.json({ error: 'Maximum loan amount must exceed minimum loan amount' }, { status: 400 })
    }
    if (nextMinTerm > nextMaxTerm) {
      return NextResponse.json({ error: 'Maximum term must be at least the minimum term' }, { status: 400 })
    }

    // Check unique name collision (exclude self)
    if (name) {
      const existing = await prisma.loanProduct.findFirst({
        where: { name, NOT: { id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'A product with this name already exists' }, { status: 409 })
      }
    }

    const data: Prisma.LoanProductUpdateInput = {}
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

    const product = await prisma.$transaction(async (tx) => {
      const changed = await tx.loanProduct.update({ where: { id }, data })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'PRODUCT_UPDATED',
        tableName: 'loan_products',
        recordId: id,
        oldValues: { name: existingProduct.name, isActive: existingProduct.isActive },
        newValues: { name: changed.name, isActive: changed.isActive },
      })
      return changed
    })
    return NextResponse.json({ product })
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({ error: 'A product with this name already exists' }, { status: 409 })
    if (isRecordNotFound(error)) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
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
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 })
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.loanProduct.findUnique({ where: { id } })
      if (!existing) return null
      const loanCount = await tx.loan.count({ where: { productId: id } })
      if (loanCount > 0) {
        const product = await tx.loanProduct.update({ where: { id }, data: { isActive: false } })
        await writeAuditLog(tx, {
          userId: auth.user.id,
          action: 'PRODUCT_DEACTIVATED',
          tableName: 'loan_products',
          recordId: id,
          oldValues: { isActive: existing.isActive },
          newValues: { isActive: product.isActive },
        })
        return { message: 'Product deactivated (has associated loans)' }
      }
      await tx.loanProduct.delete({ where: { id } })
      await writeAuditLog(tx, {
        userId: auth.user.id,
        action: 'PRODUCT_DELETED',
        tableName: 'loan_products',
        recordId: id,
        oldValues: { name: existing.name },
      })
      return { message: 'Product deleted' }
    })
    if (!result) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    return NextResponse.json(result)
  } catch (error) {
    if (isForeignKeyViolation(error)) return NextResponse.json({ error: 'Product is used by existing loans and cannot be deleted' }, { status: 409 })
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'
}

function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003'
}

function isRecordNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025'
}
