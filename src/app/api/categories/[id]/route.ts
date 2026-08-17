import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'

export const PATCH = withAdmin<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const body = await req.json()
  const data = await prisma.categories.update({ where: { id }, data: body })
  return NextResponse.json({ data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.categories.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
