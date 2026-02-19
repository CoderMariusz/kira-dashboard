// app/home/analytics/page.tsx
// Route: /home/analytics
// Dostęp: HELPER_PLUS i ADMIN — HELPER widzi komunikat z PermissionGate

import { PermissionGate } from '@/components/auth/PermissionGate';
import { AnalyticsContent } from '@/components/home/analytics/AnalyticsContent';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#1a1730' }}>
      <PermissionGate
        require="canAccessAnalytics"
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
            <span style={{ fontSize: '32px' }} className="mb-4 block">📊</span>
            <h2
              className="font-bold mb-2"
              style={{ color: '#e6edf3', fontSize: '16px', fontWeight: 700 }}
            >
              Analytics dostępne dla HELPER+ i Admin
            </h2>
            <p style={{ color: '#6b7280', fontSize: '13px' }} className="max-w-sm">
              Skontaktuj się z administratorem household, aby uzyskać dostęp do analityki.
            </p>
          </div>
        }
      >
        <AnalyticsContent />
      </PermissionGate>
    </div>
  );
}
