import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { checklistItemCreateSchema, validateBody } from '@/lib/validation'

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const data = await prisma.checklist_items.findMany({
    where: { category_id: id },
    orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
  })
  return NextResponse.json({ data })
})

export const POST = withAdmin<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const { data: body, error } = validateBody(checklistItemCreateSchema, await req.json())
  if (error) return error

  let order = body.order
  if (order === undefined) {
    const last = await prisma.checklist_items.findFirst({
      where: { category_id: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    order = (last?.order ?? -1) + 1
  }

  const data = await prisma.checklist_items.create({
    data: { category_id: id, name: body.name, priority: body.priority, order },
  })
  return NextResponse.json({ data })
})
