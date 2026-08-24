'use client';

import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordFieldProps = React.InputHTMLAttributes<HTMLInputElement>;

// Champ mot de passe avec bouton œil pour basculer entre masqué/visible.
const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ className, style, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`et-input ${className ?? ''}`}
          style={{ paddingRight: '2.5rem', ...style }}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-0 top-0 h-full px-3 flex items-center justify-center"
          style={{ color: 'var(--et-text-muted)' }}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }
);
PasswordField.displayName = 'PasswordField';

export default PasswordField;
