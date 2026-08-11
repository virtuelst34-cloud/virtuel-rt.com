/**
 * Détection des mises à jour après déploiement (PWA + version.json).
 * - Version du shell = VITE_APP_VERSION (injectée au build dans le JS)
 * - version.json réseau = version déployée
 * - Bannière si remote !== shell (évite le faux « déjà à jour » quand le SW sert un vieux index)
 * - Actualiser : skipWaiting + purge caches + navigation cache-bust
 */

type NeedRefreshListener = (needRefresh: boolean) => void

const CHECK_INTERVAL_MS = 5 * 60 * 1000
const APPLY_FALLBACK_MS = 1200
const AUTO_RELOAD_SESSION_KEY = 'virtuel-rt-auto-reload'
const AUTO_RELOAD_VERSION_KEY = 'virtuel-rt-auto-reload-ver'
/** Version déjà appliquée avec succès (shell === remote). */
const APPLIED_VERSION_KEY = 'virtuel-rt-applied-ver'
/** Apply en cours — vérifié au boot suivant. */
const PENDING_APPLY_KEY = 'virtuel-rt-pending-apply'
/** Dismiss temporaire (« Plus tard ») pour une version.json donnée. */
const DISMISSED_VERSION_KEY = 'virtuel-rt-dismissed-ver'

let needRefresh = false
/** Version du JS réellement chargé (bundle). */
let shellVersion: string | null =
  typeof import.meta.env.VITE_APP_VERSION === 'string' && import.meta.env.VITE_APP_VERSION
    ? import.meta.env.VITE_APP_VERSION
    : null
/** Dernière version vue sur le réseau (version.json). */
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

function targetVersion(): string | null {
  return remoteVersion || shellVersion
}

function isVersionHandled(version: string | null | undefined): boolean {
  if (!version) return false
  // Un apply en cours ne bloque la bannière QUE si le shell a déjà rattrapé
  if (sessionGet(PENDING_APPLY_KEY) === '1' && shellVersion && version === shellVersion) {
    return true
  }
  return (
    sessionGet(APPLIED_VERSION_KEY) === version ||
    sessionGet(DISMISSED_VERSION_KEY) === version
  )
}

function markNeedRefresh() {
  const target = targetVersion()
  if (isVersionHandled(target)) {
    notify(false)
    return
  }
  if (remoteVersion && shellVersion && remoteVersion === shellVersion) {
    notify(false)
    return
  }
  notify(true)
}

/** Au plus une auto-actualisation par onglet ; pas de re-reload pour la même version. */
export function canAutoApplyUpdate(): boolean {
  // Jamais d’auto-reload en DEV (évite boucles SW / HMR / banner)
  if (import.meta.env.DEV) return false
  if (sessionGet(AUTO_RELOAD_SESSION_KEY) === '1') return false
  const target = targetVersion()
  if (target && sessionGet(AUTO_RELOAD_VERSION_KEY) === target) return false
  if (isVersionHandled(target)) return false
  return true
}

function markAutoApplied(): void {
  sessionSet(AUTO_RELOAD_SESSION_KEY, '1')
  const ver = targetVersion()
  if (ver) sessionSet(AUTO_RELOAD_VERSION_KEY, ver)
}

function rememberPendingApply(): void {
  sessionSet(PENDING_APPLY_KEY, '1')
  const ver = targetVersion()
  if (ver) {
    // Ne pas marquer APPLIED tant que le shell n’a pas confirmé
    sessionRemove(DISMISSED_VERSION_KEY)
  }
}

function adoptRemoteAsApplied(version: string): void {
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

/** Purge les caches Workbox pour que le prochain index.html / chunks viennent du réseau. */
async function clearAppCaches(): Promise<void> {
  if (!('caches' in window)) return
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  } catch {
    // ignore
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

    // Après Actualiser : succès seulement si le JS chargé = version déployée
    if (sessionGet(PENDING_APPLY_KEY) === '1') {
      if (shellVersion && data.version === shellVersion) {
        adoptRemoteAsApplied(data.version)
        return
      }
      // Échec soft-update : encore l’ancien shell → re-proposer la bannière
      sessionRemove(PENDING_APPLY_KEY)
      sessionRemove(APPLIED_VERSION_KEY)
      markNeedRefresh()
      return
    }

    if (!shellVersion) {
      // Build sans VITE_APP_VERSION (tests / edge) — fallback historique
      shellVersion = data.version
      if (sessionGet(APPLIED_VERSION_KEY) === data.version) notify(false)
      return
    }

    if (data.version === shellVersion) {
      if (sessionGet(APPLIED_VERSION_KEY) === data.version) {
        notify(false)
      } else {
        // À jour : mémoriser pour ne pas flasher la bannière au prochain focus
        sessionSet(APPLIED_VERSION_KEY, data.version)
        notify(false)
      }
      return
    }

    // remote !== shell → vraie mise à jour disponible
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
  const ver = targetVersion()
  if (ver) sessionSet(DISMISSED_VERSION_KEY, ver)
  notify(false)
}

export type ApplyAppUpdateSource = 'user' | 'auto'

/**
 * Applique la mise à jour (skipWaiting + purge caches + reload).
 * @returns false si auto-reload refusé (garde anti-boucle) — afficher la bannière.
 */
export function applyAppUpdate(source: ApplyAppUpdateSource = 'user'): boolean {
  // En DEV : aucun reload agressif (SW résiduel / banner ne doivent pas boucler)
  if (import.meta.env.DEV) {
    notify(false)
    return false
  }

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
  rememberPendingApply()
  // Bannière disparait immédiatement (avant reload)
  notify(false)

  clearApplyFallback()
  applyFallbackTimer = window.setTimeout(() => {
    applyFallbackTimer = null
    void clearAppCaches().finally(() => {
      hardNavigateFresh()
    })
  }, APPLY_FALLBACK_MS)

  void (async () => {
    try {
      await activateWaitingWorker()
      if (updateSW) {
        await Promise.resolve(updateSW(true))
        // updateSW(true) peut résoudre sans controllerchange (pas de SW waiting) :
        // le timeout hard-navigate (+ purge caches) s’occupe du reste.
        return
      }
      await clearAppCaches()
      hardNavigateFresh()
    } catch {
      await clearAppCaches()
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
      void clearAppCaches().finally(() => {
        hardNavigateFresh()
      })
    })
  }

  try {
    const { registerSW } = await import('virtual:pwa-register')
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Ne pas re-proposer une version déjà appliquée / dismissée
        if (isVersionHandled(targetVersion())) {
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

/** @internal tests */
export function __resetAppUpdateForTests(options?: {
  shellVersion?: string | null
}): void {
  needRefresh = false
  shellVersion =
    options?.shellVersion !== undefined
      ? options.shellVersion
      : typeof import.meta.env.VITE_APP_VERSION === 'string' && import.meta.env.VITE_APP_VERSION
        ? import.meta.env.VITE_APP_VERSION
        : null
  remoteVersion = null
  updateSW = undefined
  initialized = false
  applying = false
  intentionalApply = false
  clearApplyFallback()
  listeners.clear()
}

/** @internal tests — expose check for unit tests */
export async function __checkVersionFileForTests(): Promise<void> {
  await checkVersionFile()
}
