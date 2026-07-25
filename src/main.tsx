import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import '@/lib/sentry'
import { initAppUpdate } from '@/lib/appUpdate'

// Après un déploiement, d’anciens chunks hashés peuvent 404 → recharger une fois
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const key = 'virtuel-rt-chunk-reload'
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1')
    window.location.reload()
  }
})

// PWA : enregistrement + détection de MAJ (prod uniquement)
void initAppUpdate()

// En local, désenregistrer tout SW résiduel (évite un vieux cache en dev)
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => void reg.unregister())
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
