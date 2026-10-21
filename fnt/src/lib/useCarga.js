import { useCallback, useEffect, useRef, useState } from 'react';

// Carga datos de la API y expone { datos, cargando, error, recargar }.
// Al recargar se conservan los datos anteriores para que la pantalla no parpadee.
export function useCarga(cargar, dependencias) {
  const [estado, setEstado] = useState({ datos: null, cargando: true, error: null });
  const [version, setVersion] = useState(0);
  const cargarRef = useRef(cargar);
  cargarRef.current = cargar;

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    cargarRef
      .current()
      .then((datos) => vigente && setEstado({ datos, cargando: false, error: null }))
      .catch((error) => vigente && setEstado((e) => ({ ...e, cargando: false, error })));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, version]);

  const recargar = useCallback(() => setVersion((v) => v + 1), []);
  return { ...estado, recargar };
}
