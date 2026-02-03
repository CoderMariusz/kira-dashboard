'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(`Błąd: ${error.message}`);
    } else {
      setMessage('Zalogowano! Przekierowuję...');
      router.push('/');
    }
    
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    if (error) {
      setMessage(`Błąd: ${error.message}`);
    } else {
      setMessage('Sprawdź email! Wysłaliśmy link do logowania.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <CardTitle className="text-2xl">Kira Dashboard</CardTitle>
          <CardDescription>
            Zarządzanie zadaniami domowymi i pracowymi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="twoj@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Hasło</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logowanie...' : 'Zaloguj się'}
              </Button>

              {message && (
                <p className={`text-sm text-center ${message.includes('Błąd') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </p>
              )}
              
              <p className="text-center text-sm text-gray-500">
                <button 
                  type="button"
                  onClick={() => setMode('magic')}
                  className="text-blue-600 hover:underline"
                >
                  Użyj magic link zamiast hasła
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="twoj@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Wysyłanie...' : 'Wyślij link logowania'}
              </Button>

              {message && (
                <p className={`text-sm text-center ${message.includes('Błąd') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </p>
              )}
              
              <p className="text-center text-sm text-gray-500">
                <button 
                  type="button"
                  onClick={() => setMode('password')}
                  className="text-blue-600 hover:underline"
                >
                  Użyj hasła zamiast magic link
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
