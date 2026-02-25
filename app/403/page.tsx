export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d0c1a] text-[#e6edf3]">
      <h1 className="text-4xl font-bold text-[#ef4444]">403</h1>
      <h2 className="text-xl">Brak dostępu</h2>
      <p className="text-[#4b4569]">Ta sekcja wymaga uprawnień Administratora.</p>
      <a href="/dashboard" className="text-[#818cf8] hover:underline">← Wróć do dashboardu</a>
    </main>
  )
}
