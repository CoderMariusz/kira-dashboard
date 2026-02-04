'use client';

/**
 * Offline fallback page.
 *
 * Shown by the Service Worker when navigation fails due to no network.
 * Uses only inline styles and no external resources to work fully offline.
 *
 * @route /offline
 */
export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gray-50">
      <div className="text-6xl mb-4">📡</div>
      <h1 className="text-2xl font-bold mb-2 text-gray-900">Jesteś offline</h1>
      <p className="text-gray-600 max-w-md mb-6">
        Wygląda na to, że nie masz połączenia z internetem.
        Niektóre funkcje mogą być niedostępne.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Spróbuj ponownie
      </button>
    </div>
  );
}
