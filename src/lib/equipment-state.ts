import type { EquipmentStatus, EquipmentCondition } from '@/types'

// Seule contrainte réelle : un équipement en panne ou en maintenance ne peut jamais être en "bon
// état" (minimum "correct"). Disponible/emprunté n'impose RIEN sur l'état — du matériel disponible
// peut très bien être en état correct ou mauvais (juste pas encore mis de côté pour réparation).
// Reflète la contrainte CHECK posée en base (migration equipment_status_condition_check, corrigée
// par 20260827150000_fix_equipment_status_condition).
//
// Renvoie `undefined` quand il n'y a rien à forcer (disponible/emprunté sans état désiré fourni) :
// à utiliser tel quel dans un `data` Prisma, où `undefined` signifie "ne pas toucher ce champ".
export function conditionForStatus(
  status: EquipmentStatus,
  desiredCondition?: EquipmentCondition
): EquipmentCondition | undefined {
  if (status === 'broken' || status === 'maintenance') {
    return desiredCondition && desiredCondition !== 'good' ? desiredCondition : 'fair'
  }
  return desiredCondition
}
