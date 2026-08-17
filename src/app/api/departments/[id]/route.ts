import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'
import { departmentUpdateSchema, validateBody } from '@/lib/validation'

export const PATCH = withAdmin<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const { data: body, error } = validateBody(departmentUpdateSchema, await req.json())
  if (error) return error

  const data = await prisma.departments.update({ where: { id }, data: body })
  return NextResponse.json({ data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.departments.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
