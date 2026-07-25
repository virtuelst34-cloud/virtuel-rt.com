/**
 * Détection des mises à jour après déploiement (PWA + version.json).
 * - SW en mode « prompt » : skipWaiting au clic / auto-reload
 * - Contrôle périodique + focus / visibility
 * - version.json en secours si le SW ne signale pas encore
 */

type NeedRefreshListener = (needRefresh: boolean) => void

const CHECK_INTERVAL_MS = 5 * 60 * 1000
const IDLE_AUTO_APPLY_MS = 3 * 60 * 1000

let needRefresh = false
let bootVersion: string | null = null
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let initialized = false
const listeners = new Set<NeedRefreshListener>()

function notify(next: boolean) {
  if (needRefresh === next) return
  needRefresh = next
  listeners.forEach((fn) => fn(needRefresh))
}

function markNeedRefresh() {
  notify(true)
}

async function checkVersionFile() {
  if (!navigator.onLine) return
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { version?: string }
    if (!data.version) return
    if (!bootVersion) {
      bootVersion = data.version
      return
    }
    if (data.version !== bootVersion) {
      markNeedRefresh()
      void pokeServiceWorker()
    }
  } catch {
    // Hors ligne ou fichier absent — ignorer
  }
}

async function pokeServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    await reg?.update()
  } catch {
    // ignore
  }
}

export function subscribeAppUpdate(listener: NeedRefreshListener): () => void {
  listeners.add(listener)
  listener(needRefresh)
  return () => {
    listeners.delete(listener)
  }
}

export function getAppUpdateNeeded(): boolean {
  return needRefresh
}

/** Applique la mise à jour (skipWaiting + reload, ou reload simple). */
export function applyAppUpdate(): void {
  // Si un SW attend : skipWaiting → controllerchange → reload.
  // Sinon (ex. écart version.json seul) : fallback reload.
  const fallback = window.setTimeout(() => {
    window.location.reload()
  }, 700)

  if (updateSW) {
    void Promise.resolve(updateSW(true)).catch(() => {
      window.clearTimeout(fallback)
      window.location.reload()
    })
    return
  }

  window.clearTimeout(fallback)
  window.location.reload()
}

/**
 * Si une MAJ est disponible et que l’utilisateur est idle (accueil / inactif),
 * actualise sans demander.
 */
export function armIdleAutoApply(enabled: boolean): () => void {
  if (!enabled) return () => {}

  let idleTimer: ReturnType<typeof setTimeout> | null = null

  const clear = () => {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  const schedule = () => {
    clear()
    if (!needRefresh) return
    idleTimer = setTimeout(() => {
      if (needRefresh) applyAppUpdate()
    }, IDLE_AUTO_APPLY_MS)
  }

  const onActivity = () => {
    if (needRefresh) schedule()
  }

  const unsub = subscribeAppUpdate((needed) => {
    if (needed) schedule()
    else clear()
  })

  const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const
  events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }))

  schedule()

  return () => {
    unsub()
    clear()
    events.forEach((ev) => window.removeEventListener(ev, onActivity))
  }
}

export async function initAppUpdate(): Promise<void> {
  if (initialized || import.meta.env.DEV) return
  initialized = true

  // Reload une fois quand le nouveau SW prend le contrôle
  if ('serviceWorker' in navigator) {
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }

  try {
    const { registerSW } = await import('virtual:pwa-register')
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        markNeedRefresh()
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return

        const runChecks = () => {
          void registration.update()
          void checkVersionFile()
        }

        window.setInterval(runChecks, CHECK_INTERVAL_MS)

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') runChecks()
        })
        window.addEventListener('focus', runChecks)
      },
    })
  } catch {
    // Pas de module PWA (build sans plugin) — version.json seul
  }

  void checkVersionFile()
  window.setInterval(() => {
    void checkVersionFile()
  }, CHECK_INTERVAL_MS)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkVersionFile()
  })
  window.addEventListener('focus', () => {
    void checkVersionFile()
    void pokeServiceWorker()
  })
}
