import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoutButton } from '@/components/logout-button';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <div className="flex justify-end mb-4">
            <LogoutButton />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏠 Kira Dashboard
          </h1>
          <p className="text-gray-600">
            Witaj, {user.email}!
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/home">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-3xl">🏠</span>
                  Dom
                </CardTitle>
                <CardDescription>
                  Zadania domowe, remont, sprzątanie
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  3 kolumny: Pomysły → W realizacji → Zrobione
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/work">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-3xl">💼</span>
                  Praca
                </CardTitle>
                <CardDescription>
                  Projekty, spotkania, zadania służbowe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  4 kolumny: Pomysł → Plan → W realizacji → Zrobione
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/shopping">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-3xl">🛒</span>
                  Zakupy
                </CardTitle>
                <CardDescription>
                  Lista zakupów z kategoriami
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Kategoryzacja, progress bar, real-time sync
                </p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/activity">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-3xl">📊</span>
                  Aktywność
                </CardTitle>
                <CardDescription>
                  Historia zmian i działań
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Kto, co, kiedy — pełna historia
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Powered by Kira 🦊</p>
        </footer>
      </div>
    </main>
  );
}
