import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { shapeLoan, parseDateOnly, parseTimeOnly } from '@/lib/api-shape'

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
  const body = await req.json()
  const {
    employee_id, checkout_date, checkout_time, expected_return_date,
    checkout_notes, processed_by, equipment_ids,
  } = body

  if (!Array.isArray(equipment_ids) || equipment_ids.length === 0) {
    return NextResponse.json({ error: 'Aucun équipement sélectionné' }, { status: 400 })
  }

  const loanId = await prisma.$transaction(async (tx) => {
    const created = await tx.loans.create({
      data: {
        employee_id,
        checkout_date: parseDateOnly(checkout_date)!,
        checkout_time: parseTimeOnly(checkout_time)!,
        expected_return_date: parseDateOnly(expected_return_date) ?? null,
        checkout_notes: checkout_notes || null,
        processed_by: processed_by || null,
        status: 'active',
      },
    })
    await tx.loan_items.createMany({
      data: equipment_ids.map((equipment_id: string) => ({ loan_id: created.id, equipment_id })),
    })
    await tx.equipment.updateMany({
      where: { id: { in: equipment_ids } },
      data: { status: 'borrowed', updated_at: new Date() },
    })
    return created.id
  })

  const loan = await prisma.loans.findUniqueOrThrow({ where: { id: loanId }, include: LOAN_INCLUDE })
  return NextResponse.json({ data: shapeLoan(loan) })
})
