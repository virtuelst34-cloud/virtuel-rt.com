import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App'
import '@/index.css'
import '@/lib/sentry'

// Enregistrement du service worker pour PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker enregistré avec succès:', registration.scope);
      })
      .catch(error => {
        console.log('Erreur lors de l\'enregistrement du Service Worker:', error);
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
