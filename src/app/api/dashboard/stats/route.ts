import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const GET = withAuth(async () => {
  const [equipment, activeLoans, overdueLoans] = await Promise.all([
    prisma.equipment.findMany({ select: { status: true, category_id: true } }),
    prisma.loans.count({ where: { status: 'active' } }),
    prisma.loans.count({
      where: { status: 'active', expected_return_date: { lt: new Date() } },
    }),
  ])

  return NextResponse.json({
    data: {
      total: equipment.length,
      available: equipment.filter(e => e.status === 'available').length,
      borrowed: equipment.filter(e => e.status === 'borrowed').length,
      broken: equipment.filter(e => e.status === 'broken').length,
      maintenance: equipment.filter(e => e.status === 'maintenance').length,
      active_loans: activeLoans,
      overdue_loans: overdueLoans,
    },
  })
})
