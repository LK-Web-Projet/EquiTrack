import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import { toDateStr } from '@/lib/api-shape'

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const items = await prisma.loan_items.findMany({
    where: { equipment_id: id },
    select: {
      loan_id: true,
      return_condition: true,
      loans: {
        select: {
          status: true,
          checkout_date: true,
          return_date: true,
          employees: { select: { name: true, departments: { select: { name: true } } } },
        },
      },
    },
    orderBy: { loan_id: 'desc' },
  })

  const data = items.map(item => ({
    loan_id: item.loan_id,
    return_condition: item.return_condition,
    loan: {
      status: item.loans.status,
      checkout_date: toDateStr(item.loans.checkout_date),
      return_date: toDateStr(item.loans.return_date),
      employee: {
        name: item.loans.employees.name,
        department: item.loans.employees.departments ? { name: item.loans.employees.departments.name } : undefined,
      },
    },
  }))

  return NextResponse.json({ data })
})
