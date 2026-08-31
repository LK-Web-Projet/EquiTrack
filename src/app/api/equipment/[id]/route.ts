import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdmin } from '@/lib/api-auth'
import { shapeEquipment, parseDateOnly } from '@/lib/api-shape'
import { equipmentUpdateSchema, validateBody } from '@/lib/validation'
import { conditionForStatus } from '@/lib/equipment-state'
import type { EquipmentStatus } from '@/types'

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

  const data: typeof body = { ...body }
  if (body.status) {
    // Le statut change explicitement : l'état suit automatiquement (jamais "bon" en panne/maintenance,
    // toujours "bon" disponible/emprunté) plutôt que d'exiger une double saisie.
    data.condition = conditionForStatus(body.status, body.condition)
  } else if (body.condition) {
    // Seul l'état change : doit rester cohérent avec le statut actuel, sinon la contrainte en base
    // rejetterait la mise à jour avec une erreur peu explicite — on renvoie un message clair à la place.
    const current = await prisma.equipment.findUniqueOrThrow({ where: { id }, select: { status: true } })
    const reconciled = conditionForStatus(current.status as EquipmentStatus, body.condition)
    if (reconciled !== body.condition) {
      return NextResponse.json(
        { error: `Incohérent : un équipement au statut "${current.status}" ne peut pas être en état "${body.condition}". Changez d'abord son statut.` },
        { status: 400 }
      )
    }
  }

  const equipment = await prisma.equipment.update({
    where: { id },
    data: { ...data, acquisition_date: parseDateOnly(data.acquisition_date), updated_at: new Date() },
    include: { categories: true },
  })
  return NextResponse.json({ data: shapeEquipment(equipment) })
})

export const DELETE = withAdmin<{ id: string }>(async (_req: NextRequest, { params }) => {
  const { id } = await params
  await prisma.equipment.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
