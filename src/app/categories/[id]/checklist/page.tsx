'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, ListChecks, ChevronUp, ChevronDown, RotateCcw, Trash2 } from 'lucide-react';
import {
  getCategories, getCategoryChecklist, createChecklistItem,
  updateChecklistItem, deactivateChecklistItem,
} from '@/lib/api';
import { useRequireAdmin } from '@/lib/auth-context';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { PRIORITY_LABELS } from '@/lib/constants';
import type { Category, ChecklistItem, ChecklistPriority } from '@/types';

const PRIORITY_BADGE: Record<ChecklistPriority, string> = {
  low: 'badge badge-neutral',
  normal: 'badge badge-borrowed',
  critical: 'badge badge-broken',
};

export default function CategoryChecklistPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const toast = useToast();

  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [priority, setPriority] = useState<ChecklistPriority>('normal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showInactive, setShowInactive] = useState(false);
  const [toDeactivate, setToDeactivate] = useState<ChecklistItem | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cats, checklist] = await Promise.all([getCategories(), getCategoryChecklist(id)]);
      const cat = cats.find(c => c.id === id);
      if (!cat) { router.push('/categories'); return; }
      setCategory(cat);
      setItems(checklist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const active = items.filter(i => i.active).sort((a, b) => a.order - b.order);
  const inactive = items.filter(i => !i.active);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Le nom est requis.'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await createChecklistItem(id, { name: name.trim(), priority });
      setItems(prev => [...prev, created]);
      setName('');
      setPriority('normal');
    } catch (e: unknown) {
      setError('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (item: ChecklistItem, direction: -1 | 1) => {
    const idx = active.findIndex(i => i.id === item.id);
    const swapWith = active[idx + direction];
    if (!swapWith) return;
    try {
      const [a, b] = await Promise.all([
        updateChecklistItem(id, item.id, { order: swapWith.order }),
        updateChecklistItem(id, swapWith.id, { order: item.order }),
      ]);
      setItems(prev => prev.map(i => (i.id === a.id ? a : i.id === b.id ? b : i)));
    } catch (e: unknown) {
      toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleDeactivate = async () => {
    if (!toDeactivate) return;
    try {
      const updated = await deactivateChecklistItem(id, toDeactivate.id);
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
      setToDeactivate(null);
    } catch (e: unknown) {
      toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleReactivate = async (item: ChecklistItem) => {
    try {
      const updated = await updateChecklistItem(id, item.id, { active: true });
      setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));
    } catch (e: unknown) {
      toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  if (adminLoading || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="fade-in">
      <div className="page-header flex items-center gap-3">
        <Link href={`/categories/${id}`} className="btn btn-ghost btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Checklist — {category.icon} {category.name}</h1>
          <p className="page-subtitle">Pièces à inspecter lors d&apos;une maintenance ou d&apos;un retour de prêt.</p>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-4">
        <form onSubmit={handleCreate} className="card p-5 space-y-3">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
            <div>
              <label className="et-label">Nom de la pièce</label>
              <input
                type="text"
                className="et-input"
                placeholder="Ex: Freins, Chaîne, Cadre…"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="et-label">Priorité</label>
              <select
                className="et-select"
                value={priority}
                onChange={e => setPriority(e.target.value as ChecklistPriority)}
              >
                <option value="low">{PRIORITY_LABELS.low}</option>
                <option value="normal">{PRIORITY_LABELS.normal}</option>
                <option value="critical">{PRIORITY_LABELS.critical}</option>
              </select>
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Plus className="w-4 h-4" />}
                Ajouter
              </button>
            </div>
          </div>
          <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>
            Une pièce <strong>Critique</strong> notée &quot;Mauvais état&quot; force l&apos;équipement à &quot;Mauvais état&quot; ; une pièce <strong>Normale</strong> le force au maximum à &quot;Correct&quot; ; une pièce <strong>Faible</strong> n&apos;impacte jamais l&apos;état général.
          </p>
        </form>

        <div className="card">
          {active.length === 0 ? (
            <div className="empty-state">
              <ListChecks className="empty-state-icon" />
              <p className="empty-state-title">Aucune pièce configurée</p>
              <p className="empty-state-desc">Ajoutez les pièces à vérifier pour cette catégorie ci-dessus.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Priorité</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((item, idx) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td><span className={PRIORITY_BADGE[item.priority]}>{PRIORITY_LABELS[item.priority]}</span></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMove(item, -1)}
                            disabled={idx === 0}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Monter"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(item, 1)}
                            disabled={idx === active.length - 1}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Descendre"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setToDeactivate(item)}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Désactiver"
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--et-danger)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {inactive.length > 0 && (
          <div className="card">
            <button
              onClick={() => setShowInactive(v => !v)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <p className="section-label mb-0">Pièces désactivées ({inactive.length})</p>
              {showInactive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showInactive && (
              <div className="overflow-x-auto" style={{ borderTop: '1px solid var(--et-border)' }}>
                <table className="et-table">
                  <tbody>
                    {inactive.map(item => (
                      <tr key={item.id}>
                        <td style={{ color: 'var(--et-text-muted)' }}>{item.name}</td>
                        <td><span className={PRIORITY_BADGE[item.priority]}>{PRIORITY_LABELS[item.priority]}</span></td>
                        <td>
                          <button
                            onClick={() => handleReactivate(item)}
                            className="btn btn-ghost btn-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Réactiver
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!toDeactivate}
        title="Désactiver cette pièce ?"
        message={`"${toDeactivate?.name}" n'apparaîtra plus dans les nouveaux formulaires de maintenance/retour. L'historique des vérifications déjà enregistrées est conservé.`}
        confirmLabel="Désactiver"
        variant="danger"
        onConfirm={handleDeactivate}
        onCancel={() => setToDeactivate(null)}
      />
    </div>
  );
}
