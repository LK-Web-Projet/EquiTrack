'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ArrowLeftRight, History,
  Users, FileBarChart2, Settings, Layers, Building2,
  Zap, MoreHorizontal, X, ScanLine, UserCog, LogOut, ChevronDown
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import ConfirmModal from './ConfirmModal';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
  { href: '/',            icon: LayoutDashboard, label: 'Tableau de bord', adminOnly: false },
  { href: '/users',       icon: UserCog,         label: 'Utilisateurs',   adminOnly: true  },
  { href: '/categories',  icon: Layers,          label: 'Catégories',      adminOnly: true  },
  { href: '/equipment',   icon: Package,         label: 'Équipements',     adminOnly: false },
  { href: '/loans',       icon: ArrowLeftRight,  label: 'Emprunts',        adminOnly: false },
  { href: '/history',     icon: History,         label: 'Historique',     adminOnly: false },
  { href: '/employees',   icon: Users,           label: 'Employés',       adminOnly: true  },
  { href: '/departments', icon: Building2,       label: 'Services',       adminOnly: true  },
  { href: '/reports',     icon: FileBarChart2,   label: 'Rapports',       adminOnly: true  },
  { href: '/scan',        icon: ScanLine,        label: 'Scanner QR',     adminOnly: false },
  { href: '/settings',    icon: Settings,        label: 'Paramètres',     adminOnly: true  },
];

// 4 items principaux + bouton "Plus"
const MOBILE_MAIN = [
  { href: '/',          icon: LayoutDashboard, label: 'Accueil'     },
  { href: '/equipment', icon: Package,         label: 'Équipements' },
  { href: '/scan',      icon: ScanLine,        label: 'Scanner'     },
  { href: '/loans',     icon: ArrowLeftRight,  label: 'Emprunts'    },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, profile, isAdmin, signOut } = useAuth();

  const handleLogout = () => {
    setConfirmLogout(false);
    setMenuOpen(false);
    setUserMenuOpen(false);
    signOut();
  };

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);

  // Page de connexion : pas de sidebar / nav, juste le formulaire.
  if (pathname === '/login') {
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const visibleNavItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  // Vérifie si la page active n'est pas dans les 4 items principaux
  const isOtherActive = !MOBILE_MAIN.some(item => isActive(item.href));

  const displayName = profile?.full_name?.trim() || user?.email || '';
  const initial = displayName.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--et-bg)' }}>

      {/* ══ SIDEBAR — desktop (md+) ══ */}
      <aside
        className="hidden md:flex flex-col w-60 shrink-0 sticky top-0 h-screen"
        style={{ background: 'var(--et-sidebar-bg)', borderRight: '1px solid var(--et-sidebar-border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid var(--et-sidebar-border)' }}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
            style={{ background: 'var(--et-primary)' }}
          >
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight" style={{ color: 'var(--et-sidebar-logo)' }}>
              EquiTrack
            </p>
            <p className="text-[10px]" style={{ color: 'var(--et-sidebar-text)' }}>
              Gestion des équipements
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                style={{
                  background: active ? 'var(--et-sidebar-active-bg)' : 'transparent',
                  color: active ? 'var(--et-sidebar-active)' : 'var(--et-sidebar-text)',
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'var(--et-sidebar-hover)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--et-sidebar-text-hover)';
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--et-sidebar-text)';
                  }
                }}
              >
                <Icon
                  className="w-4 h-4 shrink-0"
                  strokeWidth={active ? 2.5 : 2}
                  style={{ color: active ? 'var(--et-sidebar-active)' : 'var(--et-sidebar-text)' }}
                />
                <span className="text-sm" style={{ fontWeight: active ? 600 : 400 }}>
                  {label}
                </span>
                {active && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: 'var(--et-sidebar-active)' }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div
          className="px-4 py-3"
          style={{ borderTop: '1px solid var(--et-sidebar-border)' }}
        >
          <span className="text-[11px]" style={{ color: 'var(--et-sidebar-text)' }}>v1.0.0</span>
        </div>
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <main className="flex-1 flex flex-col overflow-auto min-w-0">
        {/* ══ TOPBAR — thème + compte, en haut à droite ══ */}
        <header
          className="sticky top-0 z-30 flex items-center justify-end gap-2 h-14 px-4 md:px-7 shrink-0"
          style={{ background: 'var(--et-surface)', borderBottom: '1px solid var(--et-border)' }}
        >
          <ThemeToggle />
          {user && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full transition-colors"
                style={{ background: userMenuOpen ? 'var(--et-surface-2)' : 'transparent' }}
              >
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white shrink-0"
                  style={{ background: 'var(--et-primary)' }}
                >
                  {initial}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[10rem] truncate" style={{ color: 'var(--et-text)' }}>
                  {displayName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--et-text-muted)' }} />
              </button>

              {userMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden fade-in"
                  style={{ background: 'var(--et-surface)', border: '1px solid var(--et-border)', boxShadow: 'var(--et-shadow-lg)' }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--et-border-light)' }}>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--et-text)' }}>{displayName}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--et-text-muted)' }}>{isAdmin ? 'Administrateur' : 'Utilisateur'}</p>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); setConfirmLogout(true); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors"
                    style={{ color: 'var(--et-danger)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--et-danger-bg)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <LogOut className="w-4 h-4" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        <div className="flex-1 pb-20 md:pb-0">
          {children}
        </div>
      </main>

      {/* ══ BOTTOM NAV — mobile uniquement ══ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: 'var(--et-surface)',
          borderTop: '1px solid var(--et-border)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-stretch h-16">
          {/* 4 items principaux */}
          {MOBILE_MAIN.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative"
                style={{ color: active ? 'var(--et-primary)' : 'var(--et-text-muted)' }}
              >
                {active && (
                  <span
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full"
                    style={{ background: 'var(--et-primary)' }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          {/* Bouton "Plus" */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors relative"
            style={{ color: isOtherActive ? 'var(--et-primary)' : 'var(--et-text-muted)' }}
          >
            {isOtherActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-0.5 rounded-full"
                style={{ background: 'var(--et-primary)' }}
              />
            )}
            <MoreHorizontal className="w-5 h-5" strokeWidth={isOtherActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Plus</span>
          </button>
        </div>
      </nav>

      {/* ══ MENU SLIDE-UP (mobile) — tous les liens ══ */}
      {menuOpen && (
        <>
          {/* Overlay sombre */}
          <div
            className="md:hidden fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={() => setMenuOpen(false)}
          />

          {/* Panneau du bas */}
          <div
            className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: 'var(--et-surface)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
            }}
          >
            {/* Poignée */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--et-border)' }} />
            </div>

            {/* Header du panneau */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--et-border)' }}>
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-7 h-7 rounded-lg"
                  style={{ background: 'var(--et-primary)' }}
                >
                  <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--et-text)' }}>EquiTrack</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-full"
                style={{ background: 'var(--et-surface-2)' }}
              >
                <X className="w-4 h-4" style={{ color: 'var(--et-text-muted)' }} />
              </button>
            </div>

            {/* Grille de navigation */}
            <div className="p-4 grid grid-cols-3 gap-3 pb-2">
              {visibleNavItems.map(({ href, icon: Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
                    style={{
                      background: active ? 'var(--et-primary-light)' : 'var(--et-surface-2)',
                      border: `1.5px solid ${active ? 'var(--et-primary-muted)' : 'transparent'}`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-11 h-11 rounded-xl"
                      style={{
                        background: active ? 'var(--et-primary)' : 'var(--et-surface)',
                        boxShadow: active ? '0 4px 12px rgba(59,130,246,0.3)' : 'none',
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: active ? '#fff' : 'var(--et-text-muted)' }}
                        strokeWidth={active ? 2.5 : 2}
                      />
                    </div>
                    <span
                      className="text-[11px] text-center leading-tight"
                      style={{
                        color: active ? 'var(--et-primary)' : 'var(--et-text-secondary)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmLogout}
        title="Se déconnecter ?"
        message="Vous serez redirigé vers la page de connexion. Vos éventuelles modifications non enregistrées seront perdues."
        confirmLabel="Se déconnecter"
        variant="warning"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
    </div>
  );
}
