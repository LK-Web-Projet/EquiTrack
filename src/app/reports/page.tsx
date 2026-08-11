'use client';

import { useState } from 'react';
import { Download, Package, ArrowLeftRight, AlertTriangle, Clock, Layers, Building2, User, Calendar } from 'lucide-react';
import { getEquipment, getLoans, getCategories, getDepartments, getEmployees } from '@/lib/supabase';
import { useRequireAdmin } from '@/lib/auth-context';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const HEADER_COLOR: [number, number, number] = [59, 130, 246];
const TODAY = format(new Date(), 'dd MMMM yyyy', { locale: fr });

async function generatePDF(title: string, columns: string[], rows: string[][], subtitle?: string) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(...HEADER_COLOR);
  doc.rect(0, 0, 297, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('EquiTrack', 14, 10);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`— ${title}`, 50, 10);
  doc.setFontSize(9);
  doc.text(`Généré le ${TODAY}`, 14, 17);
  if (subtitle) doc.text(subtitle, 297 - 14, 17, { align: 'right' });

  autoTable(doc, {
    startY: 26,
    head: [columns],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: HEADER_COLOR, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`equitrack-${title.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export default function ReportsPage() {
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [loading, setLoading] = useState<string | null>(null);
  const [empFilter, setEmpFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');

  const run = async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    setError('');
    try {
      await fn();
    } catch (e: unknown) {
      setError('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(null);
    }
  };

  const reports = [
    {
      key: 'inventory',
      icon: Package,
      title: 'Inventaire Général',
      description: 'Liste complète de tous les équipements avec leur statut et état.',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.08)',
      extraUI: null as React.ReactNode,
      action: () => run('inventory', async () => {
        const equip = await getEquipment();
        const STATUS_FR: Record<string, string> = { available: 'Disponible', borrowed: 'Emprunté', broken: 'En panne', maintenance: 'En maintenance' };
        const COND_FR: Record<string, string> = { good: 'Bon état', fair: 'Correct', poor: 'Mauvais état' };
        const rows = equip.map(e => [
          `${e.category?.code}-${e.display_number}`,
          e.category?.name ?? '—',
          e.serial_number ?? '—',
          STATUS_FR[e.status] ?? e.status,
          COND_FR[e.condition] ?? e.condition,
          e.location ?? '—',
          e.acquisition_date ? format(new Date(e.acquisition_date), 'dd/MM/yyyy') : '—',
        ]);
        await generatePDF('Inventaire Général', ['Numéro', 'Catégorie', 'N° Série', 'Statut', 'État', 'Localisation', 'Acquisition'], rows, `${equip.length} équipements`);
      }),
    },
    {
      key: 'active-loans',
      icon: ArrowLeftRight,
      title: 'Emprunts Actifs',
      description: 'Qui a quoi en ce moment — liste de tous les emprunts en cours.',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.08)',
      extraUI: null as React.ReactNode,
      action: () => run('active-loans', async () => {
        const loans = await getLoans('active');
        const rows: string[][] = [];
        for (const loan of loans) {
          for (const item of loan.items ?? []) {
            rows.push([
              loan.employee?.name ?? '—',
              loan.employee?.department?.name ?? '—',
              `${item.equipment?.category?.code}-${item.equipment?.display_number}`,
              item.equipment?.category?.name ?? '—',
              format(new Date(loan.checkout_date), 'dd/MM/yyyy'),
              loan.expected_return_date ? format(new Date(loan.expected_return_date), 'dd/MM/yyyy') : '—',
            ]);
          }
        }
        await generatePDF('Emprunts Actifs', ['Employé', 'Service', 'Équipement', 'Catégorie', 'Date emprunt', 'Retour prévu'], rows, `${loans.length} emprunts actifs`);
      }),
    },
    {
      key: 'broken',
      icon: AlertTriangle,
      title: 'Équipements en Panne',
      description: 'Liste de tous les équipements avec le statut "En panne".',
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.08)',
      extraUI: null as React.ReactNode,
      action: () => run('broken', async () => {
        const equip = await getEquipment({ status: 'broken' });
        const rows = equip.map(e => [
          `${e.category?.code}-${e.display_number}`,
          e.category?.name ?? '—',
          e.serial_number ?? '—',
          e.location ?? '—',
          e.description ?? '—',
        ]);
        await generatePDF('Équipements en Panne', ['Numéro', 'Catégorie', 'N° Série', 'Localisation', 'Description'], rows, `${equip.length} équipements en panne`);
      }),
    },
    {
      key: 'period',
      icon: Clock,
      title: 'Historique sur Période',
      description: 'Tous les emprunts dans une plage de dates sélectionnée.',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
      get extraUI() {
        return (
          <div className="flex gap-2 mt-3 flex-wrap">
            <input type="date" className="et-input" style={{ width: '140px', fontSize: '0.8rem' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{ color: 'var(--et-text-muted)', alignSelf: 'center' }}>→</span>
            <input type="date" className="et-input" style={{ width: '140px', fontSize: '0.8rem' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        );
      },
      action: () => run('period', async () => {
        const loans = await getLoans();
        const filtered = loans.filter(l => {
          const d = l.checkout_date;
          return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
        });
        const rows: string[][] = [];
        for (const loan of filtered) {
          rows.push([
            loan.employee?.name ?? '—',
            loan.employee?.department?.name ?? '—',
            String(loan.items?.length ?? 0),
            format(new Date(loan.checkout_date), 'dd/MM/yyyy'),
            loan.return_date ? format(new Date(loan.return_date), 'dd/MM/yyyy') : '—',
            loan.status === 'active' ? 'Actif' : 'Retourné',
          ]);
        }
        const range = dateFrom || dateTo ? `${dateFrom || '…'} → ${dateTo || '…'}` : 'toutes dates';
        await generatePDF('Historique Emprunts', ['Employé', 'Service', 'Nb items', 'Date emprunt', 'Date retour', 'Statut'], rows, range);
      }),
    },
    {
      key: 'by-category',
      icon: Layers,
      title: 'Rapport par Catégorie',
      description: 'Statistiques de disponibilité et d\'utilisation par catégorie.',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.08)',
      extraUI: null as React.ReactNode,
      action: () => run('by-category', async () => {
        const [cats, equip] = await Promise.all([getCategories(), getEquipment()]);
        const rows = cats.map(cat => {
          const items = equip.filter(e => e.category_id === cat.id);
          const available = items.filter(e => e.status === 'available').length;
          const borrowed = items.filter(e => e.status === 'borrowed').length;
          const broken = items.filter(e => e.status === 'broken').length;
          const maintenance = items.filter(e => e.status === 'maintenance').length;
          const pct = items.length > 0 ? Math.round((available / items.length) * 100) : 0;
          return [cat.name, cat.code, String(items.length), String(available), String(borrowed), String(broken), String(maintenance), `${pct}%`];
        });
        await generatePDF('Rapport par Catégorie', ['Catégorie', 'Code', 'Total', 'Disponibles', 'Empruntés', 'En panne', 'Maintenance', 'Dispo %'], rows);
      }),
    },
    {
      key: 'by-department',
      icon: Building2,
      title: 'Rapport par Service',
      description: 'Utilisation des équipements par service / département.',
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.08)',
      extraUI: null as React.ReactNode,
      action: () => run('by-department', async () => {
        const [depts, loans, emps] = await Promise.all([getDepartments(), getLoans(), getEmployees()]);
        const rows = depts.map(dept => {
          const deptEmps = emps.filter(e => e.department_id === dept.id);
          const deptEmpIds = new Set(deptEmps.map(e => e.id));
          const deptLoans = loans.filter(l => deptEmpIds.has(l.employee_id));
          const active = deptLoans.filter(l => l.status === 'active').length;
          const totalItems = deptLoans.reduce((s, l) => s + (l.items?.length ?? 0), 0);
          return [dept.name, String(deptEmps.length), String(deptLoans.length), String(active), String(totalItems)];
        });
        await generatePDF('Rapport par Service', ['Service', 'Employés', 'Total emprunts', 'Emprunts actifs', 'Total items empruntés'], rows);
      }),
    },
    {
      key: 'by-employee',
      icon: User,
      title: 'Rapport par Employé',
      description: 'Historique détaillé pour un employé sélectionné.',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,0.08)',
      get extraUI() {
        return (
          <div className="mt-3">
            <input
              type="text"
              className="et-input"
              style={{ fontSize: '0.8rem' }}
              placeholder="Filtrer par nom d'employé…"
              value={empFilter}
              onChange={e => setEmpFilter(e.target.value)}
            />
          </div>
        );
      },
      action: () => run('by-employee', async () => {
        const [loans, emps] = await Promise.all([getLoans(), getEmployees()]);
        const q = empFilter.trim().toLowerCase();
        const matchingEmps = q ? emps.filter(e => e.name.toLowerCase().includes(q)) : emps;
        const matchingIds = new Set(matchingEmps.map(e => e.id));
        const filtered = loans.filter(l => matchingIds.has(l.employee_id));
        const rows: string[][] = [];
        for (const loan of filtered) {
          for (const item of loan.items ?? []) {
            rows.push([
              loan.employee?.name ?? '—',
              loan.employee?.department?.name ?? '—',
              `${item.equipment?.category?.code}-${item.equipment?.display_number}`,
              item.equipment?.category?.name ?? '—',
              format(new Date(loan.checkout_date), 'dd/MM/yyyy'),
              loan.return_date ? format(new Date(loan.return_date), 'dd/MM/yyyy') : '—',
              loan.status === 'active' ? 'Actif' : 'Retourné',
            ]);
          }
        }
        await generatePDF('Rapport par Employé', ['Employé', 'Service', 'Équipement', 'Catégorie', 'Date emprunt', 'Retour', 'Statut'], rows, q ? `Filtre: "${q}"` : 'Tous les employés');
      }),
    },
  ];

  if (adminLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Rapports</h1>
        <p className="page-subtitle">Générez des rapports PDF à partir des données en temps réel</p>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-4">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="alert alert-info">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>Les rapports sont générés à partir des données actuelles et exportés en PDF. Date : {TODAY}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map(({ key, icon: Icon, title, description, color, bg, action, extraUI }) => (
            <div key={key} className="card p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                  style={{ background: bg }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--et-text)' }}>{title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>{description}</p>
                </div>
              </div>

              {extraUI && <div>{extraUI}</div>}

              <button
                onClick={action}
                disabled={loading === key}
                className="btn btn-secondary btn-sm w-full justify-center mt-auto"
              >
                {loading === key ? (
                  <div className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {loading === key ? 'Génération…' : 'Générer PDF'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
