import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, sesion } from './api.js';

const ContextoAuth = createContext(null);

export function ProveedorAuth({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [verificando, setVerificando] = useState(Boolean(sesion.token));

  useEffect(() => {
    if (!sesion.token) return;
    api('/auth/yo', { auth: true })
      .then(setUsuario)
      .catch(() => sesion.cerrar())
      .finally(() => setVerificando(false));
  }, []);

  useEffect(() => {
    const alExpirar = () => setUsuario(null);
    window.addEventListener('mb:sesion-expirada', alExpirar);
    return () => window.removeEventListener('mb:sesion-expirada', alExpirar);
  }, []);

  const entrar = useCallback(async (email, password) => {
    const { token, usuario } = await api('/auth/login', { metodo: 'POST', body: { email, password } });
    sesion.guardar(token);
    setUsuario(usuario);
  }, []);

  const salir = useCallback(() => {
    sesion.cerrar();
    setUsuario(null);
  }, []);

  return (
    <ContextoAuth.Provider value={{ usuario, verificando, entrar, salir }}>{children}</ContextoAuth.Provider>
  );
}

export const useAuth = () => useContext(ContextoAuth);
