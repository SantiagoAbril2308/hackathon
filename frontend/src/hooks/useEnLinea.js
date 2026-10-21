import { useSyncExternalStore } from 'react';

function suscribir(aviso) {
  window.addEventListener('online', aviso);
  window.addEventListener('offline', aviso);
  return () => {
    window.removeEventListener('online', aviso);
    window.removeEventListener('offline', aviso);
  };
}

export function useEnLinea() {
  return useSyncExternalStore(suscribir, () => navigator.onLine, () => true);
}
