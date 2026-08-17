import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { shapeLoan, parseDateOnly, parseTimeOnly } from '@/lib/api-shape'

const LOAN_INCLUDE = {
  employees: { include: { departments: true } },
  loan_items: { include: { equipment: { include: { categories: true } } } },
} as const

interface ReturnItem {
  equipment_id: string
  return_condition: 'good' | 'broken' | 'damaged'
  return_notes?: string
}

export const POST = withAuth<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const { return_date, return_time, return_notes, items } = await req.json() as {
    return_date: string
    return_time: string
    return_notes?: string
    items: ReturnItem[]
  }

  await prisma.$transaction(async (tx) => {
    await tx.loans.update({
      where: { id },
      data: {
        status: 'returned',
        return_date: parseDateOnly(return_date)!,
        return_time: parseTimeOnly(return_time)!,
        return_notes: return_notes || null,
      },
    })

    for (const item of items) {
      await tx.loan_items.update({
        where: { loan_id_equipment_id: { loan_id: id, equipment_id: item.equipment_id } },
        data: { return_condition: item.return_condition, return_notes: item.return_notes || null },
      })
      // Comportement préservé tel quel : 'damaged' résout aussi en 'available' (seul 'broken' est spécial).
      const newStatus = item.return_condition === 'broken' ? 'broken' : 'available'
      await tx.equipment.update({
        where: { id: item.equipment_id },
        data: { status: newStatus, updated_at: new Date() },
      })
    }
  })

  const loan = await prisma.loans.findUniqueOrThrow({ where: { id }, include: LOAN_INCLUDE })
  return NextResponse.json({ data: shapeLoan(loan) })
})
