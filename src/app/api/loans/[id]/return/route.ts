import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { shapeLoan } from '@/lib/api-shape'
import { loanReturnSchema, validateBody } from '@/lib/validation'
import { processReturn } from '@/lib/loan-service'

const LOAN_INCLUDE = {
  employees: { include: { departments: true } },
  loan_items: { include: { equipment: { include: { categories: true } } } },
} as const

export const POST = withAuth<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const { data: body, error } = validateBody(loanReturnSchema, await req.json())
  if (error) return error

  await prisma.$transaction((tx) => processReturn(tx, id, body))

  const loan = await prisma.loans.findUniqueOrThrow({ where: { id }, include: LOAN_INCLUDE })
  return NextResponse.json({ data: shapeLoan(loan) })
})
