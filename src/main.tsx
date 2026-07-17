import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import '@/lib/sentry'

// Après un déploiement, d’anciens chunks hashés peuvent 404 → recharger une fois
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const key = 'virtuel-rt-chunk-reload'
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, '1')
    window.location.reload()
  }
})

// Nouveau SW activé → recharger pour prendre le build frais
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

// PWA : VitePWA injecte déjà registerSW.js. En local, désenregistrer tout SW résiduel.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.DEV) {
      void navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => void reg.unregister())
      })
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
