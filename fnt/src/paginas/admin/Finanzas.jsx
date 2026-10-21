import NumberFlow from '@number-flow/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { BotonConfirmar } from '../../components/BotonConfirmar.jsx';
import { AvisoError, Campo } from '../../components/Formulario.jsx';
import { admin, mensajeDeError } from '../../lib/api.js';
import {
  ETIQUETA_METODO,
  dinero,
  fechaLocal,
  nombreMes,
  partesDia,
  rangoMes,
  simboloMoneda,
} from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';

const formatoDinero = { maximumFractionDigits: 2 };

function TooltipGrafico({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = partesDia(label);
  return (
    <div className="grafico-tooltip">
      <strong style={{ textTransform: 'capitalize' }}>{p.larga}</strong>
      {payload.map((s) => (
        <div key={s.dataKey}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: 'inline-block' }} />
            {s.dataKey === 'ingresos' ? 'Ingresos' : 'Gastos'}
          </span>
          <span>{dinero(s.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Finanzas() {
  const hoy = fechaLocal();
  const [periodo, setPeriodo] = useState('este');
  const [personalizado, setPersonalizado] = useState(rangoMes(hoy));
  const rango = periodo === 'este' ? rangoMes(hoy) : periodo === 'anterior' ? rangoMes(hoy, -1) : personalizado;
  const consulta = `desde=${rango.desde}&hasta=${rango.hasta}`;

  const resumen = useCarga(() => admin(`/finanzas/reportes/resumen?${consulta}`), [consulta]);
  const diario = useCarga(() => admin(`/finanzas/reportes/diario?${consulta}`), [consulta]);
  const gastos = useCarga(() => admin(`/finanzas/gastos?${consulta}`), [consulta]);
  const categorias = useCarga(() => admin('/finanzas/categorias-gasto'), []);

  const recargar = () => {
    resumen.recargar();
    diario.recargar();
    gastos.recargar();
  };

  const r = resumen.datos;
  const titulo =
    periodo === 'personalizado' ? `${rango.desde} a ${rango.hasta}` : nombreMes(rango.desde);

  return (
    <>
      <header className="cabecera">
        <div>
          <h1>Finanzas</h1>
          <p>{titulo}</p>
        </div>
        <div className="cabecera__acciones" style={{ alignItems: 'center' }}>
          <div className="segmentado" role="group" aria-label="Periodo">
            {[
              ['este', 'Este mes'],
              ['anterior', 'Mes anterior'],
              ['personalizado', 'Otras fechas'],
            ].map(([v, t]) => (
              <button key={v} type="button" aria-pressed={periodo === v} onClick={() => setPeriodo(v)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      {periodo === 'personalizado' && (
        <div className="fila-campos" style={{ maxWidth: 420, marginBottom: 20 }}>
          <Campo etiqueta="Desde">
            {({ id }) => (
              <input
                id={id}
                type="date"
                className="input"
                value={personalizado.desde}
                onChange={(e) => e.target.value && setPersonalizado({ ...personalizado, desde: e.target.value })}
              />
            )}
          </Campo>
          <Campo etiqueta="Hasta">
            {({ id }) => (
              <input
                id={id}
                type="date"
                className="input"
                value={personalizado.hasta}
                onChange={(e) => e.target.value && setPersonalizado({ ...personalizado, hasta: e.target.value })}
              />
            )}
          </Campo>
        </div>
      )}

      {resumen.error && <AvisoError>{mensajeDeError(resumen.error)}</AvisoError>}

      <dl className="cifras-fila" style={{ marginBottom: 20 }}>
        <div>
          <dt>Ingresos</dt>
          <dd style={{ color: 'var(--gold)' }}>
            <NumberFlow value={r?.ingresos.total ?? 0} prefix={simboloMoneda} format={formatoDinero} locales="es" />
          </dd>
        </div>
        <div>
          <dt>Gastos</dt>
          <dd>
            <NumberFlow value={r?.gastos.total ?? 0} prefix={simboloMoneda} format={formatoDinero} locales="es" />
          </dd>
        </div>
        <div>
          <dt>Utilidad</dt>
          <dd style={{ color: (r?.utilidad ?? 0) < 0 ? 'var(--error)' : 'var(--ink)' }}>
            <NumberFlow value={r?.utilidad ?? 0} prefix={simboloMoneda} format={formatoDinero} locales="es" />
          </dd>
        </div>
      </dl>

      <div className="columnas">
        <div className="pila">
          <section className="bloque" aria-labelledby="fin-grafico">
            <div className="bloque__cabeza">
              <h2 id="fin-grafico">Día por día</h2>
              <div className="grafico-leyenda">
                <span>
                  <i style={{ background: 'var(--serie-ingresos)' }} /> Ingresos
                </span>
                <span>
                  <i style={{ background: 'var(--serie-gastos)' }} /> Gastos
                </span>
              </div>
            </div>
            <div className="bloque__cuerpo">
              {diario.datos ? (
                <>
                  <div className="grafico">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diario.datos} barGap={2} barCategoryGap="22%" margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="0" />
                        <XAxis
                          dataKey="fecha"
                          tickFormatter={(f) => partesDia(f).dia}
                          tick={{ fill: 'var(--muted)', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                          minTickGap={8}
                        />
                        <YAxis
                          tickFormatter={(v) => dinero(v)}
                          tick={{ fill: 'var(--muted)', fontSize: 12 }}
                          axisLine={false}
                          tickLine={false}
                          width={64}
                        />
                        <Tooltip content={<TooltipGrafico />} cursor={{ fill: 'var(--surface-2)' }} />
                        <Bar dataKey="ingresos" fill="var(--serie-ingresos)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                        <Bar dataKey="gastos" fill="var(--serie-gastos)" radius={[4, 4, 0, 0]} maxBarSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="ver-tabla">
                    <summary>Ver como tabla</summary>
                    <div className="tabla-envoltura">
                      <table className="tabla">
                        <thead>
                          <tr>
                            <th>Día</th>
                            <th className="derecha">Ingresos</th>
                            <th className="derecha">Gastos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diario.datos
                            .filter((d) => d.ingresos || d.gastos)
                            .map((d) => (
                              <tr key={d.fecha}>
                                <td style={{ textTransform: 'capitalize' }}>{partesDia(d.fecha).larga}</td>
                                <td className="derecha num">{dinero(d.ingresos)}</td>
                                <td className="derecha num">{dinero(d.gastos)}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </>
              ) : (
                <div className="esqueleto grafico" />
              )}
            </div>
          </section>

          <Gastos estado={gastos} categorias={categorias.datos ?? []} alCambiar={recargar} />
        </div>

        <div className="pila">
          <section className="bloque" aria-labelledby="fin-metodos">
            <div className="bloque__cabeza">
              <h2 id="fin-metodos">Ingresos por método</h2>
            </div>
            <dl className="cifras bloque__cuerpo">
              {r?.ingresos.por_metodo.length ? (
                r.ingresos.por_metodo.map((m) => (
                  <div key={m.metodo} className="cifra">
                    <dt>{ETIQUETA_METODO[m.metodo]}</dt>
                    <dd style={{ fontSize: 18 }}>{dinero(m.total)}</dd>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Sin pagos en este periodo.</p>
              )}
            </dl>
          </section>
          <section className="bloque" aria-labelledby="fin-categorias">
            <div className="bloque__cabeza">
              <h2 id="fin-categorias">Gastos por categoría</h2>
            </div>
            <dl className="cifras bloque__cuerpo">
              {r?.gastos.por_categoria.length ? (
                r.gastos.por_categoria.map((g) => (
                  <div key={g.categoria} className="cifra">
                    <dt>{g.categoria}</dt>
                    <dd style={{ fontSize: 18 }}>{dinero(g.total)}</dd>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Sin gastos en este periodo.</p>
              )}
            </dl>
          </section>
          <section className="bloque" aria-labelledby="fin-visitas">
            <div className="bloque__cabeza">
              <h2 id="fin-visitas">Movimiento</h2>
            </div>
            <dl className="cifras bloque__cuerpo">
              <div className="cifra">
                <dt>Visitas</dt>
                <dd style={{ fontSize: 18 }}>{r?.visitas.total ?? '…'}</dd>
              </div>
              <div className="cifra">
                <dt>Clientes distintos</dt>
                <dd style={{ fontSize: 18 }}>{r?.visitas.clientes_unicos ?? '…'}</dd>
              </div>
              <div className="cifra">
                <dt>Clientes nuevos</dt>
                <dd style={{ fontSize: 18 }}>{r?.clientes_nuevos ?? '…'}</dd>
              </div>
              <div className="cifra">
                <dt>No asistieron</dt>
                <dd style={{ fontSize: 18 }}>{r?.citas_por_estado.no_asistio ?? 0}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </>
  );
}

function Gastos({ estado, categorias, alCambiar }) {
  const hoy = fechaLocal();
  const vacio = { fecha: hoy, categoria_id: '', descripcion: '', metodo: 'efectivo', monto: '' };
  const [nuevo, setNuevo] = useState(vacio);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const activas = categorias.filter((c) => c.activo);

  async function agregar(e) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await admin('/finanzas/gastos', {
        metodo: 'POST',
        body: { ...nuevo, categoria_id: Number(nuevo.categoria_id), monto: Number(nuevo.monto) },
      });
      toast.success('Gasto registrado');
      setNuevo({ ...vacio, categoria_id: nuevo.categoria_id });
      alCambiar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(id) {
    try {
      await admin(`/finanzas/gastos/${id}`, { metodo: 'DELETE' });
      toast.success('Gasto eliminado');
      alCambiar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    }
  }

  return (
    <section className="bloque" aria-labelledby="fin-gastos">
      <div className="bloque__cabeza">
        <h2 id="fin-gastos">Gastos</h2>
      </div>
      <form className="bloque__cuerpo pila" style={{ gap: 12 }} onSubmit={agregar}>
        <div className="fila-campos">
          <Campo etiqueta="Fecha">
            {({ id }) => (
              <input id={id} type="date" className="input" value={nuevo.fecha} max={hoy} onChange={(e) => setNuevo({ ...nuevo, fecha: e.target.value })} required />
            )}
          </Campo>
          <Campo etiqueta="Categoría">
            {({ id }) => (
              <select id={id} className="input" value={nuevo.categoria_id} onChange={(e) => setNuevo({ ...nuevo, categoria_id: e.target.value })} required>
                <option value="" disabled>
                  Elegir…
                </option>
                {activas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <Campo etiqueta="Método">
            {({ id }) => (
              <select id={id} className="input" value={nuevo.metodo} onChange={(e) => setNuevo({ ...nuevo, metodo: e.target.value })}>
                {Object.entries(ETIQUETA_METODO).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        <div className="fila-campos" style={{ gridTemplateColumns: 'minmax(0, 2fr) minmax(110px, 1fr) auto' }}>
          <Campo etiqueta="Descripción">
            {({ id }) => (
              <input id={id} className="input" placeholder="Ej. navajas desechables" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} required />
            )}
          </Campo>
          <Campo etiqueta={`Monto (${simboloMoneda})`}>
            {({ id }) => (
              <input
                id={id}
                className="input num"
                inputMode="decimal"
                value={nuevo.monto}
                onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value.replace(',', '.') })}
                required
              />
            )}
          </Campo>
          <button type="submit" className="btn btn--oro" disabled={guardando}>
            <Plus /> Agregar
          </button>
        </div>
        <AvisoError>{error}</AvisoError>
      </form>

      {estado.datos?.length ? (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Detalle</th>
                <th className="derecha">Monto</th>
                <th>
                  <span className="solo-lector">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {estado.datos.map((g) => (
                <tr key={g.id}>
                  <td className="num" style={{ whiteSpace: 'nowrap' }}>
                    {partesDia(g.fecha).dia} {partesDia(g.fecha).mes}
                  </td>
                  <td>
                    {g.descripcion}
                    <div style={{ color: 'var(--muted)', fontSize: 14 }}>
                      {g.categoria} · {ETIQUETA_METODO[g.metodo]}
                    </div>
                  </td>
                  <td className="derecha num">{dinero(g.monto)}</td>
                  <td className="derecha">
                    <BotonConfirmar chico confirmar="Sí, borrar" alConfirmar={() => borrar(g.id)}>
                      Borrar
                    </BotonConfirmar>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        estado.datos && (
          <p className="bloque__cuerpo" style={{ color: 'var(--muted)', fontSize: 14 }}>
            No hay gastos en este periodo.
          </p>
        )
      )}
    </section>
  );
}
