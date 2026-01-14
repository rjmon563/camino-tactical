import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import 'leaflet/dist/leaflet.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Registrar service worker generado por vite-plugin-pwa (usa virtual:pwa-register)
import('virtual:pwa-register').then(({ registerSW }) => {
  registerSW({ immediate: true });
}).catch(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/pwa-sw.js')
        .then(reg => console.log('Service Worker registrado:', reg.scope))
        .catch(err => console.warn('Fallo registro Service Worker:', err));
    });
  }
});
