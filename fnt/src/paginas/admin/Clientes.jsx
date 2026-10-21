import { Gift, Search, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { AvisoError } from '../../components/Formulario.jsx';
import { TarjetaFidelidad } from '../../components/TarjetaFidelidad.jsx';
import { admin, mensajeDeError } from '../../lib/api.js';
import { fechaCorta, telefonoLegible } from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';
import { FichaCliente } from './componentes/FichaCliente.jsx';

const POR_PAGINA = 30;

export default function Clientes() {
  const navegar = useNavigate();
  const [texto, setTexto] = useState('');
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ficha, setFicha] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setBuscar(texto.trim());
      setPagina(1);
    }, 250);
    return () => clearTimeout(t);
  }, [texto]);

  const clientes = useCarga(
    () => admin(`/clientes?pagina=${pagina}&por_pagina=${POR_PAGINA}${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ''}`),
    [buscar, pagina],
  );
  const d = clientes.datos;
  const paginas = d ? Math.max(1, Math.ceil(d.total / POR_PAGINA)) : 1;

  return (
    <>
      <header className="cabecera">
        <div>
          <h1>Clientes</h1>
          <p>{d ? `${d.total} ${d.total === 1 ? 'cliente' : 'clientes'}${buscar ? ' encontrados' : ' registrados'}` : ' '}</p>
        </div>
        <div className="cabecera__acciones">
          <button type="button" className="btn btn--oro" onClick={() => setFicha(true)}>
            <UserPlus /> Nuevo cliente
          </button>
        </div>
      </header>

      <div className="buscador" style={{ maxWidth: 420, marginBottom: 16 }}>
        <Search />
        <input
          className="input"
          type="search"
          placeholder="Buscar por nombre o teléfono"
          aria-label="Buscar clientes"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>

      <section className="bloque">
        {clientes.error ? (
          <div className="bloque__cuerpo" style={{ paddingTop: 20 }}>
            <AvisoError>{mensajeDeError(clientes.error)}</AvisoError>
          </div>
        ) : !d ? (
          <div className="bloque__cuerpo pila" style={{ paddingTop: 20 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="esqueleto" style={{ height: 44 }} />
            ))}
          </div>
        ) : d.clientes.length === 0 ? (
          <div className="bloque__cuerpo" style={{ paddingTop: 20 }}>
            <div className="vacio" style={{ background: 'var(--surface-2)' }}>
              <p className="vacio__titulo">{buscar ? `Nadie coincide con “${buscar}”` : 'Todavía no hay clientes'}</p>
              <p>
                {buscar
                  ? 'Prueba con parte del nombre o los últimos dígitos del teléfono.'
                  : 'Se agregan solos cuando alguien agenda desde la web, o puedes crearlos tú.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="tabla-envoltura">
              <table className="tabla tabla--clic">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tarjeta</th>
                    <th>Última visita</th>
                  </tr>
                </thead>
                <tbody>
                  {d.clientes.map((c) => (
                    <tr key={c.id} onClick={() => navegar(`/admin/clientes/${c.id}`)}>
                      <td>
                        <a
                          href={`/admin/clientes/${c.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navegar(`/admin/clientes/${c.id}`);
                          }}
                          style={{ fontWeight: 600, opacity: c.activo ? 1 : 0.6 }}
                        >
                          {c.nombre}
                        </a>
                        <div className="num" style={{ color: 'var(--muted)', fontSize: 14, whiteSpace: 'nowrap' }}>
                          {telefonoLegible(c.telefono)}
                          {!c.activo && ' · inactivo'}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <TarjetaFidelidad acumuladas={c.visitas_acumuladas ?? 0} tamano="chica" />
                          {c.recompensas_disponibles > 0 && (
                            <span className="chip chip--oro">
                              <Gift /> Corte gratis
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="num" style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {c.ultima_visita ? fechaCorta(c.ultima_visita) : 'Sin visitas'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {paginas > 1 && (
              <div className="paginacion">
                <button type="button" className="btn btn--suave btn--chico" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>
                  Anterior
                </button>
                <span className="num">
                  Página {pagina} de {paginas}
                </span>
                <button type="button" className="btn btn--suave btn--chico" disabled={pagina === paginas} onClick={() => setPagina(pagina + 1)}>
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <FichaCliente abierto={ficha} alCerrar={() => setFicha(false)} alGuardar={(c) => navegar(`/admin/clientes/${c.id}`)} />
    </>
  );
}
