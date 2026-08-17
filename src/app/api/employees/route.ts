import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { shapeEmployee } from '@/lib/api-shape'

export const GET = withAuth(async () => {
  const employees = await prisma.employees.findMany({
    include: { departments: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ data: employees.map(shapeEmployee) })
})

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json()
  const employee = await prisma.employees.create({
    data: body,
    include: { departments: true },
  })
  return NextResponse.json({ data: shapeEmployee(employee) })
})
