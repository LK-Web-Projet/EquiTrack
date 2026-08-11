'use client';

import { useEffect, useState } from 'react';
import { Plus, UserCog, Trash2, X, ShieldCheck } from 'lucide-react';
import { useAuth, useRequireAdmin } from '@/lib/auth-context';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
}

export default function UsersPage() {
  const { loading: authLoading, isAdmin } = useRequireAdmin();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'user' as 'admin' | 'user' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de chargement');
      setUsers(data.users);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création');
      setForm({ email: '', full_name: '', password: '', role: 'user' });
      setShowForm(false);
      load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${toDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression');
      setUsers(prev => prev.filter(u => u.id !== toDelete.id));
      setToDelete(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">Comptes ayant accès à l&apos;application</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn btn-primary">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Annuler' : 'Créer un compte'}
        </button>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-4">
        {error && <div className="alert alert-danger">{error}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="card p-6 space-y-4">
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="et-label">Nom complet</label>
                <input
                  type="text" className="et-input" placeholder="Ex: Awa Diallo"
                  value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="et-label">Email</label>
                <input
                  type="email" className="et-input" placeholder="nom@entreprise.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="et-label">Mot de passe temporaire</label>
                <input
                  type="text" className="et-input" placeholder="Au moins 8 caractères"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  minLength={8} required
                />
              </div>
              <div>
                <label className="et-label">Rôle</label>
                <select
                  className="et-select" value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'user' }))}
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Plus className="w-4 h-4" />}
              {saving ? 'Création…' : 'Créer le compte'}
            </button>
          </form>
        )}

        <div className="card">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state">
              <UserCog className="empty-state-icon" />
              <p className="empty-state-title">Aucun utilisateur</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th className="hidden sm:table-cell">Email</th>
                    <th>Rôle</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white shrink-0"
                            style={{ background: 'var(--et-primary)' }}
                          >
                            {(u.full_name || u.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">{u.full_name || '—'}</span>
                            <p className="sm:hidden text-xs" style={{ color: 'var(--et-text-muted)' }}>{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell" style={{ color: 'var(--et-text-secondary)' }}>{u.email}</td>
                      <td>
                        {u.role === 'admin' ? (
                          <span className="badge" style={{ background: 'var(--et-info-bg)', color: 'var(--et-info-text)' }}>
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="badge badge-neutral">Utilisateur</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => setToDelete(u)}
                          disabled={u.id === currentUser?.id}
                          className="btn btn-ghost btn-sm btn-icon"
                          title={u.id === currentUser?.id ? 'Impossible de supprimer votre propre compte' : 'Supprimer'}
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: u.id === currentUser?.id ? 'var(--et-text-muted)' : 'var(--et-danger)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!toDelete}
        title="Supprimer ce compte ?"
        message={`${toDelete?.full_name || toDelete?.email} n'aura plus accès à l'application. Cette action est irréversible.`}
        confirmLabel={deleting ? 'Suppression…' : 'Supprimer'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
