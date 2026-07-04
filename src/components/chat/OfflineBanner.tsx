import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineMode } from '@/lib/offlineMode';

export default function OfflineBanner() {
  const { isOnline, pendingCount, forceSync } = useOfflineMode();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 text-amber-200 text-xs"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          {!isOnline
            ? 'Mode hors ligne — vos messages seront envoyés à la reconnexion'
            : `${pendingCount} message${pendingCount > 1 ? 's' : ''} en attente de synchronisation`}
        </span>
      </div>
      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={() => void forceSync()}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          Synchroniser
        </button>
      )}
    </div>
  );
}
