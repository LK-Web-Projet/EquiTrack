'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Package, Camera, Upload, X } from 'lucide-react';
import { getCategories, getNextSequentialNumber, createEquipment, uploadEquipmentPhoto } from '@/lib/api';
import CameraCapture from '@/components/ui/CameraCapture';
import type { Category } from '@/types';

export default function NewEquipmentPage() {
  return (
    <Suspense fallback={null}>
      <NewEquipmentForm />
    </Suspense>
  );
}

function NewEquipmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCat = searchParams.get('category') ?? '';

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    category_id: preselectedCat,
    quantity: 1,
    serial_number: '',
    condition: 'good' as 'good' | 'fair' | 'poor',
    location: '',
    description: '',
    acquisition_date: '',
  });
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [nextPreview, setNextPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);
  const [error, setError] = useState('');

  // Photos (uniquement pour la création d'un seul équipement)
  const [photos, setPhotos] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotos(p => [...p, reader.result as string]);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos(p => p.filter((_, i) => i !== index));
  };

  useEffect(() => {
    getCategories()
      .then(cats => {
        setCategories(cats);
        if (!preselectedCat && cats.length > 0) {
          setForm(f => ({ ...f, category_id: cats[0].id }));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCats(false));
  }, [preselectedCat]);

  useEffect(() => {
    if (!form.category_id) { setNextNumber(null); setNextPreview(''); return; }
    const cat = categories.find(c => c.id === form.category_id);
    if (!cat) return;
    getNextSequentialNumber(form.category_id).then(n => {
      setNextNumber(n);
      setNextPreview(`${cat.code}-${String(n).padStart(3, '0')}`);
    }).catch(console.error);
  }, [form.category_id, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_id) { setError('Veuillez sélectionner une catégorie.'); return; }
    setLoading(true);
    setError('');
    try {
      const qty = Math.max(1, Math.min(50, form.quantity));
      const startNum = nextNumber ?? 1;
      let createdId: string | null = null;
      for (let i = 0; i < qty; i++) {
        const seqNum = startNum + i;
        const created = await createEquipment({
          category_id: form.category_id,
          sequential_number: seqNum,
          display_number: String(seqNum).padStart(3, '0'),
          serial_number: qty === 1 && form.serial_number.trim() ? form.serial_number.trim() : undefined,
          status: 'available',
          condition: form.condition,
          location: form.location.trim() || undefined,
          description: form.description.trim() || undefined,
          acquisition_date: form.acquisition_date || undefined,
        });
        createdId = created.id;
      }

      if (qty === 1 && createdId && photos.length > 0) {
        for (const photo of photos) {
          await uploadEquipmentPhoto(createdId, photo);
        }
      }

      router.push(`/categories/${form.category_id}`);
    } catch (e: unknown) {
      setError('Erreur lors de la création : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (loadingCats) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    );
  }

  const selectedCat = categories.find(c => c.id === form.category_id);

  return (
    <div className="fade-in">
      <div className="page-header flex items-center gap-3">
        <Link href="/equipment" className="btn btn-ghost btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Ajouter un équipement</h1>
          <p className="page-subtitle">Enregistrez un ou plusieurs équipements</p>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8">
        <div className="max-w-2xl mx-auto">
          {error && <div className="alert alert-danger mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="card p-6 space-y-5">

            {/* Preview */}
            {selectedCat && nextPreview && (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--et-primary-light)', border: '1px solid var(--et-primary-muted)' }}>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl text-xl" style={{ background: selectedCat.color + '18' }}>
                  {selectedCat.icon}
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--et-primary)', fontWeight: 600 }}>Prochain numéro</p>
                  <p className="eq-number text-base mt-0.5">{nextPreview}</p>
                  {form.quantity > 1 && (
                    <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>
                      Jusqu&apos;à {selectedCat.code}-{String((nextNumber ?? 1) + form.quantity - 1).padStart(3, '0')} ({form.quantity} équipements)
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="et-label">Catégorie <span style={{ color: 'var(--et-danger)' }}>*</span></label>
              {categories.length === 0 ? (
                <div className="alert alert-warning">
                  <Package className="w-4 h-4 shrink-0" />
                  Aucune catégorie. <Link href="/categories/new" style={{ textDecoration: 'underline' }}>Créez-en une d&apos;abord.</Link>
                </div>
              ) : (
                <select
                  className="et-select"
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  required
                >
                  <option value="">Sélectionner une catégorie…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name} ({c.code})</option>)}
                </select>
              )}
            </div>

            <div>
              <label className="et-label">Nombre à ajouter</label>
              <input
                type="number"
                className="et-input"
                min={1}
                max={50}
                value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>Min 1, max 50. Utilisez &gt; 1 pour créer plusieurs équipements en lot.</p>
            </div>

            {form.quantity === 1 && (
              <div>
                <label className="et-label">N° de série <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                <input
                  type="text"
                  className="et-input"
                  placeholder="Ex: SN-2024-001"
                  value={form.serial_number}
                  onChange={e => setForm(f => ({ ...f, serial_number: e.target.value }))}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            )}

            {form.quantity === 1 && (
              <div>
                <label className="et-label">Photos <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {photos.map((src, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--et-border)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.6)' }}
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  <button type="button" onClick={() => setShowCamera(true)} className="btn btn-secondary btn-sm">
                    <Camera className="w-3.5 h-3.5" /> Prendre une photo
                  </button>
                  <label className="btn btn-secondary btn-sm cursor-pointer">
                    <Upload className="w-3.5 h-3.5" /> Choisir un fichier
                    <input type="file" accept="image/*" className="sr-only" onChange={handleFileSelect} />
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="et-label">État initial</label>
              <select
                className="et-select"
                value={form.condition}
                onChange={e => setForm(f => ({ ...f, condition: e.target.value as 'good' | 'fair' | 'poor' }))}
              >
                <option value="good">Bon état</option>
                <option value="fair">Correct</option>
                <option value="poor">Mauvais état</option>
              </select>
            </div>

            <div>
              <label className="et-label">Localisation <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
              <input
                type="text"
                className="et-input"
                placeholder="Ex: Entrepôt A, Bureau 3…"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>

            <div>
              <label className="et-label">Description <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
              <textarea
                className="et-textarea"
                placeholder="Notes supplémentaires…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <label className="et-label">Date d&apos;acquisition <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
              <input
                type="date"
                className="et-input"
                value={form.acquisition_date}
                onChange={e => setForm(f => ({ ...f, acquisition_date: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link href="/equipment" className="btn btn-secondary flex-1 justify-center">Annuler</Link>
              <button type="submit" disabled={loading || !form.category_id} className="btn btn-primary flex-1 justify-center">
                {loading ? (
                  <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                ) : <Save className="w-4 h-4" />}
                {loading ? 'Ajout en cours…' : form.quantity > 1 ? `Ajouter ${form.quantity} équipements` : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => setPhotos(p => [...p, dataUrl])}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
