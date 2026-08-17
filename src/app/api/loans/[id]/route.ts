import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { shapeLoan } from '@/lib/api-shape'

const LOAN_INCLUDE = {
  employees: { include: { departments: true } },
  loan_items: { include: { equipment: { include: { categories: true } } } },
} as const

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const loan = await prisma.loans.findUniqueOrThrow({ where: { id }, include: LOAN_INCLUDE })
  return NextResponse.json({ data: shapeLoan(loan) })
})
