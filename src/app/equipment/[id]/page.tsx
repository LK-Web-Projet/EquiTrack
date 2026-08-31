'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Trash2, MapPin, Calendar, Tag,
  AlertTriangle, Wrench, Plus, CheckCircle2, X, Clock, Sparkles,
  Camera, Upload, Images
} from 'lucide-react';
import {
  getEquipmentItem, updateEquipment, deleteEquipment,
  getIncidents, createIncident, resolveIncident, deleteIncident,
  getMaintenances, createMaintenance, deleteMaintenance,
  getEquipmentPhotos, uploadEquipmentPhoto, deleteEquipmentPhoto,
  getEquipmentLoanHistory, getEquipmentChecklist,
} from '@/lib/api';
import type { Incident, Maintenance, EquipmentPhoto } from '@/lib/api';
import { QRCodeCard } from '@/components/ui/QRCodeCard';
import CameraCapture from '@/components/ui/CameraCapture';
import ImageModal from '@/components/ui/ImageModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ChecklistRatingList from '@/components/ui/ChecklistRatingList';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { AI_FEATURES_ENABLED } from '@/lib/config';
import { CONDITION_LABELS, CONDITION_BADGE } from '@/lib/constants';
import type { Equipment, EquipmentStatus, EquipmentCondition, ChecklistItemWithState } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  available: 'Disponible', borrowed: 'Emprunté',
  broken: 'En panne', maintenance: 'En maintenance',
};
const STATUS_BADGE: Record<EquipmentStatus, string> = {
  available: 'badge badge-available', borrowed: 'badge badge-borrowed',
  broken: 'badge badge-broken', maintenance: 'badge badge-maintenance',
};
const RETURN_LABELS = { good: 'Bon état', broken: 'En panne', damaged: 'Endommagé' };

interface LoanHistoryRow {
  loan_id: string; employee_name: string; department_name?: string;
  checkout_date: string; return_date?: string; status: string; return_condition?: string;
}

export default function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [history, setHistory] = useState<LoanHistoryRow[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<EquipmentPhoto[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<EquipmentPhoto | null>(null);

  // Statut
  const [changingStatus, setChangingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<EquipmentStatus>('available');
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteEquipment, setConfirmDeleteEquipment] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<EquipmentPhoto | null>(null);
  const [incidentToDelete, setIncidentToDelete] = useState<Incident | null>(null);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<Maintenance | null>(null);

  // Incident form
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incForm, setIncForm] = useState({ description: '', reported_by: '', reported_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm') });
  const [savingInc, setSavingInc] = useState(false);

  // AI Diagnosis
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<Record<string, unknown> | null>(null);

  // Maintenance form
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [maintForm, setMaintForm] = useState({ description: '', performed_by: '', performed_at: format(new Date(), 'yyyy-MM-dd'), cost: '' });
  const [savingMaint, setSavingMaint] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemWithState[]>([]);
  const [checklistValues, setChecklistValues] = useState<Record<string, EquipmentCondition>>({});

  const loadChecklist = async () => {
    const items = await getEquipmentChecklist(id);
    setChecklistItems(items);
    setChecklistValues(Object.fromEntries(items.map(i => [i.id, i.last_state])));
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const eq = await getEquipmentItem(id);
        setEquipment(eq);
        setNewStatus(eq.status);

        const [loanData, incs, maints, pics, checklist] = await Promise.all([
          getEquipmentLoanHistory(id),
          getIncidents(id),
          getMaintenances(id),
          getEquipmentPhotos(id),
          getEquipmentChecklist(id),
        ]);

        setHistory(loanData.map(d => ({
          loan_id: d.loan_id, employee_name: d.loan?.employee?.name ?? '—',
          department_name: d.loan?.employee?.department?.name, checkout_date: d.loan?.checkout_date,
          return_date: d.loan?.return_date, status: d.loan?.status, return_condition: d.return_condition,
        })));
        setIncidents(incs);
        setMaintenances(maints);
        setPhotos(pics);
        setChecklistItems(checklist);
        setChecklistValues(Object.fromEntries(checklist.map(i => [i.id, i.last_state])));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleStatusChange = async () => {
    if (!equipment || newStatus === equipment.status) return;
    setChangingStatus(true);
    try {
      const updated = await updateEquipment(id, { status: newStatus });
      setEquipment(updated);
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); }
    finally { setChangingStatus(false); }
  };

  const handleDelete = async () => {
    if (!equipment) return;
    setConfirmDeleteEquipment(false);
    setDeleting(true);
    try {
      await deleteEquipment(id);
      router.push(`/categories/${equipment.category_id}`);
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); setDeleting(false); }
  };

  // ── Photos ──
  const handleAddPhoto = async (dataUrl: string) => {
    setUploadingPhoto(true);
    try {
      const photo = await uploadEquipmentPhoto(id, dataUrl);
      setPhotos(prev => [...prev, photo]);
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); }
    finally { setUploadingPhoto(false); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => handleAddPhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    const photo = photoToDelete;
    setPhotoToDelete(null);
    try {
      await deleteEquipmentPhoto(photo);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); }
  };

  // ── Incidents ──
  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incForm.description.trim()) return;
    setSavingInc(true);
    try {
      const inc = await createIncident({
        equipment_id: id,
        description: incForm.description.trim(),
        reported_by: incForm.reported_by.trim() || undefined,
        reported_at: new Date(incForm.reported_at).toISOString(),
      });
      setIncidents(prev => [inc, ...prev]);
      setIncForm({ description: '', reported_by: '', reported_at: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm') });
      setShowIncidentForm(false);
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); }
    finally { setSavingInc(false); }
  };

  const handleDiagnose = async () => {
    if (!incForm.description.trim() || !equipment) return;
    setDiagnosing(true);
    setDiagnosis(null);
    try {
      const res = await fetch('/api/ai/incident-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: incForm.description,
          equipmentName: `${equipment.category?.code}-${equipment.display_number}`,
          categoryName: equipment.category?.name ?? '',
          condition: equipment.condition,
          history: incidents.slice(0, 5),
        }),
      });
      const data = await res.json();
      if (data.success) setDiagnosis(data.diagnosis);
    } catch {
      // silently fail — diagnosis is optional
    } finally {
      setDiagnosing(false);
    }
  };

  const handleResolveIncident = async (incId: string) => {
    try {
      const updated = await resolveIncident(incId);
      setIncidents(prev => prev.map(i => i.id === incId ? updated : i));
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); }
  };

  const handleDeleteIncident = async () => {
    if (!incidentToDelete) return;
    const incId = incidentToDelete.id;
    setIncidentToDelete(null);
    try {
      await deleteIncident(incId);
      setIncidents(prev => prev.filter(i => i.id !== incId));
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); }
  };

  // ── Maintenances ──
  const handleAddMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maintForm.description.trim()) return;
    setSavingMaint(true);
    try {
      const m = await createMaintenance({
        equipment_id: id,
        description: maintForm.description.trim(),
        performed_by: maintForm.performed_by.trim() || undefined,
        performed_at: maintForm.performed_at,
        cost: maintForm.cost ? parseFloat(maintForm.cost) : undefined,
        checklist: checklistItems.map(i => ({ checklist_item_id: i.id, state: checklistValues[i.id] ?? i.last_state })),
      });
      setMaintenances(prev => [m, ...prev]);
      setMaintForm({ description: '', performed_by: '', performed_at: format(new Date(), 'yyyy-MM-dd'), cost: '' });
      setShowMaintenanceForm(false);
      // Recharge l'équipement (le badge d'état doit refléter le recalcul de condition) et la
      // checklist (préremplissage du prochain formulaire avec le nouvel état connu).
      const [updatedEquipment] = await Promise.all([getEquipmentItem(id), loadChecklist()]);
      setEquipment(updatedEquipment);
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); }
    finally { setSavingMaint(false); }
  };

  const handleDeleteMaintenance = async () => {
    if (!maintenanceToDelete) return;
    const mId = maintenanceToDelete.id;
    setMaintenanceToDelete(null);
    try {
      await deleteMaintenance(mId);
      setMaintenances(prev => prev.filter(m => m.id !== mId));
    } catch (e) { toast.error('Erreur : ' + (e instanceof Error ? e.message : String(e))); }
  };

  if (loading) return <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}><div className="spinner" style={{ width: '2rem', height: '2rem' }} /></div>;

  if (notFound || !equipment) return (
    <div className="fade-in px-4 md:px-7 pt-8">
      <div className="card p-8 text-center">
        <p className="text-lg font-semibold" style={{ color: 'var(--et-text)' }}>Équipement introuvable</p>
        <Link href="/equipment" className="btn btn-primary btn-sm mt-4"><ArrowLeft className="w-4 h-4" /> Retour</Link>
      </div>
    </div>
  );

  const cat = equipment.category;
  const displayNum = `${cat?.code ?? '???'}-${equipment.display_number}`;

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div className="page-header flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push(`/categories/${equipment.category_id}`)} className="btn btn-ghost btn-icon">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">{displayNum}</h1>
              <span className={STATUS_BADGE[equipment.status]}>{STATUS_LABELS[equipment.status]}</span>
              <span className={CONDITION_BADGE[equipment.condition]}>{CONDITION_LABELS[equipment.condition]}</span>
            </div>
            {cat && <p className="page-subtitle">{cat.icon} {cat.name}</p>}
          </div>
        </div>
        <button onClick={() => setConfirmDeleteEquipment(true)} disabled={deleting} className="btn btn-danger btn-sm">
          {deleting ? <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Trash2 className="w-3.5 h-3.5" />}
          Supprimer
        </button>
      </div>

      <div className="px-4 md:px-7 pb-8 space-y-5">

        {/* ── Infos + Statut + QR Code ── */}
        <div className="grid md:grid-cols-3 gap-5">

          {/* Informations */}
          <div className="card p-5 space-y-4">
            <p className="section-label">Informations</p>
            <div className="space-y-3">
              {[
                { icon: Tag, label: 'Numéro', value: <span className="eq-number">{displayNum}</span> },
                { icon: Tag, label: 'N° de série', value: equipment.serial_number ? <span style={{ fontFamily: 'monospace' }}>{equipment.serial_number}</span> : <span style={{ color: 'var(--et-text-muted)' }}>—</span> },
                { icon: MapPin, label: 'Localisation', value: equipment.location || <span style={{ color: 'var(--et-text-muted)' }}>—</span> },
                { icon: Calendar, label: 'Acquisition', value: equipment.acquisition_date ? format(new Date(equipment.acquisition_date), 'dd MMM yyyy', { locale: fr }) : <span style={{ color: 'var(--et-text-muted)' }}>—</span> },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--et-text-muted)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>{label}</p>
                    <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--et-text)' }}>{value}</div>
                  </div>
                </div>
              ))}
              {equipment.description && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--et-surface-2)' }}>
                  <p className="text-xs mb-1" style={{ color: 'var(--et-text-muted)' }}>Description</p>
                  <p className="text-sm" style={{ color: 'var(--et-text)' }}>{equipment.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Changer statut */}
          <div className="card p-5 space-y-4">
            <p className="section-label">Statut</p>
            <div className="space-y-2">
              {(['available', 'borrowed', 'broken', 'maintenance'] as EquipmentStatus[]).map(s => (
                <label key={s} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ background: newStatus === s ? 'var(--et-primary-light)' : 'var(--et-surface-2)', border: `1.5px solid ${newStatus === s ? 'var(--et-primary-muted)' : 'transparent'}` }}>
                  <input type="radio" name="status" value={s} checked={newStatus === s} onChange={() => setNewStatus(s)} style={{ accentColor: 'var(--et-primary)' }} />
                  <span className={STATUS_BADGE[s]}>{STATUS_LABELS[s]}</span>
                  {s === equipment.status && <span className="text-xs ml-auto" style={{ color: 'var(--et-text-muted)' }}>actuel</span>}
                </label>
              ))}
              <button onClick={handleStatusChange} disabled={changingStatus || newStatus === equipment.status} className="btn btn-primary w-full justify-center mt-1">
                {changingStatus ? <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : null}
                {changingStatus ? 'Mise à jour…' : 'Appliquer'}
              </button>
            </div>
          </div>

          {/* QR Code */}
          <QRCodeCard equipment={equipment} />
        </div>

        {/* ── Photos ── */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Images className="w-4 h-4" style={{ color: 'var(--et-primary)' }} />
              <p className="section-label mb-0">Photos ({photos.length})</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCamera(true)} disabled={uploadingPhoto} className="btn btn-secondary btn-sm">
                  <Camera className="w-3.5 h-3.5" /> Caméra
                </button>
                <label className="btn btn-secondary btn-sm cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Fichier
                  <input type="file" accept="image/*" className="sr-only" onChange={handleFileSelect} disabled={uploadingPhoto} />
                </label>
              </div>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="empty-state py-6">
              <Images className="empty-state-icon" />
              <p className="empty-state-title">Aucune photo</p>
              {!isAdmin && <p className="empty-state-desc">Aucune photo n&apos;a été ajoutée pour cet équipement.</p>}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {photos.map(photo => (
                <div key={photo.id} className="relative w-24 h-24 rounded-lg overflow-hidden shrink-0 group" style={{ border: '1px solid var(--et-border)' }}>
                  <button type="button" onClick={() => setViewingPhoto(photo)} className="w-full h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={`${displayNum} — photo`} className="w-full h-full object-cover" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setPhotoToDelete(photo)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.6)' }}
                      title="Supprimer"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Incidents ── */}
        <div className="card">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--et-border)' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--et-danger)' }} />
              <p className="section-label mb-0">Incidents / Pannes ({incidents.length})</p>
            </div>
            <button onClick={() => setShowIncidentForm(v => !v)} className="btn btn-secondary btn-sm">
              {showIncidentForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showIncidentForm ? 'Annuler' : 'Signaler'}
            </button>
          </div>

          {/* Formulaire ajout incident */}
          {showIncidentForm && (
            <form onSubmit={handleAddIncident} className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--et-border)', background: 'var(--et-surface-2)' }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="et-label">Description de l&apos;incident *</label>
                  <textarea className="et-textarea" rows={2} placeholder="Décrivez le problème ou la panne…"
                    value={incForm.description} onChange={e => setIncForm(f => ({ ...f, description: e.target.value }))} required />
                </div>
                <div>
                  <label className="et-label">Signalé par</label>
                  <input type="text" className="et-input" placeholder="Nom (optionnel)"
                    value={incForm.reported_by} onChange={e => setIncForm(f => ({ ...f, reported_by: e.target.value }))} />
                </div>
                <div>
                  <label className="et-label">Date et heure</label>
                  <input type="datetime-local" className="et-input" value={incForm.reported_at}
                    onChange={e => setIncForm(f => ({ ...f, reported_at: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button type="submit" disabled={savingInc} className="btn btn-danger btn-sm">
                  {savingInc ? <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {savingInc ? 'Enregistrement…' : 'Enregistrer l\'incident'}
                </button>
                {AI_FEATURES_ENABLED && (
                  <button type="button" onClick={handleDiagnose} disabled={diagnosing || !incForm.description.trim()} className="btn btn-sm"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none' }}>
                    {diagnosing ? <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Sparkles className="w-3.5 h-3.5" />}
                    {diagnosing ? 'Diagnostic…' : 'Diagnostic IA'}
                  </button>
                )}
              </div>

              {/* AI Diagnosis result */}
              {AI_FEATURES_ENABLED && diagnosis && (
                <div className="mt-3 p-4 rounded-xl space-y-2" style={{ background: 'rgba(102,126,234,0.08)', border: '1px solid rgba(102,126,234,0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4" style={{ color: '#764ba2' }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--et-text)' }}>Diagnostic IA</span>
                    <span className="badge" style={{ background: (diagnosis.gravite as string) === 'critique' ? 'var(--et-danger)' : (diagnosis.gravite as string) === 'élevée' ? '#f97316' : (diagnosis.gravite as string) === 'moyenne' ? 'var(--et-warning)' : 'var(--et-success)', color: '#fff', fontSize: '0.65rem' }}>
                      {diagnosis.gravite as string}
                    </span>
                    <span className="text-xs ml-auto" style={{ color: 'var(--et-text-muted)' }}>{diagnosis.categorie as string}</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--et-text)' }}><strong>Diagnostic :</strong> {diagnosis.diagnostic as string}</p>
                  <p className="text-sm" style={{ color: 'var(--et-text-secondary)' }}><strong>Cause probable :</strong> {diagnosis.cause_probable as string}</p>
                  <p className="text-sm" style={{ color: 'var(--et-text-secondary)' }}><strong>Action immédiate :</strong> {diagnosis.solution_immediate as string}</p>
                  {(diagnosis.temps_reparation_estime as string) && (
                    <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>Temps estimé : {diagnosis.temps_reparation_estime as string}</p>
                  )}
                </div>
              )}
            </form>
          )}

          {/* Liste incidents */}
          {incidents.length === 0 ? (
            <div className="empty-state py-6">
              <CheckCircle2 className="empty-state-icon" style={{ color: 'var(--et-success)' }} />
              <p className="empty-state-title">Aucun incident signalé</p>
              <p className="empty-state-desc">Cet équipement n&apos;a pas eu d&apos;incident.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--et-border-light)' }}>
              {incidents.map(inc => (
                <div key={inc.id} className="p-4 flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5"
                    style={{ background: inc.resolved_at ? 'var(--et-success-bg)' : 'var(--et-danger-bg)' }}>
                    {inc.resolved_at
                      ? <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--et-success)' }} />
                      : <AlertTriangle className="w-4 h-4" style={{ color: 'var(--et-danger)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--et-text)' }}>{inc.description}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {format(new Date(inc.reported_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </span>
                      {inc.reported_by && (
                        <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>par {inc.reported_by}</span>
                      )}
                      {inc.resolved_at && (
                        <span className="badge badge-available" style={{ fontSize: '0.65rem' }}>
                          Résolu le {format(new Date(inc.resolved_at), 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!inc.resolved_at && (
                      <button onClick={() => handleResolveIncident(inc.id)} className="btn btn-ghost btn-sm" title="Marquer résolu"
                        style={{ color: 'var(--et-success)' }}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => setIncidentToDelete(inc)} className="btn btn-ghost btn-sm btn-icon" title="Supprimer">
                      <X className="w-3.5 h-3.5" style={{ color: 'var(--et-danger)' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Maintenances ── */}
        <div className="card">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--et-border)' }}>
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" style={{ color: 'var(--et-warning)' }} />
              <p className="section-label mb-0">Maintenances ({maintenances.length})</p>
            </div>
            <button onClick={() => setShowMaintenanceForm(v => !v)} className="btn btn-secondary btn-sm">
              {showMaintenanceForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showMaintenanceForm ? 'Annuler' : 'Ajouter'}
            </button>
          </div>

          {/* Formulaire maintenance */}
          {showMaintenanceForm && (
            <form onSubmit={handleAddMaintenance} className="p-4 space-y-3" style={{ borderBottom: '1px solid var(--et-border)', background: 'var(--et-surface-2)' }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="et-label">Description *</label>
                  <textarea className="et-textarea" rows={2} placeholder="Travaux effectués, pièces remplacées…"
                    value={maintForm.description} onChange={e => setMaintForm(f => ({ ...f, description: e.target.value }))} required />
                </div>
                <div>
                  <label className="et-label">Effectué par</label>
                  <input type="text" className="et-input" placeholder="Technicien (optionnel)"
                    value={maintForm.performed_by} onChange={e => setMaintForm(f => ({ ...f, performed_by: e.target.value }))} />
                </div>
                <div>
                  <label className="et-label">Date</label>
                  <input type="date" className="et-input" value={maintForm.performed_at}
                    onChange={e => setMaintForm(f => ({ ...f, performed_at: e.target.value }))} />
                </div>
                <div>
                  <label className="et-label">Coût (optionnel)</label>
                  <input type="number" min="0" step="0.01" className="et-input" placeholder="Ex: 15000 FCFA"
                    value={maintForm.cost} onChange={e => setMaintForm(f => ({ ...f, cost: e.target.value }))} />
                </div>
              </div>
              <ChecklistRatingList
                items={checklistItems}
                values={checklistValues}
                onChange={(itemId, state) => setChecklistValues(prev => ({ ...prev, [itemId]: state }))}
              />
              <button type="submit" disabled={savingMaint} className="btn btn-primary btn-sm">
                {savingMaint ? <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Wrench className="w-3.5 h-3.5" />}
                {savingMaint ? 'Enregistrement…' : 'Enregistrer la maintenance'}
              </button>
            </form>
          )}

          {/* Liste maintenances */}
          {maintenances.length === 0 ? (
            <div className="empty-state py-6">
              <Wrench className="empty-state-icon" />
              <p className="empty-state-title">Aucune maintenance enregistrée</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--et-border-light)' }}>
              {maintenances.map(m => (
                <div key={m.id} className="p-4 flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 mt-0.5"
                    style={{ background: 'var(--et-warning-bg)' }}>
                    <Wrench className="w-4 h-4" style={{ color: 'var(--et-warning)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--et-text)' }}>{m.description}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {format(new Date(m.performed_at), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                      {m.performed_by && <span className="text-xs" style={{ color: 'var(--et-text-muted)' }}>par {m.performed_by}</span>}
                      {m.cost != null && (
                        <span className="badge badge-neutral">{m.cost.toLocaleString('fr-FR')} FCFA</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setMaintenanceToDelete(m)} className="btn btn-ghost btn-sm btn-icon shrink-0" title="Supprimer">
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--et-danger)' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Historique des emprunts ── */}
        <div className="card">
          <div className="p-4" style={{ borderBottom: '1px solid var(--et-border)' }}>
            <p className="section-label mb-0">Historique des emprunts ({history.length})</p>
          </div>
          {history.length === 0 ? (
            <div className="empty-state py-6">
              <p className="empty-state-title">Aucun emprunt enregistré</p>
              <p className="empty-state-desc">Cet équipement n&apos;a pas encore été emprunté.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="et-table">
                <thead>
                  <tr>
                    <th>Employé</th>
                    <th className="hidden sm:table-cell">Service</th>
                    <th>Date emprunt</th>
                    <th className="hidden sm:table-cell">Date retour</th>
                    <th>État retour</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(row => (
                    <tr key={row.loan_id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/loans/${row.loan_id}`)}>
                      <td className="font-medium">{row.employee_name}</td>
                      <td className="hidden sm:table-cell" style={{ color: 'var(--et-text-muted)' }}>{row.department_name || '—'}</td>
                      <td style={{ color: 'var(--et-text-secondary)' }}>
                        {row.checkout_date ? format(new Date(row.checkout_date), 'dd/MM/yyyy', { locale: fr }) : '—'}
                      </td>
                      <td className="hidden sm:table-cell" style={{ color: 'var(--et-text-secondary)' }}>
                        {row.return_date ? format(new Date(row.return_date), 'dd/MM/yyyy', { locale: fr }) : <span style={{ opacity: 0.5 }}>—</span>}
                      </td>
                      <td>
                        {row.return_condition ? (
                          <span className={row.return_condition === 'good' ? 'badge badge-good' : row.return_condition === 'broken' ? 'badge badge-broken' : 'badge badge-fair'}>
                            {RETURN_LABELS[row.return_condition as keyof typeof RETURN_LABELS] ?? row.return_condition}
                          </span>
                        ) : <span style={{ color: 'var(--et-text-muted)' }}>—</span>}
                      </td>
                      <td>
                        <span className={row.status === 'active' ? 'badge badge-active' : 'badge badge-returned'}>
                          {row.status === 'active' ? 'Actif' : 'Retourné'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => { handleAddPhoto(dataUrl); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}

      <ImageModal
        src={viewingPhoto?.url ?? ''}
        alt={`${displayNum} — photo`}
        isOpen={!!viewingPhoto}
        onClose={() => setViewingPhoto(null)}
      />

      <ConfirmModal
        open={confirmDeleteEquipment}
        title="Supprimer cet équipement ?"
        message={`${displayNum} sera définitivement supprimé, avec son historique. Action irréversible.`}
        confirmLabel={deleting ? 'Suppression…' : 'Supprimer'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteEquipment(false)}
      />

      <ConfirmModal
        open={!!photoToDelete}
        title="Supprimer cette photo ?"
        message="Cette photo sera définitivement supprimée."
        variant="danger"
        onConfirm={handleDeletePhoto}
        onCancel={() => setPhotoToDelete(null)}
      />

      <ConfirmModal
        open={!!incidentToDelete}
        title="Supprimer cet incident ?"
        message="Cet incident sera définitivement supprimé de l'historique."
        variant="danger"
        onConfirm={handleDeleteIncident}
        onCancel={() => setIncidentToDelete(null)}
      />

      <ConfirmModal
        open={!!maintenanceToDelete}
        title="Supprimer cette maintenance ?"
        message="Cette entrée de maintenance sera définitivement supprimée."
        variant="danger"
        onConfirm={handleDeleteMaintenance}
        onCancel={() => setMaintenanceToDelete(null)}
      />
    </div>
  );
}
