import { motion, useReducedMotion } from 'motion/react';

// Foto que se descubre de abajo hacia arriba al entrar en pantalla, con un leve alejamiento de cámara.
// El zoom al pasar el ratón vive en .foto__zoom (CSS) para no pelear con el transform de motion.
export function FotoRevelada({ src, alt = '', ancho, alto, posicion, retraso = 0, className = '', children }) {
  const reducir = useReducedMotion();
  return (
    <motion.div
      className={`foto ${className}`}
      initial={reducir ? { opacity: 0 } : { clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={reducir ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1.1, delay: retraso, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="foto__zoom">
        <motion.img
          src={src}
          alt={alt}
          width={ancho}
          height={alto}
          loading="lazy"
          decoding="async"
          style={posicion ? { objectPosition: posicion } : undefined}
          initial={reducir ? false : { scale: 1.18 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, delay: retraso, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {children}
    </motion.div>
  );
}
