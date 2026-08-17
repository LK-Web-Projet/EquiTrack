'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { createEmployee, getDepartments } from '@/lib/api';
import { useRequireAdmin } from '@/lib/auth-context';
import type { Department } from '@/types';

export default function NewEmployeePage() {
  const router = useRouter();
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState({ name: '', department_id: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return; }
    setLoading(true);
    setError('');
    try {
      await createEmployee({
        name: form.name.trim(),
        department_id: form.department_id || undefined,
        phone: form.phone.trim() || undefined,
        is_active: true,
      });
      router.push('/employees');
    } catch (e: unknown) {
      setError('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header flex items-center gap-3">
        <Link href="/employees" className="btn btn-ghost btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Ajouter un employé</h1>
          <p className="page-subtitle">Renseignez les informations de base</p>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8">
        <div className="max-w-lg mx-auto">
          {error && <div className="alert alert-danger mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="card p-6 space-y-5">
            <div>
              <label className="et-label" htmlFor="name">
                Nom complet <span style={{ color: 'var(--et-danger)' }}>*</span>
              </label>
              <input
                id="name"
                type="text"
                className="et-input"
                placeholder="Ex: Jean Dupont"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                autoFocus
                style={{ fontSize: '1rem', padding: '0.75rem 1rem' }}
              />
            </div>

            <div>
              <label className="et-label" htmlFor="dept">Service</label>
              <select
                id="dept"
                className="et-select"
                value={form.department_id}
                onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
              >
                <option value="">Aucun service</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="et-label" htmlFor="phone">
                Téléphone <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <input
                id="phone"
                type="tel"
                className="et-input"
                placeholder="Ex: 06 12 34 56 78"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link href="/employees" className="btn btn-secondary flex-1 justify-center">Annuler</Link>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 justify-center btn-lg"
              >
                {loading ? (
                  <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                ) : <UserPlus className="w-4 h-4" />}
                {loading ? 'Enregistrement…' : 'Enregistrer l\'employé'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
