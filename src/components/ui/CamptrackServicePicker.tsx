'use client';

import { useEffect, useState } from 'react';
import { getCamptrackServices, type CamptrackService } from '@/lib/api';

interface Props {
  selectedIds: string[];
  onChange: (ids: string[], names: string[]) => void;
}

// Sélecteur (cases à cocher) des services CampTrack auxquels une catégorie est restreinte —
// la liste vient en direct de CampTrack (via le proxy /api/camptrack/services), pas d'une saisie
// manuelle, pour éviter les fautes de frappe / renommages qui cassent la restriction en silence.
export function CamptrackServicePicker({ selectedIds, onChange }: Props) {
  const [services, setServices] = useState<CamptrackService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCamptrackServices()
      .then(setServices)
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (svc: CamptrackService) => {
    const isSelected = selectedIds.includes(svc.id_service);
    const nextIds = isSelected
      ? selectedIds.filter(id => id !== svc.id_service)
      : [...selectedIds, svc.id_service];
    const nextNames = services.filter(s => nextIds.includes(s.id_service)).map(s => s.nom);
    onChange(nextIds, nextNames);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--et-text-muted)' }}>
        <div className="spinner" style={{ width: '1rem', height: '1rem' }} />
        Chargement des services CampTrack…
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-warning text-sm">
        Impossible de charger les services CampTrack ({error}). Vous pouvez enregistrer la catégorie sans restriction et réessayer plus tard.
      </div>
    );
  }

  if (services.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--et-text-muted)' }}>Aucun service trouvé côté CampTrack.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map(svc => {
        const checked = selectedIds.includes(svc.id_service);
        return (
          <label
            key={svc.id_service}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-sm"
            style={{
              border: `1.5px solid ${checked ? 'var(--et-primary)' : 'var(--et-border)'}`,
              background: checked ? 'var(--et-primary-light)' : 'var(--et-surface)',
              color: checked ? 'var(--et-primary-text)' : 'var(--et-text-secondary)',
            }}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(svc)}
              style={{ accentColor: 'var(--et-primary)' }}
            />
            {svc.nom}
          </label>
        );
      })}
    </div>
  );
}
