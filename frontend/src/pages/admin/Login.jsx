import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Logo from '../../components/Logo.jsx';
import { useSesionAdmin } from '../../hooks/useSesionAdmin.jsx';

export default function Login() {
  const { sesion, iniciar } = useSesionAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (sesion) return <Navigate to="/admin/cambios" replace />;

  async function enviar(evento) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await iniciar(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="login" id="contenido">
      <form className="tarjeta" onSubmit={enviar} aria-labelledby="titulo-login">
        <div style={{ marginBottom: '1rem' }}>
          <Logo tamano={52} lema={false} />
        </div>
        <h1 id="titulo-login" style={{ fontSize: '1.5rem', textAlign: 'center' }}>
          Panel de administración
        </h1>
        <p className="texto-suave pequeno" style={{ textAlign: 'center' }}>
          Solo para el equipo que verifica la información.
        </p>
        <label className="campo">
          Correo
          <input className="entrada" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="campo">
          Contraseña
          <input
            className="entrada"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="mensaje-estado mensaje-estado--error" role="alert" style={{ marginBottom: '1rem' }}>
            {error}
          </p>
        )}
        <button className="boton boton--bloque" type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
