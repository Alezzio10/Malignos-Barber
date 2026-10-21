import NumberFlow from '@number-flow/react';
import { CalendarPlus, Gift, Scissors } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { AvisoError } from '../../components/Formulario.jsx';
import { admin, mensajeDeError } from '../../lib/api.js';
import { fechaLarga, fechaLocal, hora, rangoMes, simboloMoneda, telefonoLegible } from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';
import { ListaCitas } from './componentes/ListaCitas.jsx';
import { NuevaCita } from './componentes/NuevaCita.jsx';
import { RegistrarVisita } from './componentes/RegistrarVisita.jsx';

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

const formatoDinero = { maximumFractionDigits: 2 };

export default function Hoy() {
  const hoy = fechaLocal();
  const mes = rangoMes(hoy);
  const citas = useCarga(() => admin(`/citas?desde=${hoy}&hasta=${hoy}`), [hoy]);
  const resumen = useCarga(() => admin(`/finanzas/reportes/resumen?desde=${mes.desde}&hasta=${mes.hasta}`), [mes.desde]);
  const premios = useCarga(() => admin('/fidelidad/recompensas?estado=disponible'), []);

  const [visita, setVisita] = useState({ abierto: false, cita: null });
  const [nuevaCita, setNuevaCita] = useState(false);

  const recargarTodo = () => {
    citas.recargar();
    resumen.recargar();
    premios.recargar();
  };

  const lista = citas.datos ?? [];
  const pendientes = lista.filter((c) => ['pendiente', 'confirmada'].includes(c.estado));
  const siguiente = pendientes.find((c) => new Date(c.fin) > new Date());
  const r = resumen.datos;

  return (
    <>
      <header className="cabecera">
        <div>
          <h1>{saludo()}</h1>
          <p>{fechaLarga(new Date().toISOString())}</p>
        </div>
        <div className="cabecera__acciones">
          <button type="button" className="btn btn--borde" onClick={() => setNuevaCita(true)}>
            <CalendarPlus /> Nueva cita
          </button>
          <button type="button" className="btn btn--oro" onClick={() => setVisita({ abierto: true, cita: null })}>
            <Scissors /> Registrar visita
          </button>
        </div>
      </header>

      <div className="columnas">
        <section className="bloque" aria-labelledby="hoy-agenda">
          <div className="bloque__cabeza">
            <h2 id="hoy-agenda">Agenda de hoy</h2>
            <span className="chip num">
              {pendientes.length} por atender
            </span>
          </div>
          {siguiente && (
            <p className="bloque__cuerpo" style={{ color: 'var(--muted)' }}>
              Siguiente: <strong style={{ color: 'var(--ink)' }}>{siguiente.cliente_nombre}</strong> a las{' '}
              <span className="num">{hora(siguiente.inicio)}</span>
            </p>
          )}
          {citas.error ? (
            <div className="bloque__cuerpo">
              <AvisoError>{mensajeDeError(citas.error)}</AvisoError>
            </div>
          ) : !citas.datos ? (
            <div className="bloque__cuerpo pila">
              {[0, 1, 2].map((i) => (
                <div key={i} className="esqueleto" style={{ height: 56 }} />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <div className="bloque__cuerpo">
              <div className="vacio" style={{ background: 'var(--surface-2)' }}>
                <p className="vacio__titulo">No hay citas para hoy</p>
                <p>Las citas que los clientes agenden desde la web aparecerán aquí. Si alguien llega sin cita, registra su visita directo.</p>
              </div>
            </div>
          ) : (
            <ListaCitas citas={lista} alAtender={(c) => setVisita({ abierto: true, cita: c })} alCambiar={recargarTodo} />
          )}
        </section>

        <div className="pila">
          <section className="bloque" aria-labelledby="hoy-mes">
            <div className="bloque__cabeza">
              <h2 id="hoy-mes">Este mes</h2>
              <Link to="/admin/finanzas" className="enlace" style={{ fontSize: 14 }}>
                Ver finanzas
              </Link>
            </div>
            <dl className="cifras bloque__cuerpo">
              <div className="cifra cifra--grande cifra--oro">
                <dt>Ingresos</dt>
                <dd>
                  <NumberFlow value={r?.ingresos.total ?? 0} prefix={simboloMoneda} format={formatoDinero} locales="es" />
                </dd>
              </div>
              <div className="cifra">
                <dt>Gastos</dt>
                <dd>
                  <NumberFlow value={r?.gastos.total ?? 0} prefix={simboloMoneda} format={formatoDinero} locales="es" />
                </dd>
              </div>
              <div className="cifra">
                <dt>Utilidad</dt>
                <dd>
                  <NumberFlow value={r?.utilidad ?? 0} prefix={simboloMoneda} format={formatoDinero} locales="es" />
                </dd>
              </div>
              <div className="cifra">
                <dt>Visitas</dt>
                <dd>
                  <NumberFlow value={r?.visitas.total ?? 0} />
                </dd>
              </div>
              <div className="cifra">
                <dt>Clientes nuevos</dt>
                <dd>
                  <NumberFlow value={r?.clientes_nuevos ?? 0} />
                </dd>
              </div>
            </dl>
          </section>

          <section className="bloque" aria-labelledby="hoy-premios">
            <div className="bloque__cabeza">
              <h2 id="hoy-premios">Cortes gratis por entregar</h2>
              <Gift size={18} style={{ color: 'var(--gold)' }} aria-hidden="true" />
            </div>
            <div className="bloque__cuerpo">
              {premios.datos?.length ? (
                <ul className="pila" style={{ gap: 8 }}>
                  {premios.datos.map((p) => (
                    <li key={p.id}>
                      <Link to={`/admin/clientes/${p.cliente_id}`} className="resultado" style={{ textDecoration: 'none' }}>
                        <span>{p.cliente_nombre}</span>
                        <small className="num">{telefonoLegible(p.cliente_telefono)}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                  Nadie tiene un corte gratis pendiente. Se activan solos al registrar la décima visita.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <RegistrarVisita
        abierto={visita.abierto}
        cita={visita.cita}
        alCerrar={() => setVisita({ abierto: false, cita: visita.cita })}
        alGuardar={recargarTodo}
      />
      <NuevaCita abierto={nuevaCita} alCerrar={() => setNuevaCita(false)} alGuardar={citas.recargar} />
    </>
  );
}
