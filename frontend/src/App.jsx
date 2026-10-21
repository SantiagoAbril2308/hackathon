import { Routes, Route } from 'react-router-dom';
import Aviso from './components/Aviso.jsx';
import Inicio from './pages/Inicio.jsx';

export default function App() {
  return (
    <>
      <a className="saltar" href="#contenido">
        Ir al contenido
      </a>
      <Aviso />
      <main id="contenido" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Inicio />} />
        </Routes>
      </main>
    </>
  );
}
