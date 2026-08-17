import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { shapeMaintenance, parseDateOnly } from '@/lib/api-shape'
import { maintenanceCreateSchema, validateBody } from '@/lib/validation'

export const GET = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url)
  const equipment_id = url.searchParams.get('equipment_id')
  if (!equipment_id) {
    return NextResponse.json({ error: 'equipment_id requis' }, { status: 400 })
  }

  const data = await prisma.maintenances.findMany({
    where: { equipment_id },
    orderBy: { performed_at: 'desc' },
  })
  return NextResponse.json({ data: data.map(shapeMaintenance) })
})

export const POST = withAdmin(async (req: NextRequest) => {
  const { data: body, error } = validateBody(maintenanceCreateSchema, await req.json())
  if (error) return error

  const m = await prisma.maintenances.create({
    data: { ...body, performed_at: parseDateOnly(body.performed_at)! },
  })
  return NextResponse.json({ data: shapeMaintenance(m) })
})
