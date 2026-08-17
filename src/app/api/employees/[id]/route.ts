import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { shapeEmployee } from '@/lib/api-shape'

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const employee = await prisma.employees.findUniqueOrThrow({
    where: { id },
    include: { departments: true },
  })
  return NextResponse.json({ data: shapeEmployee(employee) })
})

export const PATCH = withAdmin<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const body = await req.json()
  const employee = await prisma.employees.update({
    where: { id },
    data: body,
    include: { departments: true },
  })
  return NextResponse.json({ data: shapeEmployee(employee) })
})

export const DELETE = withAdmin<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.employees.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
