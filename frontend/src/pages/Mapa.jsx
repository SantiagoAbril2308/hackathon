import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import Encabezado from '../components/Encabezado.jsx';
import { useDirectorio } from '../hooks/useDirectorio.js';

const VILLAVICENCIO = [4.142, -73.626];

/** Mapa con Leaflet + OpenStreetMap. Se carga solo en esta ruta para que /apoyo siga siendo ligera. */
export default function Mapa() {
  const { datos } = useDirectorio();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const contenedor = useRef(null);
  const mapa = useRef(null);
  const [errorMapa, setErrorMapa] = useState(null);

  const conUbicacion = (datos?.servicios ?? []).filter((s) => s.lat != null && s.lng != null);
  const elegido = params.get('servicio');

  useEffect(() => {
    if (!contenedor.current || !conUbicacion.length) return undefined;
    let cancelado = false;

    import('leaflet')
      .then(({ default: L }) => {
        if (cancelado || !contenedor.current) return;
        mapa.current?.remove();
        const m = L.map(contenedor.current, { scrollWheelZoom: false }).setView(VILLAVICENCIO, 13);
        mapa.current = m;
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(m);

        const icono = L.divIcon({
          className: '',
          html: '<span class="marcador"></span>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        const limites = [];
        for (const s of conUbicacion) {
          // Contenido del popup construido con nodos (sin HTML de los datos).
          const caja = document.createElement('div');
          const titulo = document.createElement('strong');
          titulo.textContent = s.nombre;
          const horario = document.createElement('div');
          horario.textContent = s.horario ?? '';
          const enlace = document.createElement('a');
          enlace.href = `/directorio/${s.id}`;
          enlace.textContent = 'Ver detalle';
          enlace.addEventListener('click', (e) => {
            e.preventDefault();
            navegar(`/directorio/${s.id}`);
          });
          caja.append(titulo, horario, enlace);

          const marcador = L.marker([s.lat, s.lng], { icon: icono, title: s.nombre, alt: s.nombre, keyboard: true })
            .addTo(m)
            .bindPopup(caja);
          limites.push([s.lat, s.lng]);
          if (String(s.id) === elegido) {
            m.setView([s.lat, s.lng], 16);
            marcador.openPopup();
          }
        }
        if (!elegido && limites.length > 1) m.fitBounds(limites, { padding: [30, 30] });
      })
      .catch(() => setErrorMapa('No se pudo cargar el mapa.'));

    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, [conUbicacion.length, elegido]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Encabezado titulo="Mapa" />
      <p className="texto-suave pequeno">
        Servicios presenciales verificados en Villavicencio. Los nombres y lugares de prueba son ficticios.
      </p>
      <div className="mapa-diseno">
        <div ref={contenedor} className="mapa" role="region" aria-label="Mapa de servicios presenciales" />
        {errorMapa && (
          <p className="mensaje-estado mensaje-estado--error" role="alert">
            {errorMapa}
          </p>
        )}

        <section className="seccion mapa-lista" aria-labelledby="lista-mapa">
          <h2 id="lista-mapa">Servicios en el mapa</h2>
          <ul style={{ paddingLeft: '1.1rem' }}>
            {conUbicacion.map((s) => (
              <li key={s.id} style={{ marginBottom: 6 }}>
                <Link to={`/directorio/${s.id}`}>{s.nombre}</Link>
                <span className="texto-suave pequeno"> — {s.direccion}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
