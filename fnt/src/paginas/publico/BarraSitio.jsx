import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';

// Se esconde al bajar y vuelve al subir, para dejar la pantalla a las fotos.
export function BarraSitio({ conNavegacion = true, accion = true }) {
  const { scrollY } = useScroll();
  const [oculta, setOculta] = useState(false);

  useMotionValueEvent(scrollY, 'change', (y) => {
    const anterior = scrollY.getPrevious() ?? 0;
    setOculta(y > 160 && y > anterior);
  });

  return (
    <motion.header
      className="barra-sitio"
      animate={{ transform: oculta ? 'translateY(-100%)' : 'translateY(0%)' }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to="/" className="barra-sitio__marca">
        <img src="/logo.png" alt="" width="40" height="40" className="logo-luz" />
        Maligno's Barber
      </Link>
      {conNavegacion && (
        <nav className="barra-sitio__nav" aria-label="Secciones">
          <a href="/#servicios">Servicios</a>
          <a href="/#como-funciona">Cómo funciona</a>
          <a href="/#fidelidad">Fidelidad</a>
          <a href="/#horario">Horario</a>
        </nav>
      )}
      {accion && (
        <Link to="/agendar" className="btn btn--oro btn--chico">
          Agendar cita
        </Link>
      )}
    </motion.header>
  );
}
