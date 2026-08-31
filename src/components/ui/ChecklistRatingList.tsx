'use client';

import { PRIORITY_LABELS, CONDITION_LABELS } from '@/lib/constants';
import type { ChecklistItemWithState, EquipmentCondition } from '@/types';

interface Props {
  items: ChecklistItemWithState[];
  values: Record<string, EquipmentCondition>;
  onChange: (checklistItemId: string, state: EquipmentCondition) => void;
}

// Widget de notation de checklist, utilisé à l'identique par le formulaire de maintenance et par
// le formulaire de retour de prêt — c'est ce composant qui garantit concrètement "le même
// processus" côté UI, pas seulement côté serveur.
export default function ChecklistRatingList({ items, values, onChange }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="et-label">Checklist d&apos;inspection</p>
      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-3 p-2 rounded-lg"
          style={{ background: 'var(--et-surface-2)' }}
        >
          <span className="text-sm font-medium flex-1">{item.name}</span>
          <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>{PRIORITY_LABELS[item.priority]}</span>
          <select
            className="et-select"
            style={{ width: 'auto' }}
            value={values[item.id] ?? item.last_state}
            onChange={e => onChange(item.id, e.target.value as EquipmentCondition)}
          >
            <option value="good">{CONDITION_LABELS.good}</option>
            <option value="fair">{CONDITION_LABELS.fair}</option>
            <option value="poor">{CONDITION_LABELS.poor}</option>
          </select>
        </div>
      ))}
    </div>
  );
}
