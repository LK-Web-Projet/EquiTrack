'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { getCategories, updateCategory } from '@/lib/api';
import { useRequireAdmin } from '@/lib/auth-context';
import type { Category } from '@/types';

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { loading: adminLoading, isAdmin } = useRequireAdmin();
  const [category, setCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', code: '', icon: '', color: '#3b82f6', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories().then(cats => {
      const cat = cats.find(c => c.id === id);
      if (!cat) { router.push('/categories'); return; }
      setCategory(cat);
      setForm({ name: cat.name, code: cat.code, icon: cat.icon, color: cat.color, description: cat.description ?? '' });
    }).catch(console.error).finally(() => setLoading(false));
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setError('Nom et code obligatoires.'); return; }
    setSaving(true);
    setError('');
    try {
      await updateCategory(id, {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        icon: form.icon || '📦',
        color: form.color,
        description: form.description.trim() || undefined,
      });
      router.push('/categories');
    } catch (e: unknown) {
      setError('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading || !isAdmin || loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="fade-in">
      <div className="page-header flex items-center gap-3">
        <Link href="/categories" className="btn btn-ghost btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Modifier la catégorie</h1>
          <p className="page-subtitle">{category.icon} {category.name}</p>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8">
        <div className="max-w-2xl mx-auto">
          {error && <div className="alert alert-danger mb-4">{error}</div>}

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
                <p className="font-semibold" style={{ color: 'var(--et-text)' }}>{form.name || 'Nom'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="eq-number">{form.code || 'CODE'}</span>
                  <span className="w-3 h-3 rounded-full" style={{ background: form.color }} />
                </div>
              </div>
            </div>

            <hr className="divider" />

            <div>
              <label className="et-label">Nom *</label>
              <input type="text" className="et-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
            </div>
            <div>
              <label className="et-label">Code * <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(max 5 caractères)</span></label>
              <input type="text" className="et-input" maxLength={5} value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} required style={{ fontFamily: 'monospace', fontWeight: 700 }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="et-label">Icône (emoji)</label>
                <input type="text" className="et-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} style={{ fontSize: '1.5rem', textAlign: 'center' }} />
              </div>
              <div>
                <label className="et-label">Couleur</label>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="et-input" style={{ padding: '0.25rem', height: '2.75rem', cursor: 'pointer' }} />
              </div>
            </div>
            <div>
              <label className="et-label">Description <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
              <textarea className="et-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link href="/categories" className="btn btn-secondary flex-1 justify-center">Annuler</Link>
              <button type="submit" disabled={saving} className="btn btn-primary flex-1 justify-center">
                {saving ? <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Save className="w-4 h-4" />}
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
