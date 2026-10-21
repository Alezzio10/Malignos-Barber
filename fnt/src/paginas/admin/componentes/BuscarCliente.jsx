import { Search, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Campo } from '../../../components/Formulario.jsx';
import { admin } from '../../../lib/api.js';
import { telefonoLegible } from '../../../lib/formato.js';

// Busca un cliente por nombre o teléfono; si no existe, permite crearlo en el momento.
export function BuscarCliente({ cliente, alElegir }) {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [creando, setCreando] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: '', telefono: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cliente || texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    const t = setTimeout(() => {
      admin(`/clientes?buscar=${encodeURIComponent(texto.trim())}&por_pagina=8&activo=true`)
        .then((r) => setResultados(r.clientes))
        .catch(() => setResultados([]));
    }, 220);
    return () => clearTimeout(t);
  }, [texto, cliente]);

  if (cliente) {
    return (
      <div className="elegido">
        <div>
          <strong>{cliente.nombre}</strong>
          <small className="num">{telefonoLegible(cliente.telefono)}</small>
        </div>
        <button type="button" className="icono-btn" aria-label="Cambiar cliente" onClick={() => alElegir(null)}>
          <X />
        </button>
      </div>
    );
  }

  async function crear() {
    setError(null);
    try {
      const creado = await admin('/clientes', { metodo: 'POST', body: nuevo });
      alElegir(creado);
    } catch (e) {
      setError(e.message);
    }
  }

  if (creando) {
    return (
      <div className="pila" style={{ gap: 12 }}>
        <div className="fila-campos">
          <Campo etiqueta="Nombre">
            {({ id }) => (
              <input id={id} className="input" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
            )}
          </Campo>
          <Campo etiqueta="Teléfono" error={error}>
            {({ id, invalido }) => (
              <input
                id={id}
                className="input"
                type="tel"
                aria-invalid={invalido}
                value={nuevo.telefono}
                onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })}
              />
            )}
          </Campo>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn--suave btn--chico" onClick={crear} disabled={!nuevo.nombre || !nuevo.telefono}>
            Crear y usar
          </button>
          <button type="button" className="btn btn--borde btn--chico" onClick={() => setCreando(false)}>
            Volver a buscar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pila" style={{ gap: 8 }}>
      <Campo etiqueta="Cliente">
        {({ id }) => (
          <div className="buscador">
            <Search />
            <input
              id={id}
              className="input"
              placeholder="Nombre o teléfono"
              value={texto}
              autoComplete="off"
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
        )}
      </Campo>
      {resultados.length > 0 && (
        <ul className="resultados">
          {resultados.map((c) => (
            <li key={c.id}>
              <button type="button" className="resultado" onClick={() => alElegir(c)}>
                <span>{c.nombre}</span>
                <small className="num">{telefonoLegible(c.telefono)}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="btn btn--borde btn--chico"
        style={{ justifySelf: 'start' }}
        onClick={() => {
          setCreando(true);
          setNuevo({ nombre: /\d/.test(texto) ? '' : texto, telefono: /\d/.test(texto) ? texto : '' });
        }}
      >
        <UserPlus /> Cliente nuevo
      </button>
    </div>
  );
}
