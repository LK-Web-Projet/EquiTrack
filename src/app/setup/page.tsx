'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, UserPlus, CheckCircle2 } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [done, setDone] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/setup')
      .then(res => res.json())
      .then(data => setDone(!!data.done))
      .catch(() => setDone(false))
      .finally(() => setChecking(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password, full_name: fullName.trim() || undefined }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Erreur lors de la création du compte.');
      setLoading(false);
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: 'var(--et-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="hidden lg:block mb-6">
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--et-text)' }}>
            Configuration initiale
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--et-text-muted)' }}>
            Créez le tout premier compte administrateur d&apos;EquiTrack.
          </p>
        </div>

        <div className="alert alert-warning mb-4 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="text-xs leading-relaxed">
            Cette page ne demande aucune authentification et ne fonctionne que tant qu&apos;aucun
            compte n&apos;existe. <strong>Supprimez-la</strong> (src/app/setup et src/app/api/setup)
            juste après avoir créé l&apos;admin.
          </span>
        </div>

        {checking ? (
          <div className="card p-6 flex items-center justify-center">
            <div className="spinner" style={{ width: '1.5rem', height: '1.5rem' }} />
          </div>
        ) : done ? (
          <div className="card p-6 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 mx-auto" style={{ color: 'var(--et-success)' }} />
            <p className="font-medium" style={{ color: 'var(--et-text)' }}>Configuration déjà terminée</p>
            <p className="text-sm" style={{ color: 'var(--et-text-muted)' }}>
              Un compte existe déjà. Cette page est désactivée — pensez à la supprimer.
            </p>
            <a href="/login" className="btn btn-primary w-full justify-center mt-2">Aller à la connexion</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            {error && <div className="alert alert-danger">{error}</div>}

            <div>
              <label htmlFor="setup-name" className="et-label">Nom complet</label>
              <input
                id="setup-name"
                type="text"
                className="et-input"
                placeholder="Ex: Awa Diallo"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="setup-email" className="et-label">Email</label>
              <input
                id="setup-email"
                type="email"
                className="et-input"
                placeholder="admin@entreprise.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="setup-password" className="et-label">Mot de passe</label>
              <input
                id="setup-password"
                type="password"
                className="et-input"
                placeholder="Au moins 8 caractères"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center btn-lg mt-2">
              {loading ? (
                <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? 'Création…' : 'Créer le compte admin'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
