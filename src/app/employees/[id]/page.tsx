'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, UserX, UserCheck, Check,
  X, Phone, Plus, Trash2
} from 'lucide-react';
import { getEmployee, updateEmployee, deleteEmployee, getDepartments, getLoans } from '@/lib/api';
import { useRequireAdmin } from '@/lib/auth-context';
import type { Employee, Department, Loan } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [pastLoans, setPastLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', department_id: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [emp, depts, allLoans] = await Promise.all([
        getEmployee(id),
        getDepartments(),
        getLoans(),
      ]);
      setEmployee(emp);
      setDepartments(depts);
      setEditForm({ name: emp.name, department_id: emp.department_id ?? '', phone: emp.phone ?? '' });
      const empLoans = allLoans.filter(l => l.employee_id === id);
      setActiveLoans(empLoans.filter(l => l.status === 'active'));
      setPastLoans(empLoans.filter(l => l.status === 'returned'));
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    if (!employee || !editForm.name.trim()) return;
    setSaving(true);
    try {
      const updated = await updateEmployee(id, {
        name: editForm.name.trim(),
        department_id: editForm.department_id || undefined,
        phone: editForm.phone.trim() || undefined,
      });
      setEmployee(updated);
      setEditing(false);
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!employee) return;
    setToggling(true);
    try {
      const updated = await updateEmployee(id, { is_active: !employee.is_active });
      setEmployee(updated);
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (activeLoans.length > 0) {
      alert('Impossible de supprimer un employé avec des emprunts actifs. Traitez d\'abord le retour des équipements.');
      setShowDeleteConfirm(false);
      return;
    }
    setDeleting(true);
    try {
      await deleteEmployee(id);
      router.push('/employees');
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // ── Loading ──
  if (adminLoading || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !employee) {
    return (
      <div className="fade-in px-4 md:px-7 pt-8">
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--et-text)' }}>Employé introuvable</p>
          <Link href="/employees" className="btn btn-primary btn-sm mt-4">
            <ArrowLeft className="w-4 h-4" /> Retour aux employés
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/employees" className="btn btn-ghost btn-icon">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div
            className="flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold text-white shrink-0"
            style={{ background: 'var(--et-primary)' }}
          >
            {employee.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">{employee.name}</h1>
              <span className={`badge ${employee.is_active ? 'badge-available' : 'badge-neutral'}`}>
                {employee.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
            {employee.department && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {employee.department.color && (
                  <span className="w-2 h-2 rounded-full" style={{ background: employee.department.color }} />
                )}
                <p className="page-subtitle">{employee.department.name}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/loans/new?employee=${id}`} className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" /> Nouvel emprunt
          </Link>
          <button
            onClick={() => { setEditing(e => !e); }}
            className={`btn btn-sm ${editing ? 'btn-secondary' : 'btn-secondary'}`}
          >
            {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {editing ? 'Fermer' : 'Modifier'}
          </button>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className={`btn btn-sm ${employee.is_active ? 'btn-ghost' : 'btn-secondary'}`}
          >
            {toggling ? (
              <div className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} />
            ) : employee.is_active ? (
              <UserX className="w-3.5 h-3.5" style={{ color: 'var(--et-warning)' }} />
            ) : (
              <UserCheck className="w-3.5 h-3.5" style={{ color: 'var(--et-success)' }} />
            )}
            {employee.is_active ? 'Désactiver' : 'Activer'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn btn-ghost btn-sm btn-icon"
            title="Supprimer l'employé"
          >
            <Trash2 className="w-4 h-4" style={{ color: 'var(--et-danger)' }} />
          </button>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-5">

        {/* ── Formulaire d'édition ── */}
        {editing && (
          <div className="card p-5 space-y-4">
            <p className="section-label">Modifier les informations</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="et-label">Nom complet *</label>
                <input
                  type="text"
                  className="et-input"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="et-label">Service</label>
                <select
                  className="et-select"
                  value={editForm.department_id}
                  onChange={e => setEditForm(f => ({ ...f, department_id: e.target.value }))}
                >
                  <option value="">Aucun service</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="et-label">Téléphone</label>
                <input
                  type="tel"
                  className="et-input"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm">
                {saving ? (
                  <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                ) : <Check className="w-3.5 h-3.5" />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditing(false)} className="btn btn-ghost btn-sm">
                <X className="w-3.5 h-3.5" /> Annuler
              </button>
            </div>
          </div>
        )}

        {/* ── Téléphone (si pas en mode édition) ── */}
        {!editing && employee.phone && (
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" style={{ color: 'var(--et-text-muted)' }} />
              <a href={`tel:${employee.phone}`} className="text-sm font-medium" style={{ color: 'var(--et-text)' }}>
                {employee.phone}
              </a>
            </div>
          </div>
        )}

        {/* ── Emprunts actifs ── */}
        <div className="card">
          <div className="p-4" style={{ borderBottom: '1px solid var(--et-border)' }}>
            <p className="section-label mb-0">Emprunts actifs ({activeLoans.length})</p>
          </div>
          {activeLoans.length === 0 ? (
            <div className="empty-state py-6">
              <p className="empty-state-title">Aucun emprunt actif</p>
              <Link href={`/loans/new?employee=${id}`} className="btn btn-primary btn-sm mt-2">
                <Plus className="w-3.5 h-3.5" /> Créer un emprunt
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Date emprunt</th>
                    <th>Équipements</th>
                    <th className="hidden sm:table-cell">Retour prévu</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map(loan => (
                    <tr key={loan.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/loans/${loan.id}`)}>
                      <td style={{ color: 'var(--et-text-secondary)' }}>
                        {format(new Date(loan.checkout_date), 'dd/MM/yyyy', { locale: fr })}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {loan.items?.slice(0, 3).map(item => (
                            <span key={item.id} className="eq-number text-xs">
                              {item.equipment?.category?.code}-{item.equipment?.display_number}
                            </span>
                          ))}
                          {(loan.items?.length ?? 0) > 3 && (
                            <span className="badge badge-neutral">+{(loan.items?.length ?? 0) - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell" style={{ color: 'var(--et-text-muted)' }}>
                        {loan.expected_return_date
                          ? format(new Date(loan.expected_return_date), 'dd/MM/yyyy', { locale: fr })
                          : '—'}
                      </td>
                      <td>
                        <Link
                          href={`/loans/${loan.id}`}
                          onClick={e => e.stopPropagation()}
                          className="btn btn-secondary btn-sm"
                        >
                          Traiter retour
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Historique ── */}
        <div className="card">
          <div className="p-4" style={{ borderBottom: '1px solid var(--et-border)' }}>
            <p className="section-label mb-0">Historique des emprunts ({pastLoans.length})</p>
          </div>
          {pastLoans.length === 0 ? (
            <div className="empty-state py-6">
              <p className="empty-state-title">Aucun historique</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Date emprunt</th>
                    <th className="hidden sm:table-cell">Date retour</th>
                    <th>Équipements</th>
                  </tr>
                </thead>
                <tbody>
                  {pastLoans.map(loan => (
                    <tr key={loan.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/loans/${loan.id}`)}>
                      <td style={{ color: 'var(--et-text-secondary)' }}>
                        {format(new Date(loan.checkout_date), 'dd/MM/yyyy', { locale: fr })}
                      </td>
                      <td className="hidden sm:table-cell" style={{ color: 'var(--et-text-secondary)' }}>
                        {loan.return_date ? format(new Date(loan.return_date), 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </td>
                      <td>
                        <span className="badge badge-neutral">
                          {loan.items?.length ?? 0} item{(loan.items?.length ?? 0) > 1 ? 's' : ''}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ════ MODAL CONFIRMATION SUPPRESSION ════ */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        >
          <div className="card p-6 w-full max-w-sm fade-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'var(--et-danger-bg)' }}>
                <Trash2 className="w-5 h-5" style={{ color: 'var(--et-danger)' }} />
              </div>
              <div>
                <p className="font-bold" style={{ color: 'var(--et-text)' }}>Supprimer l&apos;employé</p>
                <p className="text-sm" style={{ color: 'var(--et-text-muted)' }}>{employee.name}</p>
              </div>
            </div>

            {activeLoans.length > 0 ? (
              <div className="alert alert-warning text-sm">
                Cet employé a {activeLoans.length} emprunt{activeLoans.length > 1 ? 's' : ''} actif{activeLoans.length > 1 ? 's' : ''}. Traitez d&apos;abord le retour avant de supprimer.
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--et-text-muted)' }}>
                Cette action est irréversible. L&apos;historique des emprunts sera conservé mais l&apos;employé ne pourra plus emprunter.
              </p>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || activeLoans.length > 0}
                className="btn btn-danger flex-1 justify-center"
              >
                {deleting ? (
                  <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                ) : <Trash2 className="w-3.5 h-3.5" />}
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
