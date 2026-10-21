import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';
import { ETIQUETAS } from '../../services/formato.js';
import { Mensaje } from './comun.jsx';

const VACIO = {
  nombre: '',
  descripcion: '',
  tipo: 'presencial',
  temas: ['general'],
  publico: ['adultos'],
  modalidad: ['presencial'],
  cobertura: '',
  horario: '',
  costo: '',
  direccion: '',
  lat: '',
  lng: '',
  fuente_id: '',
  url_fuente: '',
  fecha_verificacion: '',
  estado: 'en_revision',
  es_emergencia: false,
  orden: 0,
  es_sintetico: false,
};

/** Convierte el formulario al cuerpo que espera la API (vacíos → null, números como números). */
function aCuerpo(f) {
  const texto = (v) => (v === '' ? null : v);
  const numero = (v) => (v === '' || v == null ? null : Number(v));
  return {
    nombre: f.nombre,
    descripcion: texto(f.descripcion),
    tipo: f.tipo,
    temas: f.temas,
    publico: f.publico,
    modalidad: f.modalidad,
    cobertura: texto(f.cobertura),
    horario: texto(f.horario),
    costo: texto(f.costo),
    direccion: texto(f.direccion),
    lat: numero(f.lat),
    lng: numero(f.lng),
    fuente_id: numero(f.fuente_id),
    url_fuente: texto(f.url_fuente),
    fecha_verificacion: texto(f.fecha_verificacion),
    estado: f.estado,
    es_emergencia: f.es_emergencia,
    orden: Number(f.orden) || 0,
    es_sintetico: f.es_sintetico,
  };
}

function Casillas({ nombre, opciones, valor, alCambiar }) {
  return (
    <fieldset className="campo completo" style={{ border: 0, padding: 0 }}>
      <legend style={{ marginBottom: 4 }}>{nombre}</legend>
      <div className="casillas">
        {Object.entries(opciones).map(([v, t]) => (
          <label key={v}>
            <input
              type="checkbox"
              checked={valor.includes(v)}
              onChange={(e) => alCambiar(e.target.checked ? [...valor, v] : valor.filter((x) => x !== v))}
            />
            {t}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Canales({ servicio, alCambiar }) {
  const { pedirAdmin } = useSesionAdmin();
  const [nuevo, setNuevo] = useState({ tipo: 'telefono', valor: '', etiqueta: '' });
  const [mensaje, setMensaje] = useState(null);

  async function agregar(e) {
    e.preventDefault();
    try {
      await pedirAdmin('/canales', { metodo: 'POST', cuerpo: { servicio_id: servicio.id, ...nuevo, etiqueta: nuevo.etiqueta || null } });
      setNuevo({ tipo: 'telefono', valor: '', etiqueta: '' });
      setMensaje(null);
      alCambiar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  async function eliminar(canal) {
    try {
      await pedirAdmin(`/canales/${canal.id}`, { metodo: 'DELETE' });
      alCambiar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  }

  return (
    <section aria-labelledby="titulo-canales" style={{ marginTop: '1rem' }}>
      <h3 id="titulo-canales">Canales de contacto</h3>
      <Mensaje mensaje={mensaje} />
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {servicio.canales.map((c) => (
          <li key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
            <span style={{ flex: 1 }}>
              <strong>{c.tipo}</strong>: {c.valor} {c.etiqueta && <span className="texto-suave">({c.etiqueta})</span>}
            </span>
            <button type="button" className="boton boton--secundario boton--pequeno" onClick={() => eliminar(c)} aria-label={`Eliminar canal ${c.valor}`}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={agregar} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
        <label className="campo" style={{ margin: 0 }}>
          Tipo
          <select className="selector" value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}>
            {['telefono', 'whatsapp', 'web', 'email'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="campo" style={{ margin: 0 }}>
          Valor
          <input className="entrada" required value={nuevo.valor} onChange={(e) => setNuevo({ ...nuevo, valor: e.target.value })} />
        </label>
        <label className="campo" style={{ margin: 0 }}>
          Etiqueta
          <input className="entrada" value={nuevo.etiqueta} onChange={(e) => setNuevo({ ...nuevo, etiqueta: e.target.value })} />
        </label>
        <button type="submit" className="boton">
          <Plus size={16} aria-hidden="true" /> Agregar
        </button>
      </form>
    </section>
  );
}

export default function FormularioServicio({ servicio, fuentes, alGuardar, alCancelar }) {
  const { pedirAdmin } = useSesionAdmin();
  const [f, setF] = useState(() =>
    servicio
      ? Object.fromEntries(Object.keys(VACIO).map((k) => [k, servicio[k] ?? (k === 'fuente_id' ? servicio.fuente?.id ?? '' : VACIO[k])]))
      : VACIO,
  );
  const [mensaje, setMensaje] = useState(null);
  const poner = (clave) => (e) => setF({ ...f, [clave]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setMensaje(null);
    try {
      const cuerpo = aCuerpo(f);
      const r = servicio
        ? await pedirAdmin(`/servicios/${servicio.id}`, { metodo: 'PUT', cuerpo })
        : await pedirAdmin('/servicios', { metodo: 'POST', cuerpo });
      alGuardar(r, servicio ? 'Servicio actualizado.' : 'Servicio creado. Agrega sus canales de contacto.');
    } catch (err) {
      const detalle = err.detalles?.map((d) => `${d.campo}: ${d.mensaje}`).join(' · ');
      setMensaje({ tipo: 'error', texto: detalle ? `${err.message}. ${detalle}` : err.message });
    }
  }

  return (
    <section className="tarjeta" aria-labelledby="titulo-formulario" style={{ marginBottom: '1.5rem' }}>
      <h2 id="titulo-formulario">{servicio ? `Editar: ${servicio.nombre}` : 'Nuevo servicio'}</h2>
      <Mensaje mensaje={mensaje} />
      <form className="formulario-admin" onSubmit={guardar}>
        <label className="campo completo">
          Nombre
          <input className="entrada" required minLength={3} value={f.nombre} onChange={poner('nombre')} />
        </label>
        <label className="campo completo">
          Descripción
          <textarea className="area" value={f.descripcion} onChange={poner('descripcion')} />
        </label>
        <label className="campo">
          Tipo
          <select className="selector" value={f.tipo} onChange={poner('tipo')}>
            {Object.entries(ETIQUETAS.tipo).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Estado
          <select className="selector" value={f.estado} onChange={poner('estado')}>
            <option value="en_revision">En revisión</option>
            <option value="vigente">Vigente (requiere fuente y fecha)</option>
            <option value="retirado">Retirado</option>
          </select>
        </label>
        <Casillas nombre="Temas" opciones={ETIQUETAS.temas} valor={f.temas} alCambiar={(v) => setF({ ...f, temas: v })} />
        <Casillas nombre="Público" opciones={ETIQUETAS.publico} valor={f.publico} alCambiar={(v) => setF({ ...f, publico: v })} />
        <Casillas nombre="Modalidad" opciones={ETIQUETAS.modalidad} valor={f.modalidad} alCambiar={(v) => setF({ ...f, modalidad: v })} />
        <label className="campo">
          Horario
          <input className="entrada" value={f.horario} onChange={poner('horario')} />
        </label>
        <label className="campo">
          Costo
          <input className="entrada" value={f.costo} onChange={poner('costo')} />
        </label>
        <label className="campo">
          Cobertura
          <input className="entrada" value={f.cobertura} onChange={poner('cobertura')} />
        </label>
        <label className="campo">
          Dirección
          <input className="entrada" value={f.direccion} onChange={poner('direccion')} />
        </label>
        <label className="campo">
          Latitud
          <input className="entrada" type="number" step="0.000001" value={f.lat} onChange={poner('lat')} />
        </label>
        <label className="campo">
          Longitud
          <input className="entrada" type="number" step="0.000001" value={f.lng} onChange={poner('lng')} />
        </label>
        <label className="campo">
          Fuente
          <select className="selector" value={f.fuente_id} onChange={poner('fuente_id')}>
            <option value="">Sin fuente</option>
            {fuentes.map((fu) => (
              <option key={fu.id} value={fu.id}>
                {fu.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          URL de la fuente oficial (https)
          <input className="entrada" type="url" value={f.url_fuente} onChange={poner('url_fuente')} />
        </label>
        <label className="campo">
          Fecha de verificación
          <input className="entrada" type="date" value={f.fecha_verificacion ?? ''} onChange={poner('fecha_verificacion')} />
        </label>
        <label className="campo">
          Orden (emergencias)
          <input className="entrada" type="number" min="0" value={f.orden} onChange={poner('orden')} />
        </label>
        <div className="casillas completo" style={{ marginBottom: '1rem' }}>
          <label>
            <input type="checkbox" checked={f.es_emergencia} onChange={poner('es_emergencia')} /> Es línea de emergencia
          </label>
          <label>
            <input type="checkbox" checked={f.es_sintetico} onChange={poner('es_sintetico')} /> Dato de prueba (sintético)
          </label>
        </div>
        <div className="completo" style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="boton">
            Guardar
          </button>
          <button type="button" className="boton boton--secundario" onClick={alCancelar}>
            Cerrar
          </button>
        </div>
      </form>
      {servicio && <Canales servicio={servicio} alCambiar={() => alGuardar(null, 'Canales actualizados.')} />}
    </section>
  );
}
