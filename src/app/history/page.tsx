'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, History } from 'lucide-react';
import { getLoans, getCategories, getEmployees } from '@/lib/supabase';
import type { Loan, Category, Employee } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function HistoryPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [empFilter, setEmpFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [all, cats, emps] = await Promise.all([getLoans(), getCategories(), getEmployees()]);
        setLoans(all);
        setCategories(cats);
        setEmployees(emps);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = loans.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      l.employee?.name?.toLowerCase().includes(q) ||
      l.employee?.department?.name?.toLowerCase().includes(q) ||
      l.items?.some(i => i.equipment?.category?.name.toLowerCase().includes(q));
    const matchCat = catFilter === 'all' || l.items?.some(i => i.equipment?.category_id === catFilter);
    const matchEmp = empFilter === 'all' || l.employee_id === empFilter;
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    const matchFrom = !dateFrom || l.checkout_date >= dateFrom;
    const matchTo = !dateTo || l.checkout_date <= dateTo;
    return matchSearch && matchCat && matchEmp && matchStatus && matchFrom && matchTo;
  });

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
      <div className="page-header">
        <h1 className="page-title">Historique</h1>
        <p className="page-subtitle">{loans.length} emprunt{loans.length !== 1 ? 's' : ''} au total</p>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-4">
        {/* Filters */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2" style={{ background: 'var(--et-surface-2)', border: '1.5px solid var(--et-border)', borderRadius: 'var(--et-radius)', padding: '0.5rem 0.875rem' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--et-text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par employé, service, catégorie…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--et-text)' }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select className="et-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="returned">Retournés</option>
            </select>
            <select className="et-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="all">Toutes les catégories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select className="et-select" value={empFilter} onChange={e => setEmpFilter(e.target.value)}>
              <option value="all">Tous les employés</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" className="et-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span style={{ color: 'var(--et-text-muted)', flexShrink: 0 }}>→</span>
              <input type="date" className="et-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <span className="text-sm" style={{ color: 'var(--et-text-muted)' }}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <History className="empty-state-icon" />
              <p className="empty-state-title">Aucun emprunt trouvé</p>
              <p className="empty-state-desc">Modifiez vos filtres pour trouver des emprunts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Employé</th>
                    <th className="hidden sm:table-cell">Items</th>
                    <th className="hidden md:table-cell">Catégories</th>
                    <th>Date emprunt</th>
                    <th className="hidden sm:table-cell">Date retour</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(loan => {
                    const cats = [...new Set(loan.items?.map(i => i.equipment?.category?.name).filter(Boolean))];
                    return (
                      <tr
                        key={loan.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => router.push(`/loans/${loan.id}`)}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shrink-0" style={{ background: 'var(--et-primary)' }}>
                              {loan.employee?.name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{loan.employee?.name ?? '—'}</p>
                              {loan.employee?.department && (
                                <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>{loan.employee.department.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <span className="badge badge-neutral">{loan.items?.length ?? 0} item{(loan.items?.length ?? 0) > 1 ? 's' : ''}</span>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="text-sm" style={{ color: 'var(--et-text-secondary)' }}>{cats.join(', ') || '—'}</span>
                        </td>
                        <td style={{ color: 'var(--et-text-secondary)' }}>
                          {format(new Date(loan.checkout_date), 'dd/MM/yyyy', { locale: fr })}
                        </td>
                        <td className="hidden sm:table-cell" style={{ color: 'var(--et-text-muted)' }}>
                          {loan.return_date ? format(new Date(loan.return_date), 'dd/MM/yyyy', { locale: fr }) : <span style={{ opacity: 0.5 }}>—</span>}
                        </td>
                        <td>
                          <span className={`badge ${loan.status === 'active' ? 'badge-active' : 'badge-returned'}`}>
                            {loan.status === 'active' ? 'Actif' : 'Retourné'}
                          </span>
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
