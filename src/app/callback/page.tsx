'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Weryfikuję...');
  const [debug, setDebug] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();
        
        // Debug info
        const fullUrl = window.location.href;
        const hash = window.location.hash;
        const search = window.location.search;
        setDebug(`URL: ${fullUrl.substring(0, 100)}...`);
        
        // Check for hash fragment (magic link returns tokens in hash)
        if (hash && hash.length > 1) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const error = hashParams.get('error');
          const errorDesc = hashParams.get('error_description');
          
          if (error) {
            setStatus(`Błąd: ${errorDesc || error}`);
            setTimeout(() => router.push('/login'), 3000);
            return;
          }
          
          if (accessToken && refreshToken) {
            setStatus('Ustawiam sesję...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (!sessionError) {
              setStatus('Zalogowano! Przekierowuję...');
              router.push('/');
              return;
            } else {
              setStatus(`Błąd sesji: ${sessionError.message}`);
              setTimeout(() => router.push('/login'), 3000);
              return;
            }
          }
        }
        
        // Check for code in query params (PKCE flow)
        if (search) {
          const urlParams = new URLSearchParams(search);
          const code = urlParams.get('code');
          const error = urlParams.get('error');
          const errorDesc = urlParams.get('error_description');
          
          if (error) {
            setStatus(`Błąd: ${errorDesc || error}`);
            setTimeout(() => router.push('/login'), 3000);
            return;
          }
          
          if (code) {
            setStatus('Wymieniam kod na sesję...');
            const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (!codeError) {
              setStatus('Zalogowano! Przekierowuję...');
              router.push('/');
              return;
            } else {
              setStatus(`Błąd kodu: ${codeError.message}`);
              setTimeout(() => router.push('/login'), 3000);
              return;
            }
          }
        }
        
        // Check if already logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('Już zalogowany! Przekierowuję...');
          router.push('/');
          return;
        }
        
        // Nothing found
        setStatus('Brak danych logowania');
        setDebug(`Hash: ${hash}, Search: ${search}`);
        setTimeout(() => router.push('/login'), 3000);
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setStatus(`Wyjątek: ${errorMessage}`);
        setTimeout(() => router.push('/login'), 5000);
      }
    };

    // Run after a small delay to ensure client hydration
    const timer = setTimeout(handleCallback, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-blue-50">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🔐</div>
        <p className="text-lg text-gray-600 mb-2">{status}</p>
        {debug && <p className="text-xs text-gray-400 max-w-md break-all">{debug}</p>}
      </div>
    </div>
  );
}
