import { Link } from 'react-router-dom';
import Encabezado from '../components/Encabezado.jsx';

export default function NoEncontrado() {
  return (
    <>
      <Encabezado titulo="No encontramos esta página" />
      <div className="vacio">
        <p>La dirección no existe o cambió.</p>
        <p>
          <Link to="/">Ir al inicio</Link> · <Link to="/apoyo">Ver líneas de apoyo</Link>
        </p>
      </div>
    </>
  );
}
