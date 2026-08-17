import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { shapeLoan, parseDateOnly, parseTimeOnly } from '@/lib/api-shape'
import { loanCreateSchema, validateBody } from '@/lib/validation'

class EquipmentUnavailableError extends Error {}

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
    loanId = await prisma.$transaction(async (tx) => {
      // Réserve atomiquement les équipements : ne passe en "borrowed" que
      // ceux encore "available" à cet instant précis. Si le compte ne
      // correspond pas, un autre prêt vient de prendre l'un d'eux entre le
      // moment où le client a chargé la liste et cette requête — on annule
      // toute la transaction plutôt que de double-prêter un équipement.
      const availability = await tx.equipment.updateMany({
        where: { id: { in: equipment_ids }, status: 'available' },
        data: { status: 'borrowed', updated_at: new Date() },
      })
      if (availability.count !== equipment_ids.length) {
        throw new EquipmentUnavailableError()
      }

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
      return created.id
    })
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
