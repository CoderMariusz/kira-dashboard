'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/RoleContext';
import type { Role } from '@/types/auth.types';

function getRedirectPath(role: Role | null): string {
  switch (role) {
    case 'ADMIN':
      return '/dashboard';
    case 'HELPER_PLUS':
      return '/home';
    case 'HELPER':
      return '/home/tasks';
    default:
      return '/home';
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { user, role, isLoading: sessionLoading } = useUser();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace(getRedirectPath(role));
    }
  }, [sessionLoading, user, role, router]);

  function validateForm(): boolean {
    let valid = true;
    setEmailError('');
    setPasswordError('');
    setFormError('');

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Podaj adres email');
      valid = false;
    } else if (!trimmedEmail.includes('@') || !trimmedEmail.slice(trimmedEmail.indexOf('@') + 1).includes('.')) {
      setEmailError('Nieprawidłowy format adresu email');
      valid = false;
    }

    if (!password) {
      setPasswordError('Podaj hasło');
      valid = false;
    } else if (password.length < 8) {
      setPasswordError('Hasło musi mieć co najmniej 8 znaków');
      valid = false;
    }

    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const trimmedEmail = email.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        setFormError('Nieprawidłowy email lub hasło');
        return;
      }

      // Fetch role directly after sign-in (Option A — avoids race conditions)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      const userRole = (roleData?.role ?? null) as Role | null;
      router.replace(getRedirectPath(userRole));
    } catch {
      setFormError('Błąd połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setEmailError('Podaj adres email aby zresetować hasło');
      return;
    }

    setResetMessage('');
    setFormError('');
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setFormError('Nie udało się wysłać emaila. Sprawdź adres i spróbuj ponownie.');
      } else {
        setResetMessage('Sprawdź skrzynkę email — wysłaliśmy link do resetowania hasła');
      }
    } catch {
      setFormError('Błąd połączenia z serwerem. Sprawdź internet i spróbuj ponownie.');
    }
  }

  // Loading state — checking session
  if (sessionLoading) {
    return (
      <div
        style={{
          background: '#13111c',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#6b7280', fontSize: '14px' }}>Ładowanie...</div>
      </div>
    );
  }

  // User already logged in — redirect in progress via useEffect
  if (user) {
    return <div style={{ background: '#13111c', minHeight: '100vh' }} />;
  }

  return (
    <div
      style={{
        background: '#13111c',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#1a1730',
          border: '1px solid #3b3d7a',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '28px 28px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌟</div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#e6edf3',
              margin: 0,
            }}
          >
            System Kira
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '6px' }}>
            Zaloguj się do swojego konta
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px 28px' }} noValidate>
          {/* Email field */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '13px',
                color: '#e6edf3',
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError('');
              }}
              placeholder="twoj@email.pl"
              disabled={isSubmitting}
              autoComplete="email"
              style={{
                width: '100%',
                background: '#13111c',
                border: `1px solid ${emailError ? '#f87171' : '#2a2540'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e6edf3',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              aria-label="Adres email"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'email-error' : undefined}
            />
            {emailError && (
              <p
                id="email-error"
                style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}
              >
                {emailError}
              </p>
            )}
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}
            >
              <label
                htmlFor="password"
                style={{ fontSize: '13px', color: '#e6edf3', fontWeight: 500 }}
              >
                Hasło
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                style={{
                  fontSize: '12px',
                  color: '#818cf8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
                aria-label="Zresetuj hasło"
              >
                Zapomniałeś hasła?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              placeholder="••••••••"
              disabled={isSubmitting}
              autoComplete="current-password"
              style={{
                width: '100%',
                background: '#13111c',
                border: `1px solid ${passwordError ? '#f87171' : '#2a2540'}`,
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#e6edf3',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              aria-label="Hasło"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={passwordError ? 'password-error' : undefined}
            />
            {passwordError && (
              <p
                id="password-error"
                style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}
              >
                {passwordError}
              </p>
            )}
          </div>

          {/* Global error */}
          {formError && (
            <div
              role="alert"
              style={{
                background: '#3a1a1a',
                border: '1px solid #7f1d1d',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {formError}
            </div>
          )}

          {/* Reset password success message */}
          {resetMessage && (
            <div
              role="status"
              style={{
                background: '#1a3a1a',
                border: '1px solid #2a5a2a',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#4ade80',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {resetMessage}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '11px',
              background: isSubmitting
                ? '#4b3a7a'
                : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isSubmitting ? 'none' : '0 2px 10px rgba(124,58,237,0.35)',
            }}
            aria-label={isSubmitting ? 'Logowanie w toku' : 'Zaloguj się'}
          >
            {isSubmitting ? (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  style={{ animation: 'spin 1s linear infinite' }}
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="3"
                    fill="none"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="#fff"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                Logowanie...
              </>
            ) : (
              'Zaloguj się'
            )}
          </button>

          {/* Spinner keyframes */}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </form>
      </div>
    </div>
  );
}
