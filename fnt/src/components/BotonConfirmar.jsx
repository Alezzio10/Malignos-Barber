import { useEffect, useState } from 'react';

// Acción destructiva en dos pasos, sin modal: el primer clic pide confirmación en el mismo lugar.
export function BotonConfirmar({ children, confirmar = '¿Seguro? Sí', alConfirmar, chico, deshabilitado }) {
  const [preguntando, setPreguntando] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (!preguntando) return;
    const t = setTimeout(() => setPreguntando(false), 4000);
    return () => clearTimeout(t);
  }, [preguntando]);

  const clase = `btn ${preguntando ? 'btn--peligro-lleno' : 'btn--peligro'} ${chico ? 'btn--chico' : ''}`;

  return (
    <button
      type="button"
      className={clase}
      disabled={deshabilitado || ocupado}
      onClick={async () => {
        if (!preguntando) return setPreguntando(true);
        setOcupado(true);
        try {
          await alConfirmar();
        } finally {
          setOcupado(false);
          setPreguntando(false);
        }
      }}
    >
      {preguntando ? confirmar : children}
    </button>
  );
}
