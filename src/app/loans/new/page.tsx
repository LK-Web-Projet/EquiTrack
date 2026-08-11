'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Search, Plus, X, User, Package } from 'lucide-react';
import { getEmployees, getCategories, getEquipment, createLoan } from '@/lib/supabase';
import type { Employee, Category, Equipment } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SelectedItem {
  equipment: Equipment;
}

export default function NewLoanPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Step 2
  const [categories, setCategories] = useState<Category[]>([]);
  const [catAvailability, setCatAvailability] = useState<Record<string, number>>({});
  const [selectedCat, setSelectedCat] = useState<string>('');
  const [availableEquipment, setAvailableEquipment] = useState<Equipment[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loadingEquip, setLoadingEquip] = useState(false);

  // Step 3
  const now = new Date();
  const [checkoutDate] = useState(format(now, 'yyyy-MM-dd'));
  const [checkoutTime] = useState(format(now, 'HH:mm'));
  const [expectedReturn, setExpectedReturn] = useState('');
  const [notes, setNotes] = useState('');
  const [processedBy, setProcessedBy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [emps, cats, allEquip] = await Promise.all([getEmployees(), getCategories(), getEquipment({ status: 'available' })]);
      setEmployees(emps.filter(e => e.is_active));
      setCategories(cats);
      const counts: Record<string, number> = {};
      for (const eq of allEquip) counts[eq.category_id] = (counts[eq.category_id] ?? 0) + 1;
      setCatAvailability(counts);
    };
    load().catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedCat) { setAvailableEquipment([]); return; }
    setLoadingEquip(true);
    getEquipment({ category_id: selectedCat, status: 'available' })
      .then(equip => {
        // Exclude already selected items
        const selectedIds = new Set(selectedItems.map(i => i.equipment.id));
        setAvailableEquipment(equip.filter(e => !selectedIds.has(e.id)));
      })
      .catch(console.error)
      .finally(() => setLoadingEquip(false));
  }, [selectedCat, selectedItems]);

  const filteredEmployees = employees.filter(e => {
    const q = empSearch.toLowerCase();
    return !q || e.name.toLowerCase().includes(q) || e.department?.name?.toLowerCase().includes(q);
  });

  const addItem = (eq: Equipment) => {
    setSelectedItems(prev => [...prev, { equipment: eq }]);
    setCatAvailability(prev => ({ ...prev, [eq.category_id]: Math.max(0, (prev[eq.category_id] ?? 0) - 1) }));
  };

  const removeItem = (equipmentId: string) => {
    const item = selectedItems.find(i => i.equipment.id === equipmentId);
    if (item) {
      setCatAvailability(prev => ({ ...prev, [item.equipment.category_id]: (prev[item.equipment.category_id] ?? 0) + 1 }));
    }
    setSelectedItems(prev => prev.filter(i => i.equipment.id !== equipmentId));
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || selectedItems.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const loan = await createLoan(
        {
          employee_id: selectedEmployee.id,
          checkout_date: checkoutDate,
          checkout_time: checkoutTime,
          expected_return_date: expectedReturn || undefined,
          checkout_notes: notes.trim() || undefined,
          processed_by: processedBy.trim() || undefined,
          status: 'active',
        },
        selectedItems.map(i => i.equipment.id)
      );
      router.push(`/loans/${loan.id}`);
    } catch (e: unknown) {
      setError('Erreur lors de la création : ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = ['Employé', 'Équipements', 'Confirmer'];

  return (
    <div className="fade-in">
      <div className="page-header flex items-center gap-3">
        <Link href="/loans" className="btn btn-ghost btn-icon">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Nouvel emprunt</h1>
          <p className="page-subtitle">Étape {step} sur 3 — {STEPS[step - 1]}</p>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={n} className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                  style={{
                    background: done ? 'var(--et-success)' : active ? 'var(--et-primary)' : 'var(--et-surface-2)',
                    color: done || active ? '#fff' : 'var(--et-text-muted)',
                  }}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                <span
                  className="text-sm font-medium hidden sm:inline"
                  style={{ color: active ? 'var(--et-text)' : 'var(--et-text-muted)' }}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="w-8 h-0.5 mx-1" style={{ background: done ? 'var(--et-success)' : 'var(--et-border)' }} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">

            {/* ─── Step 1: Employee ─── */}
            {step === 1 && (
              <div className="card p-5 space-y-4">
                <p className="section-label">Sélectionner l'employé</p>
                <div className="flex items-center gap-2" style={{ background: 'var(--et-surface-2)', border: '1.5px solid var(--et-border)', borderRadius: 'var(--et-radius)', padding: '0.5rem 0.875rem' }}>
                  <Search className="w-4 h-4 shrink-0" style={{ color: 'var(--et-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Rechercher un employé…"
                    value={empSearch}
                    onChange={e => setEmpSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '0.875rem', color: 'var(--et-text)' }}
                    autoFocus
                  />
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredEmployees.length === 0 && (
                    <div className="empty-state py-6">
                      <User className="empty-state-icon" />
                      <p className="empty-state-title">Aucun employé actif trouvé</p>
                    </div>
                  )}
                  {filteredEmployees.map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{
                        background: selectedEmployee?.id === emp.id ? 'var(--et-primary-light)' : 'var(--et-surface-2)',
                        border: `1.5px solid ${selectedEmployee?.id === emp.id ? 'var(--et-primary-muted)' : 'transparent'}`,
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold text-white shrink-0"
                        style={{ background: selectedEmployee?.id === emp.id ? 'var(--et-primary)' : 'var(--et-text-muted)' }}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: 'var(--et-text)' }}>{emp.name}</p>
                        {emp.department && (
                          <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>{emp.department.name}</p>
                        )}
                      </div>
                      {selectedEmployee?.id === emp.id && (
                        <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--et-primary)' }} />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    disabled={!selectedEmployee}
                    onClick={() => setStep(2)}
                    className="btn btn-primary"
                  >
                    Suivant <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 2: Equipment ─── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="card p-5 space-y-4">
                  <p className="section-label">Choisir une catégorie</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map(cat => {
                      const count = catAvailability[cat.id] ?? 0;
                      return (
                        <div
                          key={cat.id}
                          onClick={() => count > 0 && setSelectedCat(cat.id)}
                          className="p-3 rounded-xl cursor-pointer text-center transition-all"
                          style={{
                            opacity: count === 0 ? 0.4 : 1,
                            cursor: count === 0 ? 'not-allowed' : 'pointer',
                            background: selectedCat === cat.id ? 'var(--et-primary-light)' : 'var(--et-surface-2)',
                            border: `1.5px solid ${selectedCat === cat.id ? 'var(--et-primary-muted)' : 'transparent'}`,
                          }}
                        >
                          <p className="text-xl">{cat.icon}</p>
                          <p className="text-xs font-semibold mt-1" style={{ color: 'var(--et-text)' }}>{cat.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: count > 0 ? 'var(--et-success)' : 'var(--et-danger)' }}>
                            {count} dispo
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedCat && (
                  <div className="card p-5 space-y-3">
                    <p className="section-label">Équipements disponibles</p>
                    {loadingEquip ? (
                      <div className="flex justify-center py-4">
                        <div className="spinner" />
                      </div>
                    ) : availableEquipment.length === 0 ? (
                      <div className="empty-state py-4">
                        <p className="empty-state-title">Aucun équipement disponible</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {availableEquipment.map(eq => (
                          <div
                            key={eq.id}
                            className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ background: 'var(--et-surface-2)' }}
                          >
                            <span className="eq-number">{eq.category?.code}-{eq.display_number}</span>
                            {eq.serial_number && (
                              <span className="text-xs" style={{ color: 'var(--et-text-muted)', fontFamily: 'monospace' }}>{eq.serial_number}</span>
                            )}
                            {eq.location && (
                              <span className="text-xs ml-auto" style={{ color: 'var(--et-text-muted)' }}>{eq.location}</span>
                            )}
                            <button
                              onClick={() => addItem(eq)}
                              className="btn btn-primary btn-sm ml-auto"
                            >
                              <Plus className="w-3.5 h-3.5" /> Sélectionner
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setStep(1)} className="btn btn-secondary">
                    <ArrowLeft className="w-4 h-4" /> Retour
                  </button>
                  <button
                    disabled={selectedItems.length === 0}
                    onClick={() => setStep(3)}
                    className="btn btn-primary"
                  >
                    Suivant ({selectedItems.length}) <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ─── Step 3: Confirm ─── */}
            {step === 3 && (
              <div className="card p-5 space-y-5">
                <p className="section-label">Confirmer l'emprunt</p>

                {error && <div className="alert alert-danger">{error}</div>}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="et-label">Date d'emprunt</label>
                    <input type="date" className="et-input" value={checkoutDate} readOnly style={{ opacity: 0.7 }} />
                  </div>
                  <div>
                    <label className="et-label">Heure</label>
                    <input type="time" className="et-input" value={checkoutTime} readOnly style={{ opacity: 0.7 }} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="et-label">Date de retour prévue <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                    <input
                      type="date"
                      className="et-input"
                      value={expectedReturn}
                      min={checkoutDate}
                      onChange={e => setExpectedReturn(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="et-label">Agent responsable <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                    <input
                      type="text"
                      className="et-input"
                      placeholder="Nom de l'agent qui traite l'emprunt…"
                      value={processedBy}
                      onChange={e => setProcessedBy(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="et-label">Notes <span style={{ color: 'var(--et-text-muted)', fontWeight: 400 }}>(optionnel)</span></label>
                    <textarea
                      className="et-textarea"
                      placeholder="Remarques sur l'emprunt…"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setStep(2)} className="btn btn-secondary">
                    <ArrowLeft className="w-4 h-4" /> Retour
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn btn-primary btn-lg"
                  >
                    {submitting ? (
                      <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                    ) : <Check className="w-4 h-4" />}
                    {submitting ? 'Enregistrement…' : 'Confirmer l\'emprunt'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── Summary sidebar ─── */}
          <div className="space-y-4">
            {selectedEmployee && (
              <div className="card p-4">
                <p className="section-label">Employé sélectionné</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold text-white shrink-0" style={{ background: 'var(--et-primary)' }}>
                    {selectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--et-text)' }}>{selectedEmployee.name}</p>
                    {selectedEmployee.department && (
                      <p className="text-xs" style={{ color: 'var(--et-text-muted)' }}>{selectedEmployee.department.name}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedItems.length > 0 && (
              <div className="card p-4">
                <p className="section-label">Équipements sélectionnés ({selectedItems.length})</p>
                <div className="space-y-2 mt-2">
                  {selectedItems.map(({ equipment: eq }) => (
                    <div
                      key={eq.id}
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ background: 'var(--et-surface-2)' }}
                    >
                      <span className="text-base">{eq.category?.icon}</span>
                      <span className="eq-number text-xs">{eq.category?.code}-{eq.display_number}</span>
                      <button
                        onClick={() => removeItem(eq.id)}
                        className="ml-auto btn btn-ghost btn-sm btn-icon"
                      >
                        <X className="w-3 h-3" style={{ color: 'var(--et-danger)' }} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedItems.length === 0 && step > 1 && (
              <div className="card p-4">
                <div className="empty-state py-4">
                  <Package className="empty-state-icon" />
                  <p className="empty-state-title" style={{ fontSize: '0.85rem' }}>Aucun équipement</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
