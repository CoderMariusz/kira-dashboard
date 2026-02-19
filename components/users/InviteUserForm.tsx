// components/users/InviteUserForm.tsx
// Formularz zapraszania nowego użytkownika

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Role } from '@/types/auth.types';

const ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN',       label: 'ADMIN' },
  { value: 'HELPER_PLUS', label: 'HELPER+' },
  { value: 'HELPER',      label: 'HELPER' },
];

interface InviteUserFormProps {
  onInviteSuccess: () => void; // Callback po udanym zaproszeniu → odśwież listę
}

// Walidacja emaila — RFC 5322 uproszczona
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateEmail(value: string): string {
  if (!value.trim())        return 'Adres email jest wymagany';
  if (!isValidEmail(value)) return 'Nieprawidłowy format adresu email';
  return '';
}

function validateRole(value: string): string {
  if (!value) return 'Rola jest wymagana';
  return '';
}

export function InviteUserForm({ onInviteSuccess }: InviteUserFormProps) {
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState<Role | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [roleError, setRoleError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Walidacja wszystkich pól przed submittem
    const emailErr = validateEmail(email);
    const roleErr  = validateRole(role);
    setEmailError(emailErr);
    setRoleError(roleErr);

    if (emailErr || roleErr) return; // Zatrzymaj jeśli błędy

    setIsLoading(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };

        if (res.status === 409) {
          // Użytkownik już istnieje — inline błąd przy polu email
          setEmailError(`Użytkownik ${email.trim()} już istnieje w systemie`);
          return;
        }

        // Ogólny błąd serwera
        toast.error(data.error ?? `Błąd serwera (${res.status}). Spróbuj ponownie.`);
        return;
      }

      // Sukces
      toast.success(`Zaproszenie wysłane na ${email.trim()}`);
      setEmail('');
      setRole('');
      setEmailError('');
      setRoleError('');
      onInviteSuccess(); // Odśwież tabelę
    } catch {
      toast.error('Błąd sieci. Sprawdź połączenie i spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#1a1730] border border-[#2a2540] rounded-xl p-4 mb-6"
      aria-label="Formularz zapraszania użytkownika"
      noValidate
    >
      <h2 className="text-[14px] font-bold text-[#e6edf3] mb-3">Zaproś użytkownika</h2>

      <div className="flex gap-3 items-start flex-wrap">
        {/* Email input */}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label htmlFor="invite-email" className="text-[11px] text-[#6b7280]">
            Adres email
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            onBlur={(e) => setEmailError(validateEmail(e.target.value))}
            placeholder="np. zuza@rodzina.pl"
            disabled={isLoading}
            className={[
              'bg-[#13111c] border rounded-lg px-3 py-2 text-[13px] text-[#e6edf3]',
              'placeholder-[#4b4569] outline-none transition-colors',
              emailError
                ? 'border-[#f87171] focus:border-[#f87171]'
                : 'border-[#2a2540] focus:border-[#7c3aed]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            ].join(' ')}
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'invite-email-error' : undefined}
          />
          {emailError && (
            <span
              id="invite-email-error"
              className="text-[11px] text-[#f87171]"
              role="alert"
            >
              {emailError}
            </span>
          )}
        </div>

        {/* Role select */}
        <div className="flex flex-col gap-1 min-w-[150px]">
          <label htmlFor="invite-role" className="text-[11px] text-[#6b7280]">
            Rola
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role | '');
              setRoleError('');
            }}
            disabled={isLoading}
            className={[
              'bg-[#13111c] border rounded-lg px-3 py-2 text-[13px] text-[#e6edf3]',
              'outline-none transition-colors',
              roleError
                ? 'border-[#f87171] focus:border-[#f87171]'
                : 'border-[#2a2540] focus:border-[#7c3aed]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              role ? 'cursor-pointer' : 'cursor-pointer',
            ].join(' ')}
            aria-invalid={roleError ? true : undefined}
            aria-describedby={roleError ? 'invite-role-error' : undefined}
          >
            <option value="" disabled>
              Wybierz rolę
            </option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {roleError && (
            <span
              id="invite-role-error"
              className="text-[11px] text-[#f87171]"
              role="alert"
            >
              {roleError}
            </span>
          )}
        </div>

        {/* Submit button — wyrównany do dolnej linii inputów */}
        <div className="flex flex-col justify-end">
          {/* Invisible label spacer to align button with inputs */}
          <span className="text-[11px] text-transparent select-none" aria-hidden="true">
            btn
          </span>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white
                       rounded-lg text-[13px] font-semibold
                       hover:opacity-90 transition-opacity
                       disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-1.5 min-w-[90px] justify-center cursor-pointer"
          >
            {isLoading ? (
              <>
                <span
                  className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                Zapraszanie...
              </>
            ) : (
              'Zaproś'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
