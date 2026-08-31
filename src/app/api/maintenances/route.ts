import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { shapeMaintenance, parseDateOnly } from '@/lib/api-shape'
import { maintenanceCreateSchema, validateBody } from '@/lib/validation'
import { applyChecklistResults } from '@/lib/checklist-service'
import { conditionForStatus } from '@/lib/equipment-state'
import type { EquipmentStatus } from '@/types'

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
  const { checklist, ...maintenanceData } = body

  const m = await prisma.$transaction(async (tx) => {
    const created = await tx.maintenances.create({
      data: { ...maintenanceData, performed_at: parseDateOnly(maintenanceData.performed_at)! },
    })
    if (checklist?.length) {
      const rawCondition = await applyChecklistResults(tx, { equipment_id: created.equipment_id, maintenance_id: created.id, ratings: checklist })
      if (rawCondition) {
        const equipment = await tx.equipment.findUniqueOrThrow({ where: { id: created.equipment_id }, select: { status: true } })
        let status = equipment.status as EquipmentStatus
        if ((status === 'available' || status === 'borrowed') && rawCondition !== 'good') {
          // La checklist constate un défaut : on ne peut pas laisser l'équipement marqué disponible.
          status = 'maintenance'
        }
        await tx.equipment.update({
          where: { id: created.equipment_id },
          data: { status, condition: conditionForStatus(status, rawCondition), updated_at: new Date() },
        })
      }
    }
    return created
  })
  return NextResponse.json({ data: shapeMaintenance(m) })
})
