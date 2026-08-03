/**
 * Détection des mises à jour après déploiement (PWA + version.json).
 * - SW en mode « prompt » : skipWaiting au clic / auto-reload (accueil, 1× max)
 * - Contrôle périodique + focus / visibility
 * - version.json en secours si le SW ne signale pas encore
 * - Garde anti-boucle (Firefox : controllerchange / waiting SW flaky)
 */

type NeedRefreshListener = (needRefresh: boolean) => void

const CHECK_INTERVAL_MS = 5 * 60 * 1000
const AUTO_RELOAD_SESSION_KEY = 'virtuel-rt-auto-reload'
const AUTO_RELOAD_VERSION_KEY = 'virtuel-rt-auto-reload-ver'

let needRefresh = false
let bootVersion: string | null = null
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let initialized = false
let applying = false
/** true uniquement après un applyAppUpdate volontaire (évite reload Firefox spontané). */
let intentionalApply = false
const listeners = new Set<NeedRefreshListener>()

function notify(next: boolean) {
  if (needRefresh === next) return
  needRefresh = next
  listeners.forEach((fn) => fn(needRefresh))
}

function markNeedRefresh() {
  notify(true)
}

function sessionGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function sessionSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // private mode / quota — ignore
  }
}

/** Au plus une auto-actualisation par onglet ; pas de re-reload pour la même version. */
export function canAutoApplyUpdate(): boolean {
  if (sessionGet(AUTO_RELOAD_SESSION_KEY) === '1') return false
  if (bootVersion && sessionGet(AUTO_RELOAD_VERSION_KEY) === bootVersion) return false
  return true
}

function markAutoApplied(): void {
  sessionSet(AUTO_RELOAD_SESSION_KEY, '1')
  if (bootVersion) sessionSet(AUTO_RELOAD_VERSION_KEY, bootVersion)
}

async function checkVersionFile() {
  if (!navigator.onLine) return
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { version?: string }
    if (!data.version || typeof data.version !== 'string') return
    if (!bootVersion) {
      bootVersion = data.version
      return
    }
    if (data.version !== bootVersion) {
      markNeedRefresh()
      void pokeServiceWorker()
    }
  } catch {
    // Hors ligne ou fichier absent — ignorer (jamais de reload)
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

export type ApplyAppUpdateSource = 'user' | 'auto'

/**
 * Applique la mise à jour (skipWaiting + reload, ou reload simple).
 * @returns false si auto-reload refusé (garde anti-boucle) — afficher la bannière.
 */
export function applyAppUpdate(source: ApplyAppUpdateSource = 'user'): boolean {
  if (applying) return source === 'user'

  if (source === 'auto') {
    if (!canAutoApplyUpdate()) return false
    markAutoApplied()
  }

  applying = true
  intentionalApply = true

  // Si un SW attend : skipWaiting → controllerchange → reload.
  // Sinon (ex. écart version.json seul) : fallback reload une seule fois.
  const fallback = window.setTimeout(() => {
    window.location.reload()
  }, 900)

  if (updateSW) {
    void Promise.resolve(updateSW(true)).catch(() => {
      window.clearTimeout(fallback)
      window.location.reload()
    })
    return true
  }

  window.clearTimeout(fallback)
  window.location.reload()
  return true
}

export async function initAppUpdate(): Promise<void> {
  if (initialized || import.meta.env.DEV) return
  initialized = true

  // Reload uniquement si on a demandé l’update (pas sur flip d’état Firefox)
  if ('serviceWorker' in navigator) {
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!intentionalApply) {
        // Nouveau contrôleur sans geste utilisateur → proposer la bannière, ne pas boucler
        markNeedRefresh()
        return
      }
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

        // Debounce les update() Firefox (visibility + focus peuvent spammer)
        let lastPoke = 0
        const poke = () => {
          const now = Date.now()
          if (now - lastPoke < 15_000) return
          lastPoke = now
          void registration.update().catch(() => {})
          void checkVersionFile()
        }

        window.setInterval(poke, CHECK_INTERVAL_MS)

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') poke()
        })
        window.addEventListener('focus', poke)
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
  })
}
