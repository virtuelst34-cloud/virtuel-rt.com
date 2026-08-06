import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import '@/lib/sentry'
import { initAppUpdate } from '@/lib/appUpdate'

// Après un déploiement, d’anciens chunks hashés peuvent 404 → recharger une fois (prod only)
if (!import.meta.env.DEV) {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    const key = 'virtuel-rt-chunk-reload'
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      window.location.reload()
    }
  })
}

// PWA : enregistrement + détection de MAJ (prod uniquement — no-op en DEV)
void initAppUpdate()

// En local : désenregistrer SW + vider caches immédiatement (pas attendre load)
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => void reg.unregister())
  })
  if ('caches' in window) {
    void caches.keys().then((keys) => {
      keys.forEach((key) => void caches.delete(key))
    })
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
