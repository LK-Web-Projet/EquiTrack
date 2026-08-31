import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

type Priority = 'low' | 'normal' | 'critical'
type Condition = 'good' | 'fair' | 'poor'

const RANK: Record<Condition, number> = { good: 0, fair: 1, poor: 2 }

// Plancher (minimum) que déclenche chaque priorité selon l'état constaté sur la pièce.
// Ex: une pièce "critical" notée "poor" force l'équipement à "poor" au minimum.
const FLOOR: Record<Priority, Partial<Record<Condition, Condition>>> = {
  critical: { poor: 'poor', fair: 'fair' },
  normal: { poor: 'fair' },
  low: {},
}

export function computeConditionFromChecklist(
  ratings: Array<{ checklist_item_id: string; state: Condition }>,
  priorityById: Map<string, Priority>
): Condition {
  let worst: Condition = 'good'
  for (const r of ratings) {
    const floor = FLOOR[priorityById.get(r.checklist_item_id) ?? 'low'][r.state]
    if (floor && RANK[floor] > RANK[worst]) worst = floor
  }
  return worst
}

type ApplyChecklistResultsData = {
  equipment_id: string
  ratings: Array<{ checklist_item_id: string; state: Condition }>
} & ({ maintenance_id: string; loan_item_id?: never } | { loan_item_id: string; maintenance_id?: never })

// Enregistre les notes de checklist pour UN événement (maintenance ou retour de prêt) et renvoie
// l'état recalculé à partir de CE checklist (recalcul complet, pas un plancher cumulatif sur
// l'ancienne valeur — sinon un équipement réparé resterait bloqué à "poor" pour toujours).
// N'écrit PAS equipment.condition ici : c'est l'appelant qui réconcilie ce résultat avec le statut
// de l'équipement (voir src/lib/equipment-state.ts) avant d'écrire, pour ne jamais transiter par une
// combinaison statut/état incohérente que la contrainte en base rejetterait. Renvoie `null` si
// `ratings` est vide (catégorie sans checklist configuré) : rien à faire, 100% rétrocompatible.
// Partagé entre POST /api/maintenances et processReturn (src/lib/loan-service.ts).
export async function applyChecklistResults(
  tx: Prisma.TransactionClient,
  data: ApplyChecklistResultsData
): Promise<Condition | null> {
  if (data.ratings.length === 0) return null

  const equipment = await tx.equipment.findUniqueOrThrow({
    where: { id: data.equipment_id },
    select: { category_id: true },
  })

  const items = await tx.checklist_items.findMany({
    where: { id: { in: data.ratings.map((r) => r.checklist_item_id) }, category_id: equipment.category_id, active: true },
    select: { id: true, priority: true },
  })
  const priorityById = new Map(items.map((i) => [i.id, i.priority as Priority]))

  // Ignore les notes pour des items inexistants / d'une autre catégorie / désactivés — défense en
  // profondeur, l'UI ne devrait jamais en envoyer.
  const validRatings = data.ratings.filter((r) => priorityById.has(r.checklist_item_id))
  if (validRatings.length === 0) return null

  await tx.checklist_results.createMany({
    data: validRatings.map((r) => ({
      checklist_item_id: r.checklist_item_id,
      equipment_id: data.equipment_id,
      state: r.state,
      maintenance_id: data.maintenance_id ?? null,
      loan_item_id: data.loan_item_id ?? null,
    })),
  })

  return computeConditionFromChecklist(validRatings, priorityById)
}

// Items actifs de la catégorie de l'équipement + dernier état connu par item (préremplissage du
// formulaire de maintenance/retour). Utilisé par GET /api/equipment/[id]/checklist.
export async function getEquipmentChecklistState(equipmentId: string) {
  const equipment = await prisma.equipment.findUniqueOrThrow({
    where: { id: equipmentId },
    select: { category_id: true },
  })

  const items = await prisma.checklist_items.findMany({
    where: { category_id: equipment.category_id, active: true },
    orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
  })
  if (items.length === 0) return []

  const lastResults = await prisma.checklist_results.findMany({
    where: { equipment_id: equipmentId, checklist_item_id: { in: items.map((i) => i.id) } },
    orderBy: { created_at: 'desc' },
    distinct: ['checklist_item_id'],
  })
  const lastStateById = new Map(lastResults.map((r) => [r.checklist_item_id, r.state as Condition]))

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    priority: item.priority as Priority,
    order: item.order,
    last_state: lastStateById.get(item.id) ?? ('good' as Condition),
  }))
}
