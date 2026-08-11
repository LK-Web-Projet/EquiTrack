'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
      style={{
        background: 'var(--et-sidebar-hover)',
        color: 'var(--et-sidebar-text)',
      }}
    >
      {theme === 'dark'
        ? <Sun className="w-4 h-4 text-amber-400" />
        : <Moon className="w-4 h-4" />
      }
    </button>
  );
}

export default ThemeToggle;
