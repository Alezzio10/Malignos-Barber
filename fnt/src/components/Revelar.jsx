import { motion, useReducedMotion } from 'motion/react';

// Entrada única cuando el bloque aparece en pantalla (no se repite al volver a pasar).
export function Revelar({ children, como = 'div', retraso = 0, distancia = 24, className, ...resto }) {
  const reducir = useReducedMotion();
  const Componente = motion[como];
  return (
    <Componente
      className={className}
      initial={reducir ? { opacity: 0 } : { opacity: 0, transform: `translateY(${distancia}px)` }}
      whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.75, delay: retraso, ease: [0.22, 1, 0.36, 1] }}
      {...resto}
    >
      {children}
    </Componente>
  );
}
