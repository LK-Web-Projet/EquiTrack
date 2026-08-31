import type { EquipmentCondition, ChecklistPriority } from '@/types'

export const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  good: 'Bon état',
  fair: 'Correct',
  poor: 'Mauvais état',
}

export const CONDITION_BADGE: Record<EquipmentCondition, string> = {
  good: 'badge badge-good',
  fair: 'badge badge-fair',
  poor: 'badge badge-poor',
}

export const PRIORITY_LABELS: Record<ChecklistPriority, string> = {
  low: 'Faible',
  normal: 'Normale',
  critical: 'Critique',
}
