import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { shapeEquipment, parseDateOnly } from '@/lib/api-shape'

export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url)
  const category_id = url.searchParams.get('category_id') ?? undefined
  const status = url.searchParams.get('status') ?? undefined

  const equipment = await prisma.equipment.findMany({
    where: { category_id, status },
    include: { categories: true },
    orderBy: [{ category_id: 'asc' }, { sequential_number: 'asc' }],
  })
  return NextResponse.json({ data: equipment.map(shapeEquipment) })
})

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json()
  const equipment = await prisma.equipment.create({
    data: { ...body, acquisition_date: parseDateOnly(body.acquisition_date) ?? null },
    include: { categories: true },
  })
  return NextResponse.json({ data: shapeEquipment(equipment) })
})
