import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Encabezado from '../components/Encabezado.jsx';
import Logo from '../components/Logo.jsx';
import { useDirectorio } from '../hooks/useDirectorio.js';
import { dominio } from '../services/formato.js';

export default function Acerca() {
  const { hash } = useLocation();
  const { datos } = useDirectorio();

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const fuentes = [
    ...new Map(
      (datos?.servicios ?? []).filter((s) => s.fuente).map((s) => [s.fuente.id, { ...s.fuente, url: s.url_fuente }]),
    ).values(),
  ];

  return (
    <div className="lectura">
      <Encabezado titulo="Acerca de" />
      <div style={{ margin: '0.5rem 0 1.5rem' }}>
        <Logo tamano={56} />
      </div>

      <section className="seccion" aria-labelledby="que-es">
        <h2 id="que-es">Qué es Ruta Serena</h2>
        <p>
          Un directorio para encontrar líneas de apoyo y servicios institucionales de salud mental en Villavicencio y el Meta.
          Cada servicio muestra su fuente oficial y la fecha en que se verificó.
        </p>
      </section>

      <section className="seccion" aria-labelledby="que-no-es">
        <h2 id="que-no-es">Qué no es</h2>
        <p>
          Ruta Serena no es un servicio de salud. No hace diagnósticos, no recomienda tratamientos ni medicamentos, no ofrece
          ejercicios y no evalúa a nadie. Si tu vida o la de alguien está en peligro, llama al <a href="tel:123">123</a>.
        </p>
      </section>

      <section className="seccion" aria-labelledby="titulo-fuentes" id="fuentes">
        <h2 id="titulo-fuentes">Fuentes y verificación</h2>
        <p>
          Un servicio solo aparece como vigente si tiene un enlace a su fuente oficial y fue verificado en los últimos 30 días. Si
          pasa más tiempo, o si varias personas reportan que no funciona, queda “en revisión” hasta que el equipo lo confirme. Los
          cambios detectados automáticamente en las fuentes nunca se publican sin revisión humana.
        </p>
        {fuentes.length > 0 && (
          <ul>
            {fuentes.map((f) => (
              <li key={f.id}>
                {f.entidad} — {f.nombre} ({dominio(f.url)})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="seccion" aria-labelledby="titulo-privacidad" id="privacidad">
        <h2 id="titulo-privacidad">Privacidad</h2>
        <ul>
          <li>No hay cuentas para el público ni pedimos datos personales.</li>
          <li>Las conversaciones con el asistente no se guardan: viven solo en tu pantalla mientras la usas.</li>
          <li>No registramos direcciones IP.</li>
          <li>Los reportes de “este número no funciona” son anónimos.</li>
          <li>En tu dispositivo solo se guarda una copia del directorio y tus preferencias de la app.</li>
        </ul>
      </section>

      <section className="seccion" aria-labelledby="titulo-accesibilidad" id="accesibilidad">
        <h2 id="titulo-accesibilidad">Accesibilidad</h2>
        <p>
          Diseñada siguiendo WCAG 2.1 AA: contraste suficiente, botones grandes, navegación con teclado, foco visible y etiquetas
          para lectores de pantalla. Puedes cambiar a modo oscuro en Ajustes. Si algo no te funciona, cuéntanos.
        </p>
      </section>

      <section className="seccion" aria-labelledby="prueba">
        <h2 id="prueba">Datos de prueba</h2>
        <p>
          Esta versión (Hackathon Villavicencio 2026, TRL 4) usa servicios ficticios con teléfonos 000-000-00XX para demostrar su
          funcionamiento. No llames a esos números.
        </p>
      </section>

      <section className="seccion" aria-labelledby="creditos">
        <h2 id="creditos">Créditos</h2>
        <p className="pequeno">
          Mapas © colaboradores de OpenStreetMap. Iconos: Lucide (ISC). Tipografías: Fraunces y Manrope (SIL Open Font License).
        </p>
      </section>
    </div>
  );
}
