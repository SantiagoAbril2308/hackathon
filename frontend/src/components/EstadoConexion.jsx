import { Wifi, WifiOff } from 'lucide-react';
import { fechaHora, haceCuanto } from '../services/formato.js';
import { useEnLinea } from '../hooks/useEnLinea.js';

/** "Disponible sin conexión · Última actualización: <fecha>". */
export default function EstadoConexion({ guardadoEn }) {
  const enLinea = useEnLinea();
  const Icono = enLinea ? Wifi : WifiOff;
  return (
    <p className="estado-conexion" role="status">
      <Icono size={18} aria-hidden="true" />
      <span>
        <strong>{enLinea ? 'Disponible sin conexión' : 'Sin conexión: usando la copia guardada'}</strong>
        <br />
        {guardadoEn ? (
          <>
            Última actualización: <time dateTime={guardadoEn}>{fechaHora(guardadoEn)}</time> ({haceCuanto(guardadoEn)})
          </>
        ) : (
          'Aún no hay una copia guardada en este dispositivo.'
        )}
      </span>
    </p>
  );
}
