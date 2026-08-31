import type { EquipmentStatus, EquipmentCondition } from '@/types'

// Un équipement disponible ou emprunté est forcément en "bon état" ; un équipement en panne ou en
// maintenance ne peut jamais être en "bon état" (minimum "correct"). Reflète la contrainte CHECK
// posée en base (migration 20260827140000_equipment_status_condition_check) — condition suit
// automatiquement le statut plutôt que d'exiger une double saisie à chaque changement.
export function conditionForStatus(
  status: EquipmentStatus,
  desiredCondition?: EquipmentCondition
): EquipmentCondition {
  if (status === 'available' || status === 'borrowed') return 'good'
  return desiredCondition && desiredCondition !== 'good' ? desiredCondition : 'fair'
}
