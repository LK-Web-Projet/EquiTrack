'use client';

import { useState, useEffect } from 'react';
import { Info, Database, Download, Upload, CheckCircle2, XCircle, Loader } from 'lucide-react';
import { supabase, getCategories, getDepartments, getEmployees, getEquipment, getLoans } from '@/lib/supabase';
import { useRequireAdmin } from '@/lib/auth-context';

const APP_VERSION = '1.0.0';

type DbStatus = 'idle' | 'checking' | 'ok' | 'error';

export default function SettingsPage() {
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [dbStatus, setDbStatus] = useState<DbStatus>('idle');
  const [dbError, setDbError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    setSupabaseUrl(url);
  }, []);

  const maskUrl = (url: string) => {
    if (!url) return '(non configurée)';
    try {
      const u = new URL(url);
      return `${u.protocol}//***.${u.hostname.split('.').slice(-2).join('.')}`;
    } catch {
      return url.slice(0, 20) + '***';
    }
  };

  const testConnection = async () => {
    setDbStatus('checking');
    setDbError('');
    try {
      const { error } = await supabase.from('categories').select('id').limit(1);
      if (error) throw error;
      setDbStatus('ok');
    } catch (e: unknown) {
      setDbStatus('error');
      setDbError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const [categories, departments, employees, equipment, loans] = await Promise.all([
        getCategories(),
        getDepartments(),
        getEmployees(),
        getEquipment(),
        getLoans(),
      ]);
      const backup = {
        version: APP_VERSION,
        exported_at: new Date().toISOString(),
        data: { categories, departments, employees, equipment, loans },
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equitrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setExportError('Erreur export : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult('');
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.data) throw new Error('Format de fichier invalide');
      const { categories, departments, employees, equipment } = backup.data;
      let count = 0;

      if (Array.isArray(categories)) {
        for (const cat of categories) {
          await supabase.from('categories').upsert(cat, { onConflict: 'id' });
          count++;
        }
      }
      if (Array.isArray(departments)) {
        for (const dept of departments) {
          await supabase.from('departments').upsert(dept, { onConflict: 'id' });
          count++;
        }
      }
      if (Array.isArray(employees)) {
        for (const emp of employees) {
          const { department, ...rest } = emp;
          void department;
          await supabase.from('employees').upsert(rest, { onConflict: 'id' });
          count++;
        }
      }
      if (Array.isArray(equipment)) {
        for (const eq of equipment) {
          const { category, ...rest } = eq;
          void category;
          await supabase.from('equipment').upsert(rest, { onConflict: 'id' });
          count++;
        }
      }
      setImportResult(`Import réussi : ${count} enregistrements restaurés.`);
    } catch (err: unknown) {
      setImportResult('Erreur import : ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const SECTIONS = [
    {
      key: 'general',
      icon: Info,
      title: 'Général',
      color: '#3b82f6',
      content: (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl" style={{ background: 'var(--et-surface-2)' }}>
              <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>Application</p>
              <p className="font-semibold mt-1" style={{ color: 'var(--et-text)' }}>EquiTrack</p>
              <p className="text-sm" style={{ color: 'var(--et-text-muted)' }}>Gestion des emprunts d'équipements</p>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--et-surface-2)' }}>
              <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>Version</p>
              <p className="font-semibold mt-1 font-mono" style={{ color: 'var(--et-text)' }}>v{APP_VERSION}</p>
              <p className="text-sm" style={{ color: 'var(--et-text-muted)' }}>Next.js 16 + Supabase</p>
            </div>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--et-surface-2)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--et-text-muted)' }}>Stack technique</p>
            <div className="flex flex-wrap gap-2">
              {['Next.js 16', 'React 19', 'Supabase', 'TypeScript', 'Tailwind CSS v4', 'jsPDF', 'date-fns'].map(t => (
                <span key={t} className="badge badge-neutral">{t}</span>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'database',
      icon: Database,
      title: 'Base de données',
      color: '#10b981',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--et-surface-2)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--et-text-muted)' }}>URL Supabase (masquée)</p>
            <p className="font-mono text-sm" style={{ color: 'var(--et-text)' }}>{maskUrl(supabaseUrl)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={testConnection}
              disabled={dbStatus === 'checking'}
              className="btn btn-secondary btn-sm"
            >
              {dbStatus === 'checking' ? (
                <div className="spinner" style={{ width: '0.875rem', height: '0.875rem' }} />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              {dbStatus === 'checking' ? 'Test en cours…' : 'Tester la connexion'}
            </button>
            {dbStatus === 'ok' && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--et-success)' }} />
                <span className="text-sm" style={{ color: 'var(--et-success-text)' }}>Connexion réussie</span>
              </div>
            )}
            {dbStatus === 'error' && (
              <div className="flex items-center gap-1.5">
                <XCircle className="w-4 h-4" style={{ color: 'var(--et-danger)' }} />
                <span className="text-sm" style={{ color: 'var(--et-danger-text)' }}>Erreur : {dbError}</span>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'data',
      icon: Download,
      title: 'Données',
      color: '#8b5cf6',
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--et-surface-2)' }}>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--et-text)' }}>Exporter les données</p>
              <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>
                Télécharge un fichier JSON contenant toutes les catégories, services, employés, équipements et emprunts.
              </p>
            </div>
            <button onClick={handleExport} disabled={exporting} className="btn btn-secondary btn-sm">
              {exporting ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {exporting ? 'Export en cours…' : 'Exporter JSON'}
            </button>
            {exportError && <div className="alert alert-danger">{exportError}</div>}
          </div>

          <div className="p-4 rounded-xl space-y-3" style={{ background: 'var(--et-surface-2)' }}>
            <div>
              <p className="font-medium text-sm" style={{ color: 'var(--et-text)' }}>Importer des données</p>
              <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>
                Restaure les données depuis un fichier JSON exporté. Les enregistrements existants avec le même ID seront mis à jour (upsert).
              </p>
            </div>
            <label className="btn btn-secondary btn-sm cursor-pointer">
              {importing ? (
                <Loader className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {importing ? 'Import en cours…' : 'Importer JSON'}
              <input type="file" accept=".json" className="sr-only" onChange={handleImport} disabled={importing} />
            </label>
            {importResult && (
              <div className={`alert ${importResult.startsWith('Erreur') ? 'alert-danger' : 'alert-success'}`}>
                {importResult}
              </div>
            )}
          </div>
        </div>
      ),
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
        <h1 className="page-title">Paramètres</h1>
        <p className="page-subtitle">Configuration et gestion de l'application</p>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-5 max-w-4xl mx-auto">
        {SECTIONS.map(({ key, icon: Icon, title, color, content }) => (
          <div key={key} className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl"
                style={{ background: color + '14' }}
              >
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <h2 className="font-semibold" style={{ color: 'var(--et-text)' }}>{title}</h2>
            </div>
            <hr className="divider" />
            {content}
          </div>
        ))}
      </div>
    </div>
  );
}
