import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'

export const PATCH = withAdmin<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const data = await prisma.incidents.update({ where: { id }, data: { resolved_at: new Date() } })
  return NextResponse.json({ data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.incidents.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
