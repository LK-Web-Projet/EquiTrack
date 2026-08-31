import 'server-only'
import { Prisma } from '@prisma/client'
import { parseDateOnly, parseTimeOnly } from '@/lib/api-shape'
import { applyChecklistResults } from '@/lib/checklist-service'
import { conditionForStatus } from '@/lib/equipment-state'
import type { EquipmentStatus } from '@/types'

export class EquipmentUnavailableError extends Error {}

type ReserveAndCreateLoanData = {
  employee_id?: string | null
  campagne_id?: string | null
  campagne_nom?: string | null
  prestataire_id?: string | null
  prestataire_nom?: string | null
  checkout_date: string
  checkout_time: string
  expected_return_date?: string | null
  checkout_notes?: string | null
  processed_by?: string | null
  equipment_ids: string[]
  source: 'internal' | 'external'
}

// Réserve atomiquement les équipements (ne passe en "borrowed" que ceux encore "available" à cet
// instant précis — annule toute la transaction en cas de conflit plutôt que de double-prêter un
// équipement) puis crée le prêt et ses lignes. Partagé entre les routes internes (/api/loans) et
// les routes d'intégration (/api/integration/loans) pour ne pas dupliquer cette logique.
export async function reserveAndCreateLoan(
  tx: Prisma.TransactionClient,
  data: ReserveAndCreateLoanData
): Promise<string> {
  const {
    employee_id, campagne_id, campagne_nom, prestataire_id, prestataire_nom,
    checkout_date, checkout_time, expected_return_date, checkout_notes, processed_by,
    equipment_ids, source,
  } = data

  const availability = await tx.equipment.updateMany({
    where: { id: { in: equipment_ids }, status: 'available' },
    data: { status: 'borrowed', updated_at: new Date() },
  })
  if (availability.count !== equipment_ids.length) {
    throw new EquipmentUnavailableError()
  }

  const created = await tx.loans.create({
    data: {
      employee_id: employee_id ?? null,
      source,
      campagne_id: campagne_id ?? null,
      campagne_nom: campagne_nom ?? null,
      prestataire_id: prestataire_id ?? null,
      prestataire_nom: prestataire_nom ?? null,
      checkout_date: parseDateOnly(checkout_date)!,
      checkout_time: parseTimeOnly(checkout_time)!,
      expected_return_date: parseDateOnly(expected_return_date) ?? null,
      checkout_notes: checkout_notes || null,
      processed_by: processed_by || null,
      status: 'active',
    },
  })
  await tx.loan_items.createMany({
    data: equipment_ids.map((equipment_id) => ({ loan_id: created.id, equipment_id })),
  })
  return created.id
}

type ProcessReturnData = {
  return_date: string
  return_time: string
  return_notes?: string | null
  items: Array<{
    equipment_id: string
    return_condition: 'good' | 'broken' | 'damaged'
    return_notes?: string | null
    checklist?: Array<{ checklist_item_id: string; state: 'good' | 'fair' | 'poor' }>
  }>
}

// Marque le prêt comme retourné et met à jour le statut de chaque équipement en fonction de son
// état de retour. Partagé entre /api/loans/[id]/return et /api/integration/loans/[id]/return.
export async function processReturn(
  tx: Prisma.TransactionClient,
  loanId: string,
  data: ProcessReturnData
): Promise<void> {
  const { return_date, return_time, return_notes, items } = data

  await tx.loans.update({
    where: { id: loanId },
    data: {
      status: 'returned',
      return_date: parseDateOnly(return_date)!,
      return_time: parseTimeOnly(return_time)!,
      return_notes: return_notes || null,
    },
  })

  for (const item of items) {
    const updatedItem = await tx.loan_items.update({
      where: { loan_id_equipment_id: { loan_id: loanId, equipment_id: item.equipment_id } },
      data: { return_condition: item.return_condition, return_notes: item.return_notes || null },
    })

    // 'broken' → équipement hors service. 'damaged' → dégradé mais pas hors service : part en
    // maintenance plutôt que "disponible" (sinon condition='good' forcé par défaut ci-dessous
    // contredirait le constat de dégradation — même incohérence que status/condition évitée partout
    // ailleurs). 'good' → disponible.
    let status: EquipmentStatus =
      item.return_condition === 'broken' ? 'broken' :
      item.return_condition === 'damaged' ? 'maintenance' :
      'available'
    let condition = conditionForStatus(status)

    if (item.checklist?.length) {
      const rawCondition = await applyChecklistResults(tx, { equipment_id: item.equipment_id, loan_item_id: updatedItem.id, ratings: item.checklist })
      if (rawCondition) {
        if (status === 'available' && rawCondition !== 'good') {
          // Le dropdown dit "bon état" mais la checklist a trouvé un défaut : la checklist l'emporte.
          status = 'maintenance'
        }
        condition = conditionForStatus(status, rawCondition)
      }
    }

    await tx.equipment.update({
      where: { id: item.equipment_id },
      data: { status, condition, updated_at: new Date() },
    })
  }
}
