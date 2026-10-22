import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import './styles/global.css';
import App from './App.jsx';
import { aplicarApariencia } from './services/apariencia.js';
import { iniciarInstalacion } from './services/instalacion.js';

aplicarApariencia();
iniciarInstalacion();

// PWA-02: service worker propio. Se actualiza solo cuando hay una versión nueva.
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // En desarrollo no hay service worker: se quita el de un build anterior en este puerto,
    // porque si no seguiría entregando la versión vieja guardada en caché.
    navigator.serviceWorker.getRegistrations().then((registros) => registros.forEach((r) => r.unregister()));
    caches?.keys().then((claves) => claves.forEach((c) => caches.delete(c)));
  } else {
    registerSW({ immediate: true });
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
