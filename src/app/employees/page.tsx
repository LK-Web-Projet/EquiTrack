'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Users, Eye, UserCheck, UserX } from 'lucide-react';
import { getEmployees, updateEmployee } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { useRequireAdmin } from '@/lib/auth-context';
import type { Employee } from '@/types';

export default function EmployeesPage() {
  const router = useRouter();
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeLoans, setActiveLoans] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'inactive'>('active');
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, { data: loanData }] = await Promise.all([
        getEmployees(),
        supabase.from('loans').select('employee_id').eq('status', 'active'),
      ]);
      setEmployees(emps);
      const counts: Record<string, number> = {};
      for (const l of loanData ?? []) {
        counts[l.employee_id] = (counts[l.employee_id] ?? 0) + 1;
      }
      setActiveLoans(counts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (emp: Employee) => {
    setToggling(emp.id);
    try {
      const updated = await updateEmployee(emp.id, { is_active: !emp.is_active });
      setEmployees(prev => prev.map(e => e.id === emp.id ? updated : e));
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setToggling(null);
    }
  };

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.department?.name.toLowerCase().includes(q) || e.phone?.includes(q);
    const matchTab = tab === 'active' ? e.is_active : !e.is_active;
    return matchSearch && matchTab;
  });

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

  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  return (
    <div className="fade-in">
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Employés</h1>
          <p className="page-subtitle">{activeCount} actif{activeCount !== 1 ? 's' : ''} · {inactiveCount} inactif{inactiveCount !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/employees/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Ajouter un employé
        </Link>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-4">
        {/* Search */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2" style={{ background: 'var(--et-surface-2)', border: '1.5px solid var(--et-border)', borderRadius: 'var(--et-radius)', padding: '0.5rem 0.875rem' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--et-text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par nom, service, téléphone…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--et-text)' }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--et-border)' }}>
              {(['active', 'inactive'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className="btn btn-sm"
                  style={{
                    background: tab === t ? 'var(--et-primary)' : 'var(--et-surface)',
                    color: tab === t ? '#fff' : 'var(--et-text-secondary)',
                    borderRadius: 0, border: 'none',
                  }}
                >
                  {t === 'active' ? `Actifs (${activeCount})` : `Inactifs (${inactiveCount})`}
                </button>
              ))}
            </div>
            <span className="text-sm" style={{ color: 'var(--et-text-muted)' }}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Users className="empty-state-icon" />
              <p className="empty-state-title">Aucun employé{search ? ' trouvé' : tab === 'active' ? ' actif' : ' inactif'}</p>
              {!search && tab === 'active' && (
                <Link href="/employees/new" className="btn btn-primary btn-sm mt-2">
                  <Plus className="w-3.5 h-3.5" /> Ajouter un employé
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th className="hidden sm:table-cell">Service</th>
                    <th className="hidden md:table-cell">Téléphone</th>
                    <th className="hidden sm:table-cell">Emprunts actifs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => {
                    const loanCount = activeLoans[emp.id] ?? 0;
                    return (
                      <tr key={emp.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white shrink-0"
                              style={{ background: 'var(--et-primary)' }}
                            >
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{emp.name}</span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          {emp.department ? (
                            <div className="flex items-center gap-1.5">
                              {emp.department.color && (
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: emp.department.color }} />
                              )}
                              <span style={{ color: 'var(--et-text-secondary)' }}>{emp.department.name}</span>
                            </div>
                          ) : <span style={{ color: 'var(--et-text-muted)' }}>—</span>}
                        </td>
                        <td className="hidden md:table-cell" style={{ color: 'var(--et-text-muted)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {emp.phone || '—'}
                        </td>
                        <td className="hidden sm:table-cell">
                          {loanCount > 0 ? (
                            <span className="badge badge-active">{loanCount} emprunt{loanCount > 1 ? 's' : ''}</span>
                          ) : (
                            <span style={{ color: 'var(--et-text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => router.push(`/employees/${emp.id}`)} className="btn btn-ghost btn-sm btn-icon" title="Voir">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggle(emp)}
                              disabled={toggling === emp.id}
                              className={`btn btn-sm btn-icon ${emp.is_active ? 'btn-ghost' : 'btn-secondary'}`}
                              title={emp.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {toggling === emp.id ? (
                                <div className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} />
                              ) : emp.is_active ? (
                                <UserX className="w-3.5 h-3.5" style={{ color: 'var(--et-danger)' }} />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" style={{ color: 'var(--et-success)' }} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
