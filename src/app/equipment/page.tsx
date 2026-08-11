'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Package, Eye, RefreshCw } from 'lucide-react';
import { getEquipment, getCategories, updateEquipment } from '@/lib/supabase';
import type { Equipment, Category, EquipmentStatus } from '@/types';

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: 'Disponible',
  borrowed: 'Emprunté',
  broken: 'En panne',
  maintenance: 'En maintenance',
};

const STATUS_BADGE: Record<EquipmentStatus, string> = {
  available: 'badge badge-available',
  borrowed: 'badge badge-borrowed',
  broken: 'badge badge-broken',
  maintenance: 'badge badge-maintenance',
};

const CONDITION_LABELS = { good: 'Bon état', fair: 'Correct', poor: 'Mauvais état' };
const CONDITION_BADGE = { good: 'badge badge-good', fair: 'badge badge-fair', poor: 'badge badge-poor' };

export default function EquipmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(searchParams.get('category') ?? 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'all');
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [equip, cats] = await Promise.all([getEquipment(), getCategories()]);
      setEquipment(equip);
      setCategories(cats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = equipment.filter(eq => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      eq.display_number.toLowerCase().includes(q) ||
      eq.serial_number?.toLowerCase().includes(q) ||
      eq.category?.name.toLowerCase().includes(q) ||
      eq.location?.toLowerCase().includes(q);
    const matchCat = catFilter === 'all' || eq.category_id === catFilter;
    const matchStatus = statusFilter === 'all' || eq.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const handleStatusChange = async (eq: Equipment, newStatus: EquipmentStatus) => {
    setChangingStatus(eq.id);
    try {
      const updated = await updateEquipment(eq.id, { status: newStatus });
      setEquipment(prev => prev.map(e => e.id === eq.id ? updated : e));
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setChangingStatus(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
          <p style={{ color: 'var(--et-text-muted)', fontSize: '0.875rem' }}>Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Équipements</h1>
          <p className="page-subtitle">{equipment.length} équipement{equipment.length !== 1 ? 's' : ''} au total</p>
        </div>
        <Link href="/equipment/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Ajouter un équipement
        </Link>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-4">
        {/* Filters */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2" style={{ background: 'var(--et-surface-2)', border: '1.5px solid var(--et-border)', borderRadius: 'var(--et-radius)', padding: '0.5rem 0.875rem' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--et-text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par numéro, série, catégorie…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--et-text)' }}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <select className="et-select w-full sm:w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="all">Toutes les catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select className="et-select w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="available">Disponible</option>
              <option value="borrowed">Emprunté</option>
              <option value="broken">En panne</option>
              <option value="maintenance">En maintenance</option>
            </select>
            <span className="text-sm sm:ml-auto" style={{ color: 'var(--et-text-muted)' }}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <p className="empty-state-title">Aucun équipement trouvé</p>
              <p className="empty-state-desc">Modifiez vos filtres ou ajoutez un nouvel équipement.</p>
              <Link href="/equipment/new" className="btn btn-primary btn-sm mt-2">
                <Plus className="w-3.5 h-3.5" /> Ajouter un équipement
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Numéro</th>
                    <th>Catégorie</th>
                    <th className="hidden lg:table-cell">N° de série</th>
                    <th>Statut</th>
                    <th className="hidden sm:table-cell">État</th>
                    <th className="hidden lg:table-cell">Localisation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(eq => (
                    <tr key={eq.id}>
                      <td>
                        <span
                          className="eq-number cursor-pointer hover:opacity-70"
                          onClick={() => router.push(`/equipment/${eq.id}`)}
                        >
                          {eq.category?.code}-{eq.display_number}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span>{eq.category?.icon}</span>
                          <span className="text-sm" style={{ color: 'var(--et-text-secondary)' }}>{eq.category?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell" style={{ color: 'var(--et-text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {eq.serial_number || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td>
                        <span className={STATUS_BADGE[eq.status]}>{STATUS_LABELS[eq.status]}</span>
                      </td>
                      <td className="hidden sm:table-cell">
                        <span className={CONDITION_BADGE[eq.condition]}>{CONDITION_LABELS[eq.condition]}</span>
                      </td>
                      <td className="hidden lg:table-cell" style={{ color: 'var(--et-text-muted)' }}>
                        {eq.location || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link href={`/equipment/${eq.id}`} className="btn btn-ghost btn-sm btn-icon" title="Voir">
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <div className="relative">
                            {changingStatus === eq.id ? (
                              <div className="btn btn-ghost btn-sm btn-icon">
                                <div className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} />
                              </div>
                            ) : (
                              <select
                                className="btn btn-ghost btn-sm"
                                style={{ cursor: 'pointer', paddingLeft: '0.5rem', paddingRight: '0.5rem' }}
                                value={eq.status}
                                onChange={e => handleStatusChange(eq, e.target.value as EquipmentStatus)}
                                title="Changer le statut"
                                onClick={e => e.stopPropagation()}
                              >
                                <option value="available">→ Disponible</option>
                                <option value="borrowed">→ Emprunté</option>
                                <option value="broken">→ En panne</option>
                                <option value="maintenance">→ Maintenance</option>
                              </select>
                            )}
                          </div>
                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Rafraîchir"
                            onClick={() => load()}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
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
      </div>
    </div>
  );
}
