'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, LogIn, Package, ArrowLeftRight, ScanLine, ShieldCheck } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: Package,        label: 'Suivi complet du parc d’équipements' },
  { icon: ArrowLeftRight, label: 'Emprunts et retours en quelques clics' },
  { icon: ScanLine,       label: 'Scan QR code pour un accès instantané' },
  { icon: ShieldCheck,    label: 'Accès sécurisé par rôle' },
];

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Email ou mot de passe incorrect.');
      setLoading(false);
      return;
    }
    const next = searchParams.get('next') || '/';
    router.push(next);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen">
      {/* ══ VOLET GAUCHE — branding (masqué sur mobile) ══ */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'var(--et-sidebar-bg)' }}
      >
        {/* Décor : cercles subtils */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: 'var(--et-primary)' }}>
            <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--et-sidebar-logo)' }}>EquiTrack</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold tracking-tight leading-tight mb-4" style={{ color: 'var(--et-sidebar-logo)' }}>
            La gestion de vos équipements, simplifiée.
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: 'var(--et-sidebar-text)' }}>
            Suivez, prêtez et entretenez le parc matériel de votre organisation depuis une seule plateforme.
          </p>

          <div className="space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)' }}
                >
                  <Icon className="w-4 h-4" style={{ color: 'var(--et-primary)' }} strokeWidth={2.25} />
                </div>
                <span className="text-sm" style={{ color: 'var(--et-sidebar-text-hover)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px]" style={{ color: 'var(--et-sidebar-text)' }}>
          &copy; {new Date().getFullYear()} EquiTrack &mdash; Gestion des équipements
        </p>
      </div>

      {/* ══ VOLET DROIT — formulaire ══ */}
      <div
        className="flex flex-1 items-center justify-center px-4 py-12"
        style={{ background: 'var(--et-bg)' }}
      >
        <div className="w-full max-w-sm">
          {/* Logo visible uniquement sur mobile/tablette */}
          <div className="flex lg:hidden flex-col items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: 'var(--et-primary)' }}>
              <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold tracking-tight" style={{ color: 'var(--et-text)' }}>EquiTrack</p>
              <p className="text-sm" style={{ color: 'var(--et-text-muted)' }}>Gestion des équipements</p>
            </div>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--et-text)' }}>Connexion</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--et-text-muted)' }}>Accédez à votre espace EquiTrack.</p>
          </div>

          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            {error && <div className="alert alert-danger">{error}</div>}

            <div>
              <label htmlFor="login-email" className="et-label">Email</label>
              <input
                id="login-email"
                type="email"
                className="et-input"
                placeholder="vous@entreprise.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="login-password" className="et-label">Mot de passe</label>
              <input
                id="login-password"
                type="password"
                className="et-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center btn-lg mt-2">
              {loading ? (
                <div className="spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>

            <p className="text-xs text-center pt-1" style={{ color: 'var(--et-text-muted)' }}>
              Pas de compte ? Contactez votre administrateur.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
