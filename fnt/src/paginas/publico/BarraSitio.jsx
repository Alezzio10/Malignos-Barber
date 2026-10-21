import { House } from 'lucide-react';
import { Link, useLocation } from 'react-router';

// Barra fija arriba: se queda visible mientras haces scroll.
export function BarraSitio({ conNavegacion = true, accion = true }) {
  const { pathname, hash } = useLocation();

  // Desde otra página se llega a la principal desde arriba; si ya estás en ella, el enlace
  // no navega, así que se sube al inicio con un desplazamiento suave.
  function irArriba() {
    if (pathname !== '/') return window.scrollTo(0, 0);
    if (hash) window.history.replaceState(null, '', '/');
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  return (
    <header className="barra-sitio">
      <Link to="/" className="barra-sitio__marca" aria-label="Maligno's Barber" onClick={irArriba}>
        <img src="/logo.png" alt="" width="40" height="40" className="logo-luz" />
        <span className="barra-sitio__nombre">Maligno's Barber</span>
      </Link>
      {/* Inicio va siempre en el menú; en Agendar y Mi cita es la única opción. */}
      <nav className="barra-sitio__nav" aria-label="Secciones">
        <Link to="/" className="barra-sitio__casa" aria-label="Ir a la página principal" onClick={irArriba}>
          <House aria-hidden="true" />
          <span className="barra-sitio__casa-texto">Inicio</span>
        </Link>
        {conNavegacion && (
          <>
            <a href="/#servicios" className="barra-sitio__seccion">Servicios</a>
            <a href="/#como-funciona" className="barra-sitio__seccion">Cómo funciona</a>
            <a href="/#fidelidad" className="barra-sitio__seccion">Fidelidad</a>
            <a href="/#horario" className="barra-sitio__seccion">Horario</a>
          </>
        )}
      </nav>
      {accion && (
        <Link to="/agendar" className="btn btn--oro btn--chico">
          Agendar cita
        </Link>
      )}
    </header>
  );
}
