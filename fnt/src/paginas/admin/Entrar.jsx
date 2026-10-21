import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { AvisoError, Campo } from '../../components/Formulario.jsx';
import { useAuth } from '../../lib/auth.jsx';
import './admin.css';

export default function Entrar() {
  const { usuario, entrar } = useAuth();
  const navegar = useNavigate();
  const { state } = useLocation();
  const reducir = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={state?.desde ?? '/admin'} replace />;

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await entrar(email, password);
      navegar(state?.desde ?? '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="entrar">
      <form className="entrar__caja" onSubmit={enviar}>
        <motion.img
          src="/logo.png"
          alt=""
          width="220"
          height="220"
          className="entrar__logo logo-luz"
          initial={reducir ? { opacity: 0 } : { opacity: 0, filter: 'brightness(0.2)' }}
          animate={{ opacity: 1, filter: 'brightness(1)' }}
          transition={{ duration: 1, ease: [0.33, 1, 0.68, 1] }}
        />
        <h1>Panel del barbero</h1>
        <Campo etiqueta="Email">
          {({ id }) => (
            <input id={id} type="email" className="input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          )}
        </Campo>
        <Campo etiqueta="Contraseña">
          {({ id }) => (
            <input
              id={id}
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Campo>
        <AvisoError>{error}</AvisoError>
        <button type="submit" className="btn btn--oro btn--bloque" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
