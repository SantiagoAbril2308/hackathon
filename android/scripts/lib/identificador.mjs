import bubblewrap from '@bubblewrap/core';
import { guardarEnDistribucion, validarUrlPublica } from './config.mjs';

const { util } = bubblewrap;

/**
 * Identificador Android (packageId). Si distribucion.json no lo define, se deriva del dominio con la
 * convención de Bubblewrap (dominio invertido + ".twa"). Una vez distribuida la APK no debe cambiar:
 * Android trata otro identificador como otra aplicación.
 */
export function resolverPackageId(distribucion, { fijar = false } = {}) {
  if (distribucion.packageId) {
    const error = util.validatePackageId(distribucion.packageId);
    if (error) throw new Error(`packageId no válido en distribucion.json: ${error}`);
    return { packageId: distribucion.packageId, derivado: false };
  }
  const origen = validarUrlPublica(distribucion.urlWeb, { etiqueta: 'urlWeb', soloOrigen: true });
  const packageId = util.generatePackageId(new URL(origen).hostname);
  if (!packageId || util.validatePackageId(packageId)) throw new Error('No se pudo derivar un packageId válido del dominio.');
  if (fijar) guardarEnDistribucion('packageId', packageId);
  return { packageId, derivado: true };
}
