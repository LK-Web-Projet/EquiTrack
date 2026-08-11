'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, ArrowLeftRight, Clock } from 'lucide-react';
import { getLoans } from '@/lib/supabase';
import type { Loan } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function LoansPage() {
  const router = useRouter();
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [historyLoans, setHistoryLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [active, history] = await Promise.all([getLoans('active'), getLoans('returned')]);
        setActiveLoans(active);
        setHistoryLoans(history);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const loans = tab === 'active' ? activeLoans : historyLoans;
  const filtered = loans.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.employee?.name?.toLowerCase().includes(q) ||
      l.employee?.department?.name?.toLowerCase().includes(q) ||
      l.items?.some(i => i.equipment?.category?.name.toLowerCase().includes(q))
    );
  });

  const isOverdue = (loan: Loan) =>
    loan.expected_return_date && new Date(loan.expected_return_date) < new Date() && loan.status === 'active';

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
          <h1 className="page-title">Emprunts</h1>
          <p className="page-subtitle">
            {activeLoans.length} actif{activeLoans.length !== 1 ? 's' : ''} · {historyLoans.length} retourné{historyLoans.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/loans/new" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Nouvel emprunt
        </Link>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-4">
        {/* Filters */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-2" style={{ background: 'var(--et-surface-2)', border: '1.5px solid var(--et-border)', borderRadius: 'var(--et-radius)', padding: '0.5rem 0.875rem' }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--et-text-muted)' }} />
            <input
              type="text"
              placeholder="Rechercher par employé, service…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--et-text)' }}
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--et-border)' }}>
              {(['active', 'history'] as const).map(t => (
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
                  {t === 'active' ? `Actifs (${activeLoans.length})` : `Historique (${historyLoans.length})`}
                </button>
              ))}
            </div>
            <span className="text-sm" style={{ color: 'var(--et-text-muted)' }}>{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="card p-5">
            <div className="empty-state">
              <ArrowLeftRight className="empty-state-icon" />
              <p className="empty-state-title">Aucun emprunt{search ? ' trouvé' : tab === 'active' ? ' actif' : ' dans l\'historique'}</p>
              {!search && tab === 'active' && (
                <Link href="/loans/new" className="btn btn-primary btn-sm mt-2">
                  <Plus className="w-3.5 h-3.5" /> Créer un emprunt
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(loan => {
              const count = loan.items?.length ?? 0;
              const cats = [...new Set(loan.items?.map(i => i.equipment?.category?.name).filter(Boolean))];
              const overdue = isOverdue(loan);
              return (
                <div
                  key={loan.id}
                  className="card p-4 flex items-center gap-4 cursor-pointer"
                  onClick={() => router.push(`/loans/${loan.id}`)}
                  style={{
                    borderColor: overdue ? 'var(--et-warning)' : undefined,
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center w-11 h-11 rounded-full shrink-0 text-base font-bold text-white"
                    style={{ background: 'var(--et-primary)' }}
                  >
                    {loan.employee?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold" style={{ color: 'var(--et-text)' }}>{loan.employee?.name ?? '—'}</span>
                      {loan.employee?.department && (
                        <div className="flex items-center gap-1">
                          {loan.employee.department.color && (
                            <span className="w-2 h-2 rounded-full" style={{ background: loan.employee.department.color }} />
                          )}
                          <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>{loan.employee.department.name}</span>
                        </div>
                      )}
                      {overdue && <span className="badge badge-broken">En retard</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="badge badge-neutral">{count} item{count > 1 ? 's' : ''}</span>
                      <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>{cats.join(', ') || '—'}</span>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="flex items-center gap-1.5 justify-end mb-1">
                      <Clock className="w-3 h-3" style={{ color: 'var(--et-text-muted)' }} />
                      <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>
                        {format(new Date(loan.checkout_date), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    {loan.expected_return_date && (
                      <p className="text-xs" style={{ color: overdue ? 'var(--et-warning)' : 'var(--et-text-muted)' }}>
                        Retour: {format(new Date(loan.expected_return_date), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    )}
                    <div className="mt-1.5">
                      <span className={`badge ${loan.status === 'active' ? 'badge-active' : 'badge-returned'}`}>
                        {loan.status === 'active' ? 'Actif' : 'Retourné'}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  {loan.status === 'active' && (
                    <Link
                      href={`/loans/${loan.id}`}
                      onClick={e => e.stopPropagation()}
                      className="btn btn-secondary btn-sm shrink-0"
                    >
                      Traiter retour
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
