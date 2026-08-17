'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { createCategory } from '@/lib/api';
import { useRequireAdmin } from '@/lib/auth-context';

export default function NewCategoryPage() {
  const router = useRouter();
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [form, setForm] = useState({
    name: '',
    code: '',
    icon: '📦',
    color: '#3b82f6',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setError('Le nom et le code sont obligatoires.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await createCategory({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        icon: form.icon || '📦',
        color: form.color,
        description: form.description.trim() || undefined,
      });
      router.push('/categories');
    } catch (e: unknown) {
      setError('Erreur lors de la création : ' + (e instanceof Error ? e.message : String(e)));
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
        <Link href="/categories" className="btn btn-ghost btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Nouvelle catégorie</h1>
          <p className="page-subtitle">Renseignez les informations de la catégorie</p>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="alert alert-danger mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="card p-6 space-y-5">

            {/* Preview */}
            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--et-surface-2)' }}>
              <div
                className="flex items-center justify-center w-14 h-14 rounded-xl text-3xl"
                style={{ background: form.color + '18', border: `2px solid ${form.color}30` }}
              >
                {form.icon || '📦'}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--et-text)' }}>{form.name || 'Nom de la catégorie'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="eq-number">{form.code || 'CODE'}</span>
                  <span className="w-3 h-3 rounded-full" style={{ background: form.color }} />
                </div>
              </div>
            </div>

            <hr className="divider" />

            <div>
              <label htmlFor="cat-name" className="et-label">Nom <span style={{ color: 'var(--et-danger)' }}>*</span></label>
              <input
                id="cat-name"
                type="text"
                className="et-input"
                placeholder="Ex: Vélos, Ordinateurs, Outillage…"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="cat-code" className="et-label">
                Code <span style={{ color: 'var(--et-danger)' }}>*</span>
                <span style={{ color: 'var(--et-text-muted)', fontWeight: 400, marginLeft: '0.5rem' }}>(max. 5 caractères, ex: VEL)</span>
              </label>
              <input
                id="cat-code"
                type="text"
                className="et-input"
                placeholder="Ex: VEL"
                value={form.code}
                maxLength={5}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
                style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cat-icon" className="et-label">Icône (emoji)</label>
                <input
                  id="cat-icon"
                  type="text"
                  className="et-input"
                  placeholder="📦"
                  value={form.icon}
                  onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  style={{ fontSize: '1.5rem', textAlign: 'center' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>Tapez ou collez un emoji</p>
              </div>
              <div>
                <label htmlFor="cat-color" className="et-label">Couleur</label>
                <div className="flex items-center gap-3">
                  <input
                    id="cat-color"
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="et-input"
                    style={{ padding: '0.25rem', height: '2.75rem', cursor: 'pointer' }}
                  />
                  <span className="text-sm font-mono" style={{ color: 'var(--et-text-secondary)' }}>{form.color}</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="cat-description" className="et-label">Description <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
              <textarea
                id="cat-description"
                className="et-textarea"
                placeholder="Description de la catégorie…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link href="/categories" className="btn btn-secondary flex-1 justify-center">
                Annuler
              </Link>
              <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">
                {loading ? <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Save className="w-4 h-4" />}
                {loading ? 'Enregistrement…' : 'Créer la catégorie'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
