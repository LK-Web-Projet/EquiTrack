'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, User, FileText, ChevronsDown } from 'lucide-react';
import { getLoan, returnLoan } from '@/lib/supabase';
import type { Loan, LoanItem, ReturnCondition } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS = {
  available: 'Disponible', borrowed: 'Emprunté',
  broken: 'En panne', maintenance: 'En maintenance',
};
const STATUS_BADGE: Record<string, string> = {
  available: 'badge badge-available', borrowed: 'badge badge-borrowed',
  broken: 'badge badge-broken', maintenance: 'badge badge-maintenance',
};
const RETURN_LABELS: Record<ReturnCondition, string> = {
  good: 'Bon état', broken: 'En panne', damaged: 'Endommagé',
};

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Return form state
  const [returnConditions, setReturnConditions] = useState<Record<string, ReturnCondition>>({});
  const [returnNotes, setReturnNotes] = useState('');
  // Editable return date/time (initialised on load, not on render)
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const l = await getLoan(id);
      setLoan(l);
      if (l.status === 'active') {
        // Set editable date/time to NOW at load time — user can change it
        const now = new Date();
        setReturnDate(format(now, 'yyyy-MM-dd'));
        setReturnTime(format(now, 'HH:mm'));
        if (l.items) {
          const initial: Record<string, ReturnCondition> = {};
          for (const item of l.items) initial[item.equipment_id] = 'good';
          setReturnConditions(initial);
        }
      }
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  // Apply same condition to all items at once
  const applyToAll = (condition: ReturnCondition) => {
    if (!loan?.items) return;
    const all: Record<string, ReturnCondition> = {};
    for (const item of loan.items) all[item.equipment_id] = condition;
    setReturnConditions(all);
  };

  const handleReturn = async () => {
    if (!loan?.items) return;
    setSubmitting(true);
    setError('');
    try {
      const updated = await returnLoan(id, {
        return_date: returnDate,
        return_time: returnTime + ':00',
        return_notes: returnNotes.trim() || undefined,
        items: loan.items.map(item => ({
          equipment_id: item.equipment_id,
          return_condition: returnConditions[item.equipment_id] ?? 'good',
        })),
      });
      setLoan(updated);
      setSuccess(true);
    } catch (e: unknown) {
      setError('Erreur lors du retour : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !loan) {
    return (
      <div className="fade-in px-4 md:px-7 pt-8">
        <div className="card p-8 text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--et-text)' }}>Emprunt introuvable</p>
          <p className="text-sm mt-2" style={{ color: 'var(--et-text-muted)' }}>
            Cet emprunt n&apos;existe pas ou a été supprimé.
          </p>
          <Link href="/loans" className="btn btn-primary btn-sm mt-4">
            <ArrowLeft className="w-4 h-4" /> Retour aux emprunts
          </Link>
        </div>
      </div>
    );
  }

  const isActive = loan.status === 'active';

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/loans')} className="btn btn-ghost btn-icon">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">Emprunt #{id.slice(0, 8).toUpperCase()}</h1>
              <span className={`badge ${isActive ? 'badge-active' : 'badge-returned'}`}>
                {isActive ? 'Actif' : 'Retourné'}
              </span>
            </div>
            <p className="page-subtitle">
              {format(new Date(loan.checkout_date), 'dd MMMM yyyy', { locale: fr })} à {loan.checkout_time}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-5">

        {/* ── Succès ── */}
        {success && (
          <div className="alert alert-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Retour enregistré avec succès.
          </div>
        )}

        {/* ── Employé + Détails ── */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="card p-5">
            <p className="section-label">Employé</p>
            <div className="flex items-center gap-3 mt-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full text-base font-bold text-white shrink-0"
                style={{ background: 'var(--et-primary)' }}
              >
                {loan.employee?.name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div>
                <Link href={`/employees/${loan.employee_id}`} className="font-semibold" style={{ color: 'var(--et-text)' }}>
                  {loan.employee?.name ?? '—'}
                </Link>
                {loan.employee?.department && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {loan.employee.department.color && (
                      <span className="w-2 h-2 rounded-full" style={{ background: loan.employee.department.color }} />
                    )}
                    <p className="text-sm" style={{ color: 'var(--et-text-muted)' }}>{loan.employee.department.name}</p>
                  </div>
                )}
                {loan.employee?.phone && (
                  <p className="text-sm mt-0.5" style={{ color: 'var(--et-text-muted)' }}>{loan.employee.phone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-3">
            <p className="section-label">Détails</p>
            <div className="space-y-2">
              {[
                { icon: Clock, label: 'Emprunt', value: `${format(new Date(loan.checkout_date), 'dd/MM/yyyy', { locale: fr })} à ${loan.checkout_time}` },
                { icon: Clock, label: 'Retour prévu', value: loan.expected_return_date ? format(new Date(loan.expected_return_date), 'dd/MM/yyyy', { locale: fr }) : '—' },
                { icon: User, label: 'Agent', value: loan.processed_by || '—' },
                { icon: FileText, label: 'Notes', value: loan.checkout_notes || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--et-text-muted)' }} />
                  <div>
                    <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>{label} · </span>
                    <span className="text-sm" style={{ color: 'var(--et-text)' }}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Table équipements ── */}
        <div className="card">
          <div className="p-4" style={{ borderBottom: '1px solid var(--et-border)' }}>
            <p className="section-label mb-0">Équipements empruntés ({loan.items?.length ?? 0})</p>
          </div>
          <div className="overflow-x-auto">
            <table className="et-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th className="hidden sm:table-cell">Catégorie</th>
                  <th className="hidden md:table-cell">N° de série</th>
                  <th>Statut actuel</th>
                  {!isActive && <th>État retour</th>}
                </tr>
              </thead>
              <tbody>
                {loan.items?.map((item: LoanItem) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/equipment/${item.equipment_id}`} className="eq-number hover:opacity-70">
                        {item.equipment?.category?.code}-{item.equipment?.display_number}
                      </Link>
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span>{item.equipment?.category?.icon}</span>
                        <span style={{ color: 'var(--et-text-secondary)' }}>{item.equipment?.category?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" style={{ color: 'var(--et-text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {item.equipment?.serial_number || '—'}
                    </td>
                    <td>
                      {item.equipment?.status && (
                        <span className={STATUS_BADGE[item.equipment.status]}>
                          {STATUS_LABELS[item.equipment.status as keyof typeof STATUS_LABELS]}
                        </span>
                      )}
                    </td>
                    {!isActive && (
                      <td>
                        {item.return_condition ? (
                          <span className={
                            item.return_condition === 'good' ? 'badge badge-good' :
                            item.return_condition === 'broken' ? 'badge badge-broken' : 'badge badge-fair'
                          }>
                            {RETURN_LABELS[item.return_condition]}
                          </span>
                        ) : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Traitement du retour ── */}
        {isActive && (
          <div className="card p-5 space-y-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--et-success)' }} />
              <p className="section-label mb-0" style={{ color: 'var(--et-success-text)' }}>Traiter le retour</p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            {/* Date et heure — éditables */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="et-label">Date de retour</label>
                <input
                  type="date"
                  className="et-input"
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  max={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <label className="et-label">Heure de retour</label>
                <input
                  type="time"
                  className="et-input"
                  value={returnTime}
                  onChange={e => setReturnTime(e.target.value)}
                />
              </div>
            </div>

            {/* État de retour par équipement */}
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <p className="et-label mb-0">État de retour par équipement</p>
                {/* Appliquer à tous */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>Appliquer à tous :</span>
                  {(['good', 'damaged', 'broken'] as ReturnCondition[]).map(c => (
                    <button
                      key={c}
                      onClick={() => applyToAll(c)}
                      className="btn btn-ghost btn-sm flex items-center gap-1"
                      style={{ padding: '0.25rem 0.5rem' }}
                    >
                      <ChevronsDown className="w-3 h-3" />
                      <span className={
                        c === 'good' ? 'badge badge-good' :
                        c === 'broken' ? 'badge badge-broken' : 'badge badge-fair'
                      } style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                        {RETURN_LABELS[c]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {loan.items?.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 flex-wrap p-3 rounded-xl"
                    style={{ background: 'var(--et-surface-2)' }}
                  >
                    <span className="eq-number">{item.equipment?.category?.code}-{item.equipment?.display_number}</span>
                    <span className="text-sm hidden sm:inline" style={{ color: 'var(--et-text-secondary)' }}>
                      {item.equipment?.category?.name}
                    </span>
                    <select
                      className="et-select ml-auto"
                      style={{ width: 'auto', minWidth: '150px' }}
                      value={returnConditions[item.equipment_id] ?? 'good'}
                      onChange={e => setReturnConditions(prev => ({
                        ...prev,
                        [item.equipment_id]: e.target.value as ReturnCondition,
                      }))}
                    >
                      <option value="good">✅ Bon état</option>
                      <option value="damaged">⚠️ Endommagé</option>
                      <option value="broken">❌ En panne</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="et-label">
                Notes de retour <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span>
              </label>
              <textarea
                className="et-textarea"
                placeholder="Observations lors du retour…"
                value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
                rows={2}
              />
            </div>

            <button
              onClick={handleReturn}
              disabled={submitting}
              className="btn btn-primary w-full justify-center btn-lg"
            >
              {submitting ? (
                <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              ) : <CheckCircle2 className="w-5 h-5" />}
              {submitting ? 'Enregistrement…' : 'Enregistrer le retour'}
            </button>
          </div>
        )}

        {/* ── Retour déjà effectué ── */}
        {!isActive && loan.return_date && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--et-success)' }} />
              <p className="section-label mb-0">Retour effectué</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--et-success-bg)' }}>
                <p className="text-xs" style={{ color: 'var(--et-success-text)' }}>Date de retour</p>
                <p className="font-semibold text-sm mt-1" style={{ color: 'var(--et-success-text)' }}>
                  {format(new Date(loan.return_date), 'dd/MM/yyyy', { locale: fr })} à {loan.return_time?.slice(0, 5)}
                </p>
              </div>
              {loan.return_notes && (
                <div className="p-3 rounded-xl sm:col-span-2" style={{ background: 'var(--et-surface-2)' }}>
                  <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>Notes de retour</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--et-text)' }}>{loan.return_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
