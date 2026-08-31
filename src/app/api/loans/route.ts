import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { shapeLoan } from '@/lib/api-shape'
import { loanCreateSchema, validateBody } from '@/lib/validation'
import { reserveAndCreateLoan, EquipmentUnavailableError } from '@/lib/loan-service'

const LOAN_INCLUDE = {
  employees: { include: { departments: true } },
  loan_items: { include: { equipment: { include: { categories: true } } } },
} as const

export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined

  const loans = await prisma.loans.findMany({
    where: { status },
    include: LOAN_INCLUDE,
    orderBy: { created_at: 'desc' },
  })
  return NextResponse.json({ data: loans.map(shapeLoan) })
})

export const POST = withAuth(async (req: NextRequest) => {
  const { data: body, error } = validateBody(loanCreateSchema, await req.json())
  if (error) return error
  const {
    employee_id, checkout_date, checkout_time, expected_return_date,
    checkout_notes, processed_by, equipment_ids,
  } = body

  let loanId: string
  try {
    loanId = await prisma.$transaction((tx) => reserveAndCreateLoan(tx, {
      employee_id, checkout_date, checkout_time, expected_return_date,
      checkout_notes, processed_by, equipment_ids, source: 'internal',
    }))
  } catch (err) {
    if (err instanceof EquipmentUnavailableError) {
      return NextResponse.json(
        { error: 'Un ou plusieurs équipements sélectionnés ne sont plus disponibles. Rafraîchissez la liste et réessayez.' },
        { status: 409 }
      )
    }
    throw err
  }

  const loan = await prisma.loans.findUniqueOrThrow({ where: { id: loanId }, include: LOAN_INCLUDE })
  return NextResponse.json({ data: shapeLoan(loan) })
})
