'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Package, Pencil, Trash2, Eye,
  X, Save, MapPin, Tag, FileText, Calendar
} from 'lucide-react';
import { getCategories, getEquipment, updateEquipment, deleteEquipment } from '@/lib/api';
import { useRequireAdmin } from '@/lib/auth-context';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Category, Equipment, EquipmentStatus, EquipmentCondition } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: 'Disponible', borrowed: 'Emprunté',
  broken: 'En panne', maintenance: 'En maintenance',
};
const STATUS_BADGE: Record<EquipmentStatus, string> = {
  available: 'badge badge-available', borrowed: 'badge badge-borrowed',
  broken: 'badge badge-broken', maintenance: 'badge badge-maintenance',
};
const CONDITION_LABELS: Record<EquipmentCondition, string> = {
  good: 'Bon état', fair: 'Correct', poor: 'Mauvais état',
};
const CONDITION_BADGE: Record<EquipmentCondition, string> = {
  good: 'badge badge-good', fair: 'badge badge-fair', poor: 'badge badge-poor',
};

interface EditForm {
  serial_number: string
  status: EquipmentStatus
  condition: EquipmentCondition
  location: string
  description: string
  acquisition_date: string
}

export default function CategoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const router = useRouter();

  const [category, setCategory] = useState<Category | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Equipment | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    serial_number: '', status: 'available', condition: 'good',
    location: '', description: '', acquisition_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [cats, equip] = await Promise.all([
        getCategories(),
        getEquipment({ category_id: id }),
      ]);
      const cat = cats.find(c => c.id === id);
      if (!cat) { router.push('/categories'); return; }
      setCategory(cat);
      setEquipment(equip);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const filtered = statusFilter === 'all'
    ? equipment
    : equipment.filter(e => e.status === statusFilter);

  // ── Edit ────────────────────────────────────────────────
  const openEdit = (eq: Equipment) => {
    setEditTarget(eq);
    setEditForm({
      serial_number: eq.serial_number ?? '',
      status: eq.status,
      condition: eq.condition,
      location: eq.location ?? '',
      description: eq.description ?? '',
      acquisition_date: eq.acquisition_date ?? '',
    });
    setSaveError('');
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    setSaveError('');
    try {
      const updated = await updateEquipment(editTarget.id, {
        serial_number: editForm.serial_number.trim() || undefined,
        status: editForm.status,
        condition: editForm.condition,
        location: editForm.location.trim() || undefined,
        description: editForm.description.trim() || undefined,
        acquisition_date: editForm.acquisition_date || undefined,
      });
      setEquipment(prev => prev.map(e => e.id === updated.id ? updated : e));
      setEditTarget(null);
    } catch (e: unknown) {
      setSaveError('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  // ── Quick status change ─────────────────────────────────
  const handleQuickStatus = async (eq: Equipment, status: EquipmentStatus) => {
    try {
      const updated = await updateEquipment(eq.id, { status });
      setEquipment(prev => prev.map(e => e.id === updated.id ? updated : e));
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(toDelete.id);
    setDeleteError('');
    try {
      await deleteEquipment(toDelete.id);
      setEquipment(prev => prev.filter(e => e.id !== toDelete.id));
      setToDelete(null);
    } catch (e: unknown) {
      setDeleteError('Erreur : ' + (e instanceof Error ? e.message : String(e)));
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

  if (!category) return null;

  const stats = {
    total: equipment.length,
    available: equipment.filter(e => e.status === 'available').length,
    borrowed: equipment.filter(e => e.status === 'borrowed').length,
    broken: equipment.filter(e => e.status === 'broken').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
  };

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/categories" className="btn btn-ghost btn-icon">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl text-2xl shrink-0"
            style={{ background: category.color + '18', border: `1.5px solid ${category.color}30` }}
          >
            {category.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">{category.name}</h1>
              <span className="eq-number">{category.code}</span>
            </div>
            {category.description && <p className="page-subtitle">{category.description}</p>}
          </div>
        </div>
        <Link href={`/equipment/new?category=${id}`} className="btn btn-primary">
          <Plus className="w-4 h-4" /> Ajouter un équipement
        </Link>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-5">

        {deleteError && <div className="alert alert-danger">{deleteError}</div>}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: 'Total',        value: stats.total,       color: 'var(--et-text-secondary)', filter: 'all'         },
            { label: 'Disponibles',  value: stats.available,   color: 'var(--et-success)',         filter: 'available'   },
            { label: 'Empruntés',    value: stats.borrowed,    color: 'var(--et-primary)',         filter: 'borrowed'    },
            { label: 'En panne',     value: stats.broken,      color: 'var(--et-danger)',          filter: 'broken'      },
            { label: 'Maintenance',  value: stats.maintenance, color: 'var(--et-warning)',         filter: 'maintenance' },
          ].map(({ label, value, color, filter }) => (
            <button
              key={label}
              onClick={() => setStatusFilter(f => f === filter ? 'all' : filter)}
              className="card p-4 text-center transition-all"
              style={{
                outline: statusFilter === filter ? `2px solid ${color}` : 'none',
                outlineOffset: '2px',
              }}
            >
              <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>{label}</p>
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className="card">
          {/* Table header */}
          <div className="flex items-center justify-between gap-3 p-4 flex-wrap" style={{ borderBottom: '1px solid var(--et-border)' }}>
            <p className="section-label mb-0">
              Équipements ({filtered.length}{statusFilter !== 'all' ? ` · filtre: ${STATUS_LABELS[statusFilter as EquipmentStatus]}` : ''})
            </p>
            <div className="flex items-center gap-2">
              <select
                className="et-select"
                style={{ width: 'auto' }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="available">Disponible</option>
                <option value="borrowed">Emprunté</option>
                <option value="broken">En panne</option>
                <option value="maintenance">En maintenance</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <p className="empty-state-title">
                {statusFilter !== 'all' ? 'Aucun équipement pour ce filtre' : 'Aucun équipement'}
              </p>
              <p className="empty-state-desc">
                {statusFilter !== 'all'
                  ? 'Essayez un autre filtre ou réinitialisez.'
                  : 'Ajoutez votre premier équipement dans cette catégorie.'}
              </p>
              {statusFilter !== 'all' ? (
                <button onClick={() => setStatusFilter('all')} className="btn btn-secondary btn-sm mt-2">
                  Voir tous
                </button>
              ) : (
                <Link href={`/equipment/new?category=${id}`} className="btn btn-primary btn-sm mt-2">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un équipement
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Numéro</th>
                    <th className="hidden sm:table-cell">N° de série</th>
                    <th>Statut</th>
                    <th className="hidden sm:table-cell">État</th>
                    <th className="hidden md:table-cell">Localisation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(eq => (
                    <tr key={eq.id}>
                      {/* Numéro */}
                      <td>
                        <span className="eq-number">{category.code}-{eq.display_number}</span>
                      </td>

                      {/* N° série */}
                      <td className="hidden sm:table-cell" style={{ color: 'var(--et-text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                        {eq.serial_number || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>

                      {/* Statut — dropdown rapide */}
                      <td>
                        <select
                          className={`badge ${STATUS_BADGE[eq.status].replace('badge ', '')} cursor-pointer`}
                          style={{ border: 'none', background: 'transparent', fontWeight: 600, fontSize: '0.72rem', letterSpacing: '0.01em' }}
                          value={eq.status}
                          onChange={e => handleQuickStatus(eq, e.target.value as EquipmentStatus)}
                          onClick={e => e.stopPropagation()}
                          title="Changer le statut"
                        >
                          <option value="available">Disponible</option>
                          <option value="borrowed">Emprunté</option>
                          <option value="broken">En panne</option>
                          <option value="maintenance">En maintenance</option>
                        </select>
                      </td>

                      {/* État */}
                      <td className="hidden sm:table-cell">
                        <span className={CONDITION_BADGE[eq.condition]}>{CONDITION_LABELS[eq.condition]}</span>
                      </td>

                      {/* Localisation */}
                      <td className="hidden md:table-cell" style={{ color: 'var(--et-text-muted)' }}>
                        {eq.location || <span style={{ opacity: 0.4 }}>—</span>}
                      </td>

                      {/* Actions CRUD */}
                      <td>
                        <div className="flex items-center gap-1">
                          {/* Voir détail */}
                          <Link
                            href={`/equipment/${eq.id}`}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Voir le détail et historique"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {/* Modifier */}
                          <button
                            onClick={() => openEdit(eq)}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Modifier"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Supprimer */}
                          <button
                            onClick={() => setToDelete(eq)}
                            disabled={deleting === eq.id}
                            className="btn btn-ghost btn-sm btn-icon"
                            title="Supprimer"
                          >
                            {deleting === eq.id ? (
                              <div className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--et-danger)' }} />
                            )}
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

      {/* ════════════════════════════════════════
          MODAL DE MODIFICATION
          ════════════════════════════════════════ */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditTarget(null); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl shadow-2xl fade-in overflow-hidden"
            style={{ background: 'var(--et-surface)' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid var(--et-border)' }}
            >
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--et-text)' }}>
                  Modifier l&apos;équipement
                </h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--et-text-muted)' }}>
                  <span className="eq-number">{category.code}-{editTarget.display_number}</span>
                </p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="btn btn-ghost btn-icon"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {saveError && <div className="alert alert-danger">{saveError}</div>}

              {/* Statut */}
              <div>
                <label className="et-label flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> Statut
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['available', 'borrowed', 'broken', 'maintenance'] as EquipmentStatus[]).map(s => (
                    <label
                      key={s}
                      className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer"
                      style={{
                        background: editForm.status === s ? 'var(--et-primary-light)' : 'var(--et-surface-2)',
                        border: `1.5px solid ${editForm.status === s ? 'var(--et-primary-muted)' : 'transparent'}`,
                      }}
                    >
                      <input
                        type="radio"
                        name="edit-status"
                        checked={editForm.status === s}
                        onChange={() => setEditForm(f => ({ ...f, status: s }))}
                        style={{ accentColor: 'var(--et-primary)' }}
                      />
                      <span className={STATUS_BADGE[s]}>{STATUS_LABELS[s]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* État / Condition */}
              <div>
                <label className="et-label flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> État général
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['good', 'fair', 'poor'] as EquipmentCondition[]).map(c => (
                    <label
                      key={c}
                      className="flex items-center justify-center gap-2 p-2.5 rounded-lg cursor-pointer text-center"
                      style={{
                        background: editForm.condition === c ? 'var(--et-primary-light)' : 'var(--et-surface-2)',
                        border: `1.5px solid ${editForm.condition === c ? 'var(--et-primary-muted)' : 'transparent'}`,
                      }}
                    >
                      <input
                        type="radio"
                        name="edit-condition"
                        checked={editForm.condition === c}
                        onChange={() => setEditForm(f => ({ ...f, condition: c }))}
                        style={{ accentColor: 'var(--et-primary)' }}
                      />
                      <span className={CONDITION_BADGE[c]}>{CONDITION_LABELS[c]}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* N° de série */}
              <div>
                <label className="et-label flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" /> N° de série
                  <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span>
                </label>
                <input
                  type="text"
                  className="et-input"
                  placeholder="Ex: SN-2024-0042"
                  value={editForm.serial_number}
                  onChange={e => setEditForm(f => ({ ...f, serial_number: e.target.value }))}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              {/* Localisation */}
              <div>
                <label className="et-label flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Localisation
                  <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span>
                </label>
                <input
                  type="text"
                  className="et-input"
                  placeholder="Ex: Salle 12, Bureau RH…"
                  value={editForm.location}
                  onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
                />
              </div>

              {/* Date d'acquisition */}
              <div>
                <label className="et-label flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date d&apos;acquisition
                  <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span>
                </label>
                <input
                  type="date"
                  className="et-input"
                  value={editForm.acquisition_date}
                  onChange={e => setEditForm(f => ({ ...f, acquisition_date: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div>
                <label className="et-label flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Description
                  <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span>
                </label>
                <textarea
                  className="et-textarea"
                  placeholder="Notes, observations…"
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div
              className="flex items-center gap-3 px-6 py-4"
              style={{ borderTop: '1px solid var(--et-border)' }}
            >
              <button onClick={() => setEditTarget(null)} className="btn btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary flex-1 justify-center"
              >
                {saving ? (
                  <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                ) : <Save className="w-4 h-4" />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!toDelete}
        title="Supprimer cet équipement ?"
        message={`${category.code}-${toDelete?.display_number} sera définitivement supprimé. Cette action est irréversible.`}
        confirmLabel={deleting ? 'Suppression…' : 'Supprimer'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
