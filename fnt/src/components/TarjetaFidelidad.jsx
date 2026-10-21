import { motion, useInView, useReducedMotion } from 'motion/react';
import { useRef, useState } from 'react';
import { Tijeras } from './Dibujos.jsx';
import './TarjetaFidelidad.css';

// La tarjeta de sellos: un hueco por visita; el último es el corte de regalo.
export function TarjetaFidelidad({ acumuladas = 0, requeridas = 10, tamano = 'normal', titular }) {
  const ref = useRef(null);
  const visible = useInView(ref, { once: true, margin: '-80px' });
  const reducir = useReducedMotion();
  const llenos = Math.min(acumuladas, requeridas);
  // Los sellos que ya estaban al montar entran escalonados; los que se suman después, al instante.
  const [llenosIniciales] = useState(llenos);

  return (
    <div
      ref={ref}
      className={`tarjeta-sellos tarjeta-sellos--${tamano}`}
      role="img"
      aria-label={`${llenos} de ${requeridas} visitas. ${
        llenos >= requeridas ? 'El próximo corte es gratis.' : `Faltan ${requeridas - llenos} para el corte gratis.`
      }`}
    >
      <div className="tarjeta-sellos__cabeza">
        <span className="tarjeta-sellos__marca">Maligno's Barber</span>
        {titular && <span className="tarjeta-sellos__titular">{titular}</span>}
      </div>
      <ol className="tarjeta-sellos__huecos" style={{ '--columnas': Math.min(5, Math.ceil(requeridas / 2)) }}>
        {Array.from({ length: requeridas }, (_, i) => {
          const premio = i === requeridas - 1;
          const lleno = i < llenos;
          return (
            <li key={i} className={`hueco ${premio ? 'hueco--premio' : ''}`}>
              {lleno ? (
                <motion.span
                  className="hueco__sello"
                  initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'scale(1.6) rotate(-18deg)' }}
                  animate={
                    visible
                      ? { opacity: 1, transform: 'scale(1) rotate(0deg)' }
                      : reducir
                        ? { opacity: 0 }
                        : { opacity: 0, transform: 'scale(1.6) rotate(-18deg)' }
                  }
                  transition={{
                    duration: 0.38,
                    delay: i < llenosIniciales ? 0.15 + i * 0.07 : 0,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Tijeras />
                </motion.span>
              ) : (
                premio && <span className="hueco__texto">Gratis</span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="tarjeta-sellos__pie num">
        {llenos >= requeridas ? 'Corte gratis listo' : `${llenos} de ${requeridas} visitas`}
      </p>
    </div>
  );
}
