import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ustawienia | Kira Dashboard',
  description: 'Zarządzaj ustawieniami aplikacji Kira Dashboard',
};

/**
 * Settings page (placeholder).
 * Accessible from desktop sidebar only.
 */
export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">⚙️ Ustawienia</h1>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-600">Wkrótce</p>
      </div>
    </div>
  );
}
