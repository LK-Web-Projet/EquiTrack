'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Building2 } from 'lucide-react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getEmployees } from '@/lib/api';
import { useRequireAdmin } from '@/lib/auth-context';
import ConfirmModal from '@/components/ui/ConfirmModal';
import type { Department } from '@/types';

export default function DepartmentsPage() {
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [empCounts, setEmpCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [newForm, setNewForm] = useState({ name: '', color: '#3b82f6' });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', color: '#3b82f6' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Department | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [depts, emps] = await Promise.all([getDepartments(), getEmployees()]);
      setDepartments(depts);
      const counts: Record<string, number> = {};
      for (const e of emps) {
        if (e.department_id) counts[e.department_id] = (counts[e.department_id] ?? 0) + 1;
      }
      setEmpCounts(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setAdding(true);
    setError('');
    try {
      const dept = await createDepartment({ name: newForm.name.trim(), color: newForm.color });
      setDepartments(prev => [...prev, dept]);
      setNewForm({ name: '', color: '#3b82f6' });
    } catch (e: unknown) {
      setError('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (dept: Department) => {
    setEditId(dept.id);
    setEditForm({ name: dept.name, color: dept.color ?? '#3b82f6' });
  };

  const handleSave = async (id: string) => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateDepartment(id, { name: editForm.name.trim(), color: editForm.color });
      setDepartments(prev => prev.map(d => d.id === id ? updated : d));
      setEditId(null);
    } catch (e: unknown) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(toDelete.id);
    try {
      await deleteDepartment(toDelete.id);
      setDepartments(prev => prev.filter(d => d.id !== toDelete.id));
      setToDelete(null);
    } catch (e: unknown) {
      setError('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setDeleting(null);
    }
  };

  if (adminLoading || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Services</h1>
        <p className="page-subtitle">{departments.length} service{departments.length !== 1 ? 's' : ''} configuré{departments.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-5">
        {/* Add form */}
        <div className="card p-5">
          <p className="section-label">Nouveau service</p>
          {error && <div className="alert alert-danger mb-3">{error}</div>}
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label className="et-label">Nom du service *</label>
              <input
                type="text"
                className="et-input"
                placeholder="Ex: Informatique, RH, Logistique…"
                value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="et-label">Couleur</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newForm.color}
                  onChange={e => setNewForm(f => ({ ...f, color: e.target.value }))}
                  style={{ width: '2.75rem', height: '2.75rem', padding: '0.2rem', borderRadius: 'var(--et-radius)', border: '1.5px solid var(--et-border)', cursor: 'pointer' }}
                />
              </div>
            </div>
            <button type="submit" disabled={adding} className="btn btn-primary">
              {adding ? <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Plus className="w-4 h-4" />}
              Ajouter
            </button>
          </form>
        </div>

        {/* List */}
        <div className="card">
          {departments.length === 0 ? (
            <div className="empty-state">
              <Building2 className="empty-state-icon" />
              <p className="empty-state-title">Aucun service</p>
              <p className="empty-state-desc">Créez votre premier service ci-dessus.</p>
            </div>
          ) : (
            <div>
              {departments.map((dept, i) => (
                <div
                  key={dept.id}
                  style={{
                    borderBottom: i < departments.length - 1 ? '1px solid var(--et-border-light)' : 'none',
                  }}
                >
                  {editId === dept.id ? (
                    <div className="flex items-center gap-3 p-4 flex-wrap">
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                        style={{ width: '2.25rem', height: '2.25rem', padding: '0.15rem', borderRadius: 'var(--et-radius-sm)', border: '1.5px solid var(--et-border)', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <input
                        type="text"
                        className="et-input flex-1"
                        style={{ minWidth: '150px' }}
                        value={editForm.name}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(dept.id); if (e.key === 'Escape') setEditId(null); }}
                      />
                      <div className="flex items-center gap-2 ml-auto">
                        <button onClick={() => handleSave(dept.id)} disabled={saving} className="btn btn-primary btn-sm btn-icon">
                          {saving ? <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setEditId(null)} className="btn btn-ghost btn-sm btn-icon">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4">
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ background: dept.color ?? 'var(--et-text-muted)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium" style={{ color: 'var(--et-text)' }}>{dept.name}</p>
                        <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>
                          {empCounts[dept.id] ?? 0} employé{(empCounts[dept.id] ?? 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-auto">
                        <button onClick={() => startEdit(dept)} className="btn btn-ghost btn-sm btn-icon" title="Modifier">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setToDelete(dept)}
                          disabled={deleting === dept.id}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Supprimer"
                        >
                          {deleting === dept.id ? (
                            <div className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--et-danger)' }} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!toDelete}
        title="Supprimer ce service ?"
        message={`"${toDelete?.name}"${(empCounts[toDelete?.id ?? ''] ?? 0) > 0 ? ` (${empCounts[toDelete?.id ?? '']} employé${empCounts[toDelete?.id ?? ''] > 1 ? 's' : ''} associé${empCounts[toDelete?.id ?? ''] > 1 ? 's' : ''})` : ''} sera définitivement supprimé.`}
        confirmLabel={deleting ? 'Suppression…' : 'Supprimer'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
