'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SetupMode = 'choose' | 'create' | 'join';

export default function SetupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SetupMode>('choose');
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!householdName.trim()) {
      setError('Nazwa gospodarstwa domowego jest wymagana');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Nie jesteś zalogowany');
        setLoading(false);
        return;
      }

      // Create household
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: household, error: householdError } = await (supabase as any)
        .from('households')
        .insert([{
          name: householdName.trim(),
        }])
        .select()
        .single();

      if (householdError) {
        console.error('Household creation error:', householdError);
        setError(`Błąd tworzenia gospodarstwa: ${householdError.message}`);
        setLoading(false);
        return;
      }

      // Update user profile with household_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ household_id: household.id })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        setError(`Błąd aktualizacji profilu: ${profileError.message}`);
        setLoading(false);
        return;
      }

      // Success - redirect to home
      router.push('/');
    } catch (err) {
      console.error('Setup error:', err);
      setError('Wystąpił nieoczekiwany błąd');
      setLoading(false);
    }
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setError('Kod zaproszenia jest wymagany');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Nie jesteś zalogowany');
        setLoading(false);
        return;
      }

      // Find household by invite code
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: household, error: householdError } = await (supabase as any)
        .from('households')
        .select('id')
        .eq('invite_code', inviteCode.trim())
        .single();

      if (householdError || !household) {
        setError('Nieprawidłowy kod zaproszenia');
        setLoading(false);
        return;
      }

      // Update user profile with household_id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({ household_id: household.id })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        setError(`Błąd aktualizacji profilu: ${profileError.message}`);
        setLoading(false);
        return;
      }

      // Success - redirect to home
      router.push('/');
    } catch (err) {
      console.error('Join error:', err);
      setError('Wystąpił nieoczekiwany błąd');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🏠</div>
          <CardTitle className="text-2xl">Skonfiguruj Gospodarstwo Domowe</CardTitle>
          <CardDescription>
            {mode === 'choose' && 'Utwórz nowe lub dołącz do istniejącego'}
            {mode === 'create' && 'Utwórz nowe gospodarstwo domowe'}
            {mode === 'join' && 'Dołącz do istniejącego'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === 'choose' && (
            <div className="space-y-4">
              <Button
                onClick={() => setMode('create')}
                className="w-full"
                size="lg"
              >
                ➕ Utwórz Nowe Gospodarstwo
              </Button>
              <Button
                onClick={() => setMode('join')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                🔗 Dołącz do Istniejącego
              </Button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreateHousehold} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="householdName">Nazwa Gospodarstwa</Label>
                <Input
                  id="householdName"
                  type="text"
                  placeholder="np. Rodzina Kowalskich"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Tworzenie...' : 'Utwórz Gospodarstwo'}
              </Button>

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('choose')}
                className="w-full"
              >
                ← Wróć
              </Button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoinHousehold} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Kod Zaproszenia</Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="Wpisz kod otrzymany od członka rodziny"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-xs text-gray-500">
                  Poproś członka rodziny o kod zaproszenia z ustawień
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Dołączanie...' : 'Dołącz do Gospodarstwa'}
              </Button>

              {error && (
                <p className="text-sm text-red-600 text-center">{error}</p>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode('choose')}
                className="w-full"
              >
                ← Wróć
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
