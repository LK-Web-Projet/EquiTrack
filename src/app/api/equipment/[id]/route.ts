import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { shapeEquipment, parseDateOnly } from '@/lib/api-shape'
import { equipmentUpdateSchema, validateBody } from '@/lib/validation'

export const GET = withAuth<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  const equipment = await prisma.equipment.findUniqueOrThrow({
    where: { id },
    include: { categories: true },
  })
  return NextResponse.json({ data: shapeEquipment(equipment) })
})

export const PATCH = withAdmin<{ id: string }>(async (req: NextRequest, { params }) => {
  const { id } = await params
  const { data: body, error } = validateBody(equipmentUpdateSchema, await req.json())
  if (error) return error

  const equipment = await prisma.equipment.update({
    where: { id },
    data: { ...body, acquisition_date: parseDateOnly(body.acquisition_date), updated_at: new Date() },
    include: { categories: true },
  })
  return NextResponse.json({ data: shapeEquipment(equipment) })
})

export const DELETE = withAdmin<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.equipment.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
