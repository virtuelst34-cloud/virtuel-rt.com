/**
 * Détection des mises à jour après déploiement (PWA + version.json).
 * - SW en mode « prompt » : skipWaiting au clic / auto-reload (accueil, 1× max)
 * - Contrôle périodique + focus / visibility
 * - version.json en secours si le SW ne signale pas encore
 * - Garde anti-boucle (Firefox : controllerchange / waiting SW flaky)
 * - Après apply : mémorise la version pour ne pas réafficher la bannière
 */

type NeedRefreshListener = (needRefresh: boolean) => void

const CHECK_INTERVAL_MS = 5 * 60 * 1000
const APPLY_FALLBACK_MS = 1200
const AUTO_RELOAD_SESSION_KEY = 'virtuel-rt-auto-reload'
const AUTO_RELOAD_VERSION_KEY = 'virtuel-rt-auto-reload-ver'
/** Version déjà appliquée (ou en cours d’apply) — ne pas re-proposer. */
const APPLIED_VERSION_KEY = 'virtuel-rt-applied-ver'
/** Apply en cours / juste fait avant que version.json soit connu. */
const PENDING_APPLY_KEY = 'virtuel-rt-pending-apply'
/** Dismiss temporaire (« Plus tard ») pour une version.json donnée. */
const DISMISSED_VERSION_KEY = 'virtuel-rt-dismissed-ver'

let needRefresh = false
/** Version du shell au premier check réussi (ou après apply réussi). */
let bootVersion: string | null = null
/** Dernière version vue sur le réseau (peut différer de bootVersion). */
let remoteVersion: string | null = null
let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined
let initialized = false
let applying = false
/** true uniquement après un applyAppUpdate volontaire (évite reload Firefox spontané). */
let intentionalApply = false
/** Timer hard-navigate si skipWaiting / controllerchange ne vient pas. */
let applyFallbackTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<NeedRefreshListener>()

function notify(next: boolean) {
  if (needRefresh === next) return
  needRefresh = next
  listeners.forEach((fn) => fn(needRefresh))
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

function sessionRemove(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function rememberedVersion(): string | null {
  return remoteVersion || bootVersion
}

function isVersionHandled(version: string | null | undefined): boolean {
  if (sessionGet(PENDING_APPLY_KEY) === '1') return true
  if (!version) return false
  return (
    sessionGet(APPLIED_VERSION_KEY) === version ||
    sessionGet(DISMISSED_VERSION_KEY) === version
  )
}

function markNeedRefresh() {
  const target = rememberedVersion()
  if (isVersionHandled(target)) {
    notify(false)
    return
  }
  notify(true)
}

/** Au plus une auto-actualisation par onglet ; pas de re-reload pour la même version. */
export function canAutoApplyUpdate(): boolean {
  if (sessionGet(AUTO_RELOAD_SESSION_KEY) === '1') return false
  if (bootVersion && sessionGet(AUTO_RELOAD_VERSION_KEY) === bootVersion) return false
  if (isVersionHandled(rememberedVersion())) return false
  return true
}

function markAutoApplied(): void {
  sessionSet(AUTO_RELOAD_SESSION_KEY, '1')
  const ver = rememberedVersion()
  if (ver) sessionSet(AUTO_RELOAD_VERSION_KEY, ver)
}

function rememberAppliedVersion(): void {
  sessionSet(PENDING_APPLY_KEY, '1')
  const ver = rememberedVersion()
  if (ver) {
    sessionSet(APPLIED_VERSION_KEY, ver)
    sessionRemove(DISMISSED_VERSION_KEY)
  }
}

function adoptRemoteAsApplied(version: string): void {
  bootVersion = version
  remoteVersion = version
  sessionSet(APPLIED_VERSION_KEY, version)
  sessionRemove(PENDING_APPLY_KEY)
  sessionRemove(DISMISSED_VERSION_KEY)
  notify(false)
}

function clearApplyFallback(): void {
  if (applyFallbackTimer != null) {
    window.clearTimeout(applyFallbackTimer)
    applyFallbackTimer = null
  }
}

/** Navigation cache-bust (contourne un SW qui sert encore l’ancien index). */
function hardNavigateFresh(): void {
  clearApplyFallback()
  const { origin, pathname, hash } = window.location
  window.location.href = `${origin}${pathname}?v=${Date.now()}${hash}`
}

async function activateWaitingWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const waiting = reg?.waiting
    if (!waiting) return false
    waiting.postMessage({ type: 'SKIP_WAITING' })
    return true
  } catch {
    return false
  }
}

async function checkVersionFile() {
  if (!navigator.onLine) return
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const data = (await res.json()) as { version?: string }
    if (!data.version || typeof data.version !== 'string') return

    remoteVersion = data.version

    // Juste après un Actualiser : adopter la version réseau, ne jamais re-banner
    if (sessionGet(PENDING_APPLY_KEY) === '1') {
      adoptRemoteAsApplied(data.version)
      return
    }

    if (!bootVersion) {
      bootVersion = data.version
      if (sessionGet(APPLIED_VERSION_KEY) === data.version) {
        notify(false)
      }
      return
    }

    if (data.version === bootVersion) {
      if (sessionGet(APPLIED_VERSION_KEY) === data.version) notify(false)
      return
    }

    // Nouvelle version réseau
    if (sessionGet(APPLIED_VERSION_KEY) === data.version) {
      adoptRemoteAsApplied(data.version)
      return
    }

    if (sessionGet(DISMISSED_VERSION_KEY) === data.version) {
      notify(false)
      return
    }

    markNeedRefresh()
    void pokeServiceWorker()
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

/** Masque la bannière pour la version courante jusqu’à une nouvelle build. */
export function dismissAppUpdate(): void {
  const ver = rememberedVersion()
  if (ver) sessionSet(DISMISSED_VERSION_KEY, ver)
  notify(false)
}

export type ApplyAppUpdateSource = 'user' | 'auto'

/**
 * Applique la mise à jour (skipWaiting + reload, ou hard navigate).
 * @returns false si auto-reload refusé (garde anti-boucle) — afficher la bannière.
 */
export function applyAppUpdate(source: ApplyAppUpdateSource = 'user'): boolean {
  if (applying) {
    // 2ᵉ clic pendant un apply coincé → forcer hard navigate
    if (source === 'user') {
      hardNavigateFresh()
      return true
    }
    return false
  }

  if (source === 'auto') {
    if (!canAutoApplyUpdate()) return false
    markAutoApplied()
  }

  applying = true
  intentionalApply = true
  rememberAppliedVersion()
  // Bannière disparait immédiatement (avant reload)
  notify(false)

  clearApplyFallback()
  applyFallbackTimer = window.setTimeout(() => {
    applyFallbackTimer = null
    hardNavigateFresh()
  }, APPLY_FALLBACK_MS)

  void (async () => {
    try {
      await activateWaitingWorker()
      if (updateSW) {
        await Promise.resolve(updateSW(true))
        // updateSW(true) peut résoudre sans controllerchange (pas de SW waiting) :
        // le timeout hard-navigate s’occupe du reste.
        return
      }
      hardNavigateFresh()
    } catch {
      hardNavigateFresh()
    }
  })()

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
      // Une seule navigation après apply intentionnel (annule le fallback)
      hardNavigateFresh()
    })
  }

  try {
    const { registerSW } = await import('virtual:pwa-register')
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Ne pas re-proposer une version déjà appliquée / dismissée
        if (isVersionHandled(rememberedVersion())) {
          notify(false)
          return
        }
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
