import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import {
  applyAppUpdate,
  canAutoApplyUpdate,
  subscribeAppUpdate,
} from '@/lib/appUpdate'

interface AppUpdateBannerProps {
  /**
   * Sur l’écran d’accueil : une seule auto-actualisation (sessionStorage).
   * Si la garde bloque, on affiche « Actualiser » au lieu de reboucler.
   */
  autoApply?: boolean
}

/**
 * Bannière FR quand un nouveau build est prêt.
 * Mid-session : toujours demander via « Actualiser » (pas d’idle auto-reload).
 */
export default function AppUpdateBanner({ autoApply = false }: AppUpdateBannerProps) {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => subscribeAppUpdate(setNeedRefresh), [])

  useEffect(() => {
    if (!needRefresh) {
      setShowBanner(false)
      return
    }

    if (!autoApply) {
      setShowBanner(true)
      return
    }

    // Accueil : auto-reload au plus une fois par session
    if (!canAutoApplyUpdate()) {
      setShowBanner(true)
      return
    }

    const ok = applyAppUpdate('auto')
    if (!ok) setShowBanner(true)
    // Si ok → navigation en cours ; pas de bannière
  }, [needRefresh, autoApply])

  if (!needRefresh || !showBanner) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[3000] flex justify-center p-3 pointer-events-none safe-area-pad"
    >
      <div className="pointer-events-auto flex items-center gap-3 max-w-lg w-full sm:w-auto rounded-2xl border border-primary/40 bg-card/95 backdrop-blur-md px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] animate-in fade-in slide-in-from-top-2 duration-300">
        <p className="text-sm text-foreground flex-1 min-w-0">
          Une mise à jour est disponible
        </p>
        <button
          type="button"
          onClick={() => applyAppUpdate('user')}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors touch-target"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden />
          Actualiser
        </button>
      </div>
    </div>
  )
}
