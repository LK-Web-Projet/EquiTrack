'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Package, ArrowLeftRight, CheckCircle2, AlertCircle,
  Wrench, Plus, Clock, ArrowRight, Layers, Users, AlertTriangle
} from 'lucide-react';
import { getDashboardStats, getLoans, getCategories, getEquipment, getRecentIncidents } from '@/lib/api';
import type { DashboardStats, Loan, Category } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AIInsightsPanel } from '@/components/ui/AIInsightsPanel';
import { AI_FEATURES_ENABLED } from '@/lib/config';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLoans, setRecentLoans] = useState<Loan[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catStats, setCatStats] = useState<Record<string, { total: number; available: number; borrowed: number; broken: number }>>({});
  const [recentIncidents, setRecentIncidents] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, loans, cats] = await Promise.all([
          getDashboardStats(),
          getLoans('active'),
          getCategories(),
        ]);
        setStats(s);
        setRecentLoans(loans.slice(0, 5));
        setCategories(cats);

        const [eqData, incData] = await Promise.all([
          getEquipment(),
          getRecentIncidents(10),
        ]);
        const m: Record<string, { total: number; available: number; borrowed: number; broken: number }> = {};
        for (const row of eqData) {
          if (!m[row.category_id]) m[row.category_id] = { total: 0, available: 0, borrowed: 0, broken: 0 };
          m[row.category_id].total++;
          if (row.status === 'available') m[row.category_id].available++;
          if (row.status === 'borrowed') m[row.category_id].borrowed++;
          if (row.status === 'broken') m[row.category_id].broken++;
        }
        setCatStats(m);
        setRecentIncidents(incData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const categoriesForAI = categories.map(cat => ({
    name: cat.name,
    total: catStats[cat.id]?.total ?? 0,
    available: catStats[cat.id]?.available ?? 0,
    borrowed: catStats[cat.id]?.borrowed ?? 0,
    broken: catStats[cat.id]?.broken ?? 0,
  }));

  const STAT_CARDS = [
    { label: 'Total équipements', value: stats?.total ?? 0, icon: Package, color: 'var(--et-primary)', bg: 'var(--et-primary-light)', href: '/equipment' },
    { label: 'Disponibles', value: stats?.available ?? 0, icon: CheckCircle2, color: 'var(--et-success)', bg: 'var(--et-success-bg)', href: '/equipment?status=available' },
    { label: 'Empruntés', value: stats?.borrowed ?? 0, icon: ArrowLeftRight, color: 'var(--et-info)', bg: 'var(--et-info-bg)', href: '/loans' },
    { label: 'En panne', value: stats?.broken ?? 0, icon: AlertCircle, color: 'var(--et-danger)', bg: 'var(--et-danger-bg)', href: '/equipment?status=broken' },
    { label: 'Maintenance', value: stats?.maintenance ?? 0, icon: Wrench, color: 'var(--et-warning)', bg: 'var(--et-warning-bg)', href: '/equipment?status=maintenance' },
    { label: 'Emprunts actifs', value: stats?.active_loans ?? 0, icon: Clock, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', href: '/loans' },
    { label: 'Emprunts en retard', value: stats?.overdue_loans ?? 0, icon: AlertTriangle, color: 'var(--et-danger)', bg: 'var(--et-danger-bg)', href: '/loans' },
  ];

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {AI_FEATURES_ENABLED && (
            <AIInsightsPanel
              stats={{ total: stats?.total ?? 0, available: stats?.available ?? 0, borrowed: stats?.borrowed ?? 0, broken: stats?.broken ?? 0, maintenance: stats?.maintenance ?? 0, active_loans: stats?.active_loans ?? 0 }}
              categories={categoriesForAI}
              recentLoans={recentLoans}
              recentIncidents={recentIncidents}
            />
          )}
          <Link href="/loans/new" className="btn btn-primary">
            <ArrowLeftRight className="w-4 h-4" /> Nouvel emprunt
          </Link>
          <Link href="/equipment/new" className="btn btn-secondary">
            <Plus className="w-4 h-4" /> Équipement
          </Link>
        </div>
      </div>

      <div className="px-4 md:px-7 space-y-5 pb-8">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, bg, href }) => (
            <Link key={label} href={href} className="stat-card">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-none" style={{ color: 'var(--et-text)' }}>{value}</p>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--et-text-muted)' }}>{label}</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">

          {/* Par catégorie */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: 'var(--et-text-muted)' }} />
                <h2 className="font-semibold text-sm" style={{ color: 'var(--et-text)' }}>Disponibilité par catégorie</h2>
              </div>
              <Link href="/categories" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--et-primary)' }}>
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {categories.length === 0 ? (
              <div className="empty-state py-6">
                <Layers className="empty-state-icon" />
                <p className="empty-state-title">Aucune catégorie</p>
                <Link href="/categories/new" className="btn btn-primary btn-sm mt-2">
                  <Plus className="w-3.5 h-3.5" /> Créer une catégorie
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {categories.map(cat => {
                  const cs = catStats[cat.id] ?? { total: 0, available: 0, borrowed: 0, broken: 0 };
                  const pct = cs.total > 0 ? Math.round((cs.available / cs.total) * 100) : 0;
                  return (
                    <Link key={cat.id} href={`/categories/${cat.id}`} className="block">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat.icon}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--et-text)' }}>{cat.name}</span>
                          <span className="eq-number">{cat.code}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--et-text-muted)' }}>
                          <span style={{ color: 'var(--et-success)', fontWeight: 600 }}>{cs.available} dispo</span>
                          <span>/ {cs.total}</span>
                        </div>
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
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Emprunts actifs */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: 'var(--et-text-muted)' }} />
                <h2 className="font-semibold text-sm" style={{ color: 'var(--et-text)' }}>Emprunts en cours</h2>
              </div>
              <Link href="/loans" className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--et-primary)' }}>
                Voir tout <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {recentLoans.length === 0 ? (
              <div className="empty-state py-6">
                <ArrowLeftRight className="empty-state-icon" />
                <p className="empty-state-title">Aucun emprunt actif</p>
                <Link href="/loans/new" className="btn btn-primary btn-sm mt-2">
                  <Plus className="w-3.5 h-3.5" /> Créer un emprunt
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLoans.map(loan => {
                  const count = loan.items?.length ?? 0;
                  const cats = [...new Set(loan.items?.map(i => i.equipment?.category?.name).filter(Boolean))];
                  return (
                    <Link key={loan.id} href={`/loans/${loan.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: 'var(--et-surface-2)' }}
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-full shrink-0 text-sm font-bold text-white"
                        style={{ background: 'var(--et-primary)' }}>
                        {loan.employee?.name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--et-text)' }}>
                          {loan.employee?.name ?? '—'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--et-text-muted)' }}>
                          {count} item{count > 1 ? 's' : ''} · {cats.join(', ') || '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs mb-1" style={{ color: 'var(--et-text-muted)' }}>
                          {format(new Date(loan.checkout_date), 'dd/MM', { locale: fr })}
                        </p>
                        <span className="badge badge-active">actif</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <p className="section-label">Actions rapides</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/loans/new', icon: ArrowLeftRight, label: 'Nouvel emprunt', color: 'var(--et-primary)', bg: 'var(--et-primary-light)' },
              { href: '/equipment/new', icon: Package, label: 'Ajouter équipement', color: 'var(--et-success)', bg: 'var(--et-success-bg)' },
              { href: '/employees/new', icon: Users, label: 'Ajouter employé', color: 'var(--et-info)', bg: 'var(--et-info-bg)' },
              { href: '/categories/new', icon: Layers, label: 'Créer catégorie', color: 'var(--et-warning)', bg: 'var(--et-warning-bg)' },
            ].map(({ href, icon: Icon, label, color, bg }) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl transition-all text-center"
                style={{ background: bg, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--et-text-secondary)' }}>{label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
