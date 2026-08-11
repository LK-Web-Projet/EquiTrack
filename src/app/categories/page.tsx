'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Layers, Package } from 'lucide-react';
import { getCategories, deleteCategory } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useRequireAdmin } from '@/lib/auth-context';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Category } from '@/types';

interface CatStats {
  total: number;
  available: number;
  borrowed: number;
  broken: number;
  maintenance: number;
}

export default function CategoriesPage() {
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<Record<string, CatStats>>({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const cats = await getCategories();
      setCategories(cats);
      const { data } = await supabase.from('equipment').select('category_id, status');
      if (data) {
        const m: Record<string, CatStats> = {};
        for (const row of data) {
          if (!m[row.category_id]) m[row.category_id] = { total: 0, available: 0, borrowed: 0, broken: 0, maintenance: 0 };
          m[row.category_id].total++;
          if (row.status === 'available') m[row.category_id].available++;
          if (row.status === 'borrowed') m[row.category_id].borrowed++;
          if (row.status === 'broken') m[row.category_id].broken++;
          if (row.status === 'maintenance') m[row.category_id].maintenance++;
        }
        setStats(m);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(toDelete.id);
    setDeleteError('');
    try {
      await deleteCategory(toDelete.id);
      setCategories(prev => prev.filter(c => c.id !== toDelete.id));
      setToDelete(null);
    } catch (e: unknown) {
      setDeleteError('Erreur lors de la suppression : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDeleting(null);
    }
  };

  if (adminLoading || !isAdmin || loading) {
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
          <h1 className="page-title">Catégories</h1>
          <p className="page-subtitle">{categories.length} catégorie{categories.length !== 1 ? 's' : ''} configurée{categories.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/categories/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nouvelle catégorie
        </Link>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-4">
        {deleteError && <div className="alert alert-danger">{deleteError}</div>}
        {categories.length === 0 ? (
          <div className="card p-5">
            <div className="empty-state">
              <Layers className="empty-state-icon" />
              <p className="empty-state-title">Aucune catégorie</p>
              <p className="empty-state-desc">Créez votre première catégorie pour commencer à gérer vos équipements.</p>
              <Link href="/categories/new" className="btn btn-primary btn-sm mt-2">
                <Plus className="w-3.5 h-3.5" /> Créer une catégorie
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map(cat => {
              const s = stats[cat.id] ?? { total: 0, available: 0, borrowed: 0, broken: 0, maintenance: 0 };
              const pct = s.total > 0 ? Math.round((s.available / s.total) * 100) : 0;
              return (
                <div key={cat.id} className="card p-5 flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl shrink-0"
                      style={{ background: cat.color + '18', border: `1.5px solid ${cat.color}30` }}
                    >
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/categories/${cat.id}`} className="font-semibold text-sm hover:underline" style={{ color: 'var(--et-text)' }}>
                          {cat.name}
                        </Link>
                        <span className="eq-number">{cat.code}</span>
                        <span
                          className="w-3 h-3 rounded-full inline-block shrink-0"
                          style={{ background: cat.color }}
                          title={cat.color}
                        />
                      </div>
                      {cat.description && (
                        <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--et-text-muted)' }}>
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Total', value: s.total, color: 'var(--et-text-secondary)' },
                      { label: 'Dispo', value: s.available, color: 'var(--et-success)' },
                      { label: 'Emprunté', value: s.borrowed, color: 'var(--et-primary)' },
                      { label: 'Panne', value: s.broken, color: 'var(--et-danger)' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-lg py-2 px-1" style={{ background: 'var(--et-surface-2)' }}>
                        <p className="text-lg font-bold leading-none" style={{ color }}>{value}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress */}
                  {s.total > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>Disponibilité</span>
                        <span className="text-xs font-semibold" style={{ color: pct > 60 ? 'var(--et-success)' : pct > 30 ? 'var(--et-warning)' : 'var(--et-danger)' }}>
                          {pct}%
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: pct > 60 ? 'var(--et-success)' : pct > 30 ? 'var(--et-warning)' : 'var(--et-danger)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link href={`/categories/${cat.id}`} className="btn btn-ghost btn-sm flex-1 justify-center">
                      <Package className="w-3.5 h-3.5" /> Voir équipements
                    </Link>
                    <Link href={`/categories/${cat.id}/edit`} className="btn btn-secondary btn-sm btn-icon" title="Modifier">
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => setToDelete(cat)}
                      disabled={deleting === cat.id}
                      className="btn btn-danger btn-sm btn-icon"
                      title="Supprimer"
                    >
                      {deleting === cat.id ? <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!toDelete}
        title="Supprimer cette catégorie ?"
        message={`"${toDelete?.name}" sera définitivement supprimée. Cette action est irréversible.`}
        confirmLabel={deleting ? 'Suppression…' : 'Supprimer'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
