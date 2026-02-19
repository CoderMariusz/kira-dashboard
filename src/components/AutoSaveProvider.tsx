'use client';

import React, { useEffect, useState } from 'react';

/**
 * AutoSaveProvider component
 * Handles restoration of auto-saved data on page load
 * Also logs crashes/restarts detected by comparing timestamps
 */
export function AutoSaveProvider({ children }: { children: React.ReactNode }) {
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restoreAutoSavedData = () => {
      try {
        const sessionTimestamp = localStorage.getItem('__autosave_session_timestamp');
        const currentTime = Date.now();

        // Check if this is a recovery from crash
        if (sessionTimestamp) {
          const lastSessionTime = parseInt(sessionTimestamp, 10);
          const timeDiff = currentTime - lastSessionTime;
          
          // If less than 5 minutes passed, likely a crash/reload
          if (timeDiff < 5 * 60 * 1000) {
            console.log('[AutoSave] Detected crash recovery. Time since last session:', timeDiff, 'ms');
            // Trigger recovery notification or log
            const recoveryEvent = new CustomEvent('autosave:recovered', {
              detail: { timeSinceCrash: timeDiff }
            });
            window.dispatchEvent(recoveryEvent);
          }
        }

        // Update session timestamp
        localStorage.setItem('__autosave_session_timestamp', currentTime.toString());
        
        // Log restoration of any saved data
        const keys = Object.keys(localStorage);
        const autoSaveKeys = keys.filter(k => !k.startsWith('__autosave'));
        
        if (autoSaveKeys.length > 0) {
          console.log('[AutoSave] Found auto-saved data for:', autoSaveKeys);
        }

        setIsRestoring(false);
      } catch (error) {
        console.error('[AutoSave] Error during restoration:', error);
        setIsRestoring(false);
      }
    };

    restoreAutoSavedData();
  }, []);

  // Show loading state while restoring
  if (isRestoring) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-lg text-gray-600">Restoring auto-saved data...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
