'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Weryfikuję...');

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      
      // Check for hash fragment (magic link)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        // Set session from tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        
        if (!error) {
          setStatus('Zalogowano! Przekierowuję...');
          router.push('/');
          return;
        } else {
          setStatus(`Błąd: ${error.message}`);
        }
      }
      
      // Check for code (PKCE flow)
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (!error) {
          setStatus('Zalogowano! Przekierowuję...');
          router.push('/');
          return;
        } else {
          setStatus(`Błąd: ${error.message}`);
        }
      }
      
      // Check for error in URL
      const error = urlParams.get('error') || hashParams.get('error');
      const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
      
      if (error) {
        setStatus(`Błąd: ${errorDescription || error}`);
        setTimeout(() => router.push('/login'), 3000);
        return;
      }
      
      // No tokens found - check if already logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
        return;
      }
      
      setStatus('Brak danych logowania. Przekierowuję...');
      setTimeout(() => router.push('/login'), 2000);
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-blue-50">
      <div className="text-center">
        <div className="text-6xl mb-4">🔐</div>
        <p className="text-lg text-gray-600">{status}</p>
      </div>
    </div>
  );
}
