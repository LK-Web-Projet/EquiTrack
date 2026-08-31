import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdmin } from '@/lib/api-auth'
import { checklistItemUpdateSchema, validateBody } from '@/lib/validation'

export const PATCH = withAdmin<{ id: string; itemId: string }>(async (req: NextRequest, { params }) => {
  const { id, itemId } = await params
  const { data: body, error } = validateBody(checklistItemUpdateSchema, await req.json())
  if (error) return error

  // Vérifie que l'item appartient bien à cette catégorie avant de le modifier — un id valide mais
  // d'une autre catégorie doit renvoyer 404, pas modifier silencieusement une ressource inattendue.
  await prisma.checklist_items.findFirstOrThrow({ where: { id: itemId, category_id: id } })

  const data = await prisma.checklist_items.update({ where: { id: itemId }, data: body })
  return NextResponse.json({ data })
})

// Soft-delete uniquement : jamais de suppression physique, pour ne jamais invalider un
// checklist_results déjà enregistré qui référence cet item.
export const DELETE = withAdmin<{ id: string; itemId: string }>(async (_req: NextRequest, { params }) => {
  const { id, itemId } = await params
  await prisma.checklist_items.findFirstOrThrow({ where: { id: itemId, category_id: id } })

  const data = await prisma.checklist_items.update({ where: { id: itemId }, data: { active: false } })
  return NextResponse.json({ data })
})
