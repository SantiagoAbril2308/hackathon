import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { _reiniciarConexion } from './services/almacen.js';
import { _reiniciarDirectorio } from './hooks/useDirectorio.js';

if (!window.matchMedia) {
  window.matchMedia = (consulta) => ({
    matches: false,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  });
}
Element.prototype.scrollIntoView ??= () => {};
window.scrollTo = () => {};

beforeEach(() => {
  // Cada prueba empieza con IndexedDB, almacenamiento y estado del directorio limpios.
  globalThis.indexedDB = new IDBFactory();
  _reiniciarConexion();
  _reiniciarDirectorio();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('rs-bienvenida-vista', '1');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
