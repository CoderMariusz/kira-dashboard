/**
 * Active Sessions Component
 * Displays a list of all active sessions with device, IP, location, and last activity
 */

'use client';

import { useSessions } from '@/lib/hooks/useSessions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { pl } from 'date-fns/locale';

export function ActiveSessions() {
  const { sessions, isLoading, error } = useSessions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-sm text-red-700">⚠️ {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No active sessions found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <Card key={session.id} className={session.isCurrentDevice ? 'border-blue-200 bg-blue-50' : ''}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {/* Device */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground">DEVICE</p>
                <p className="mt-1 text-sm font-medium">
                  {session.device}
                  {session.isCurrentDevice && (
                    <span className="ml-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                      Current
                    </span>
                  )}
                </p>
              </div>

              {/* IP Address */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground">IP ADDRESS</p>
                <p className="mt-1 text-sm font-mono text-muted-foreground">{session.ip}</p>
              </div>

              {/* Location */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground">LOCATION</p>
                <p className="mt-1 text-sm text-muted-foreground">📍 {session.location}</p>
              </div>

              {/* Last Activity */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground">LAST ACTIVITY</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(session.lastActivity), {
                    addSuffix: true,
                    locale: pl,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
