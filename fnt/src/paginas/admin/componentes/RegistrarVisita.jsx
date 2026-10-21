import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AvisoError, Campo, Interruptor } from '../../../components/Formulario.jsx';
import { Panel } from '../../../components/Panel.jsx';
import { admin, mensajeDeError } from '../../../lib/api.js';
import { ETIQUETA_METODO, dinero, simboloMoneda } from '../../../lib/formato.js';
import { BuscarCliente } from './BuscarCliente.jsx';

const pagoVacio = () => ({ metodo: 'efectivo', monto: '' });

// Registrar una atención: servicios, cobro y canje del corte gratis.
// Puede abrirse desde una cita (trae cliente y servicios) o vacía (cliente sin cita).
export function RegistrarVisita({ abierto, alCerrar, alGuardar, cita, clienteInicial }) {
  const [cliente, setCliente] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [precios, setPrecios] = useState({}); // servicio_id -> precio (string)
  const [recompensa, setRecompensa] = useState(null);
  const [canjear, setCanjear] = useState(false);
  const [pagos, setPagos] = useState([pagoVacio()]);
  const [pagoEditado, setPagoEditado] = useState(false);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Reiniciar al abrir.
  useEffect(() => {
    if (!abierto) return;
    setError(null);
    setCanjear(false);
    setPagos([pagoVacio()]);
    setPagoEditado(false);
    setNotas('');
    setCliente(cita ? { id: cita.cliente_id, nombre: cita.cliente_nombre, telefono: cita.cliente_telefono } : clienteInicial ?? null);
    setPrecios(cita ? Object.fromEntries(cita.servicios.map((s) => [s.id, String(s.precio)])) : {});
    admin('/servicios').then(setCatalogo).catch(() => setCatalogo([]));
  }, [abierto, cita, clienteInicial]);

  // Recompensa disponible del cliente elegido.
  useEffect(() => {
    setRecompensa(null);
    setCanjear(false);
    if (!cliente?.id) return;
    admin(`/clientes/${cliente.id}`)
      .then((d) => setRecompensa(d.recompensas.find((r) => r.estado === 'disponible') ?? null))
      .catch(() => {});
  }, [cliente?.id]);

  const elegidos = Object.keys(precios).map(Number);
  const total = useMemo(
    () => Object.values(precios).reduce((t, p) => t + (Number(p) || 0), 0),
    [precios],
  );

  // El monto del pago sigue al total mientras no se edite a mano.
  useEffect(() => {
    if (!pagoEditado) setPagos((ps) => (ps.length === 1 ? [{ ...ps[0], monto: total ? String(total) : '' }] : ps));
  }, [total, pagoEditado]);

  function alternar(servicio) {
    setPrecios((p) => {
      const copia = { ...p };
      if (servicio.id in copia) delete copia[servicio.id];
      else copia[servicio.id] = String(servicio.precio);
      return copia;
    });
  }

  function alternarCanje(valor) {
    setCanjear(valor);
    if (!valor || !elegidos.length) return;
    // Deja en 0 el corte (o el primer servicio) al canjear el premio.
    const corte = catalogo.find((s) => elegidos.includes(s.id) && /corte/i.test(s.nombre)) ?? { id: elegidos[0] };
    setPrecios((p) => ({ ...p, [corte.id]: '0' }));
  }

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    if (!cliente) return setError('Elige el cliente.');
    if (!elegidos.length) return setError('Marca al menos un servicio.');
    setGuardando(true);
    try {
      const resultado = await admin('/visitas', {
        metodo: 'POST',
        body: {
          cliente_id: cliente.id,
          cita_id: cita?.id ?? null,
          servicios: elegidos.map((id) => ({ servicio_id: id, precio_cobrado: Number(precios[id]) || 0 })),
          pagos: pagos.filter((p) => Number(p.monto) > 0).map((p) => ({ metodo: p.metodo, monto: Number(p.monto) })),
          canjear_recompensa_id: canjear ? recompensa.id : null,
          notas,
        },
      });
      if (resultado.recompensa_otorgada) {
        toast.success(`${cliente.nombre} completó su tarjeta`, {
          description: 'Su próximo corte es gratis. Lo verás al registrar su siguiente visita.',
          duration: 8000,
        });
      } else {
        toast.success('Visita registrada', { description: `${cliente.nombre} · ${dinero(resultado.visita.total)}` });
      }
      alGuardar?.(resultado);
      alCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  const pagado = pagos.reduce((t, p) => t + (Number(p.monto) || 0), 0);
  const activos = catalogo.filter((s) => s.activo || s.id in precios);

  return (
    <Panel
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Registrar visita"
      descripcion={cita ? 'Cierra la cita y suma un sello a la tarjeta del cliente.' : 'Para un cliente que llegó sin cita.'}
      pie={
        <>
          <button type="button" className="btn btn--borde" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" form="form-visita" className="btn btn--oro" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar visita'}
          </button>
        </>
      }
    >
      <form id="form-visita" onSubmit={guardar} className="pila">
        {cita ? (
          <div className="elegido">
            <div>
              <strong>{cliente?.nombre}</strong>
              <small>Desde la cita</small>
            </div>
          </div>
        ) : (
          <BuscarCliente cliente={cliente} alElegir={setCliente} />
        )}

        {recompensa && (
          <div className="premio">
            <span>
              <strong>Tiene un corte gratis</strong> por completar su tarjeta.
            </span>
            <Interruptor marcado={canjear} alCambiar={alternarCanje} titulo="Usarlo hoy" />
          </div>
        )}

        <fieldset className="pila" style={{ gap: 8, border: 0, padding: 0, margin: 0 }}>
          <legend className="campo__etiqueta" style={{ marginBottom: 8 }}>
            Servicios
          </legend>
          <div className="servicios-check">
            {activos.map((s) => {
              const marcado = s.id in precios;
              return (
                <label key={s.id} className="servicio-check">
                  <input type="checkbox" checked={marcado} onChange={() => alternar(s)} />
                  <span>
                    {s.nombre}
                    <small className="num">Precio de lista {dinero(s.precio)}</small>
                  </span>
                  {marcado && (
                    <input
                      className="input num"
                      inputMode="decimal"
                      aria-label={`Precio cobrado por ${s.nombre}`}
                      value={precios[s.id]}
                      onChange={(e) => setPrecios({ ...precios, [s.id]: e.target.value.replace(',', '.') })}
                    />
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="total-visita">
          <span>Total</span>
          <span className="num">{dinero(total)}</span>
        </div>

        <fieldset className="pila" style={{ gap: 10, border: 0, padding: 0, margin: 0 }}>
          <legend className="campo__etiqueta" style={{ marginBottom: 8 }}>
            Pago
          </legend>
          {pagos.map((p, i) => (
            <div key={i} className="fila-campos" style={{ gridTemplateColumns: '1fr 130px auto' }}>
              <select
                className="input"
                aria-label="Método de pago"
                value={p.metodo}
                onChange={(e) => setPagos(pagos.map((x, j) => (j === i ? { ...x, metodo: e.target.value } : x)))}
              >
                {Object.entries(ETIQUETA_METODO).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="input num"
                inputMode="decimal"
                aria-label={`Monto en ${simboloMoneda}`}
                placeholder="0"
                value={p.monto}
                onChange={(e) => {
                  setPagoEditado(true);
                  setPagos(pagos.map((x, j) => (j === i ? { ...x, monto: e.target.value.replace(',', '.') } : x)));
                }}
              />
              {pagos.length > 1 ? (
                <button type="button" className="icono-btn" aria-label="Quitar pago" onClick={() => setPagos(pagos.filter((_, j) => j !== i))}>
                  <Trash2 />
                </button>
              ) : (
                <span style={{ width: 40 }} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn btn--borde btn--chico"
              onClick={() => {
                setPagoEditado(true);
                setPagos([...pagos, pagoVacio()]);
              }}
            >
              <Plus /> Dividir pago
            </button>
            {pagado !== total && (
              <span className="campo__ayuda num">
                {pagado < total ? `Faltan ${dinero(total - pagado)}` : `${dinero(pagado - total)} de más (propina)`}
              </span>
            )}
          </div>
        </fieldset>

        <Campo etiqueta="Notas" opcional>
          {({ id }) => <textarea id={id} className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />}
        </Campo>

        <AvisoError>{error}</AvisoError>
      </form>
    </Panel>
  );
}
