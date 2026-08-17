'use client';

import { useEffect, useRef, useState } from 'react';
import { KeyRound, X } from 'lucide-react';

interface PasswordModalProps {
  open: boolean;
  title: string;
  description?: string;
  requireCurrent?: boolean;
  submitting?: boolean;
  onSubmit: (values: { currentPassword: string; newPassword: string }) => void;
  onCancel: () => void;
}

export default function PasswordModal({
  open,
  title,
  description,
  requireCurrent = false,
  submitting = false,
  onSubmit,
  onCancel,
}: PasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setLocalError('');
    firstFieldRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setLocalError('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLocalError('');
    onSubmit({ currentPassword, newPassword });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="pwd-modal-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-sm rounded-2xl fade-in"
        style={{ background: 'var(--et-surface)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '1px solid var(--et-border)' }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 rounded-full transition-colors"
          style={{ color: 'var(--et-text-muted)' }}
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: 'var(--et-primary-light)' }}>
              <KeyRound className="w-5 h-5" style={{ color: 'var(--et-primary-text)' }} />
            </div>
            <div>
              <h2 id="pwd-modal-title" className="text-base font-semibold" style={{ color: 'var(--et-text)' }}>{title}</h2>
              {description && <p className="text-xs mt-0.5" style={{ color: 'var(--et-text-muted)' }}>{description}</p>}
            </div>
          </div>

          {(localError) && <div className="alert alert-danger text-sm">{localError}</div>}

          {requireCurrent && (
            <div>
              <label htmlFor="pwd-current" className="et-label">Mot de passe actuel</label>
              <input
                ref={firstFieldRef}
                id="pwd-current"
                type="password"
                className="et-input"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="pwd-new" className="et-label">Nouveau mot de passe</label>
            <input
              ref={!requireCurrent ? firstFieldRef : undefined}
              id="pwd-new"
              type="password"
              className="et-input"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div>
            <label htmlFor="pwd-confirm" className="et-label">Confirmer le nouveau mot de passe</label>
            <input
              id="pwd-confirm"
              type="password"
              className="et-input"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onCancel} className="btn btn-secondary flex-1 justify-center">
            Annuler
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary flex-1 justify-center">
            {submitting ? <div className="spinner" style={{ width: '0.875rem', height: '0.875rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : null}
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}
