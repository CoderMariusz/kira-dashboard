'use client';

import { useEffect, useState } from 'react';

/**
 * PWA install prompt component.
 *
 * Intercepts the `beforeinstallprompt` event and shows a custom UI
 * prompting the user to install the app on their home screen.
 * Only visible on Chrome/Edge (iOS Safari requires manual "Add to Home Screen").
 *
 * @component
 */
export function InstallPrompt() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50">
      <p className="font-medium mb-2">📱 Zainstaluj Kira Dashboard</p>
      <p className="text-sm mb-3 opacity-90">
        Dodaj do ekranu głównego dla szybkiego dostępu
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleInstall}
          className="flex-1 bg-white text-blue-500 px-4 py-2 rounded font-medium hover:bg-blue-50"
        >
          Zainstaluj
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="px-4 py-2 rounded border border-white/30 hover:bg-blue-600"
        >
          Później
        </button>
      </div>
    </div>
  );
}
