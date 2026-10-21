import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AvisoError, Campo, Interruptor } from '../../../components/Formulario.jsx';
import { Panel } from '../../../components/Panel.jsx';
import { admin, mensajeDeError, publico } from '../../../lib/api.js';
import { dinero, duracion, fechaLocal, hora, isoLocal } from '../../../lib/formato.js';
import { BuscarCliente } from './BuscarCliente.jsx';

// Agendar desde el panel (cliente que llama o escribe). Permite agendar fuera de horario.
export function NuevaCita({ abierto, alCerrar, alGuardar, fechaInicial, clienteInicial }) {
  const [cliente, setCliente] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [elegidos, setElegidos] = useState([]);
  const [fecha, setFecha] = useState(fechaLocal());
  const [horas, setHoras] = useState(null);
  const [horaElegida, setHoraElegida] = useState(null);
  const [manual, setManual] = useState(false);
  const [horaManual, setHoraManual] = useState('');
  const [recordatorio, setRecordatorio] = useState(false);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!abierto) return;
    setCliente(clienteInicial ?? null);
    setElegidos([]);
    setFecha(fechaInicial ?? fechaLocal());
    setHoraElegida(null);
    setManual(false);
    setHoraManual('');
    setRecordatorio(false);
    setNotas('');
    setError(null);
    admin('/servicios').then((s) => setCatalogo(s.filter((x) => x.activo))).catch(() => setCatalogo([]));
  }, [abierto, fechaInicial, clienteInicial]);

  const ids = [...elegidos].sort((a, b) => a - b).join(',');
  useEffect(() => {
    setHoras(null);
    setHoraElegida(null);
    if (!abierto || !ids || manual) return;
    publico(`/disponibilidad?fecha=${fecha}&servicios=${ids}`)
      .then((r) => setHoras(r.horas))
      .catch((e) => {
        setHoras([]);
        setError(mensajeDeError(e));
      });
  }, [abierto, fecha, ids, manual]);

  const seleccion = catalogo.filter((s) => elegidos.includes(s.id));
  const minutos = seleccion.reduce((t, s) => t + s.duracion_min, 0);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    const inicio = manual ? (horaManual ? isoLocal(fecha, horaManual) : null) : horaElegida;
    if (!cliente) return setError('Elige el cliente.');
    if (!elegidos.length) return setError('Marca al menos un servicio.');
    if (!inicio) return setError('Elige la hora.');
    setGuardando(true);
    try {
      const cita = await admin('/citas', {
        metodo: 'POST',
        body: { cliente_id: cliente.id, servicios: elegidos, inicio, recordatorio, notas, forzar: manual },
      });
      toast.success('Cita agendada', { description: `${cliente.nombre} · ${hora(cita.inicio)}` });
      alGuardar?.(cita);
      alCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Panel
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Nueva cita"
      descripcion="Para clientes que te escriben o llaman."
      pie={
        <>
          <button type="button" className="btn btn--borde" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" form="form-nueva-cita" className="btn btn--oro" disabled={guardando}>
            {guardando ? 'Agendando…' : 'Agendar'}
          </button>
        </>
      }
    >
      <form id="form-nueva-cita" onSubmit={guardar} className="pila">
        <BuscarCliente cliente={cliente} alElegir={setCliente} />

        <fieldset className="pila" style={{ gap: 8, border: 0, padding: 0, margin: 0 }}>
          <legend className="campo__etiqueta" style={{ marginBottom: 8 }}>
            Servicios {minutos > 0 && <span className="campo__opcional">· {duracion(minutos)}</span>}
          </legend>
          <div className="servicios-check">
            {catalogo.map((s) => (
              <label key={s.id} className="servicio-check">
                <input
                  type="checkbox"
                  checked={elegidos.includes(s.id)}
                  onChange={() =>
                    setElegidos((a) => (a.includes(s.id) ? a.filter((x) => x !== s.id) : [...a, s.id]))
                  }
                />
                <span>{s.nombre}</span>
                <small className="num">{dinero(s.precio)}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <Campo etiqueta="Día">
          {({ id }) => <input id={id} type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} />}
        </Campo>

        {manual ? (
          <Campo etiqueta="Hora" ayuda="Se agenda aunque esté fuera del horario de atención, pero nunca encima de otra cita.">
            {({ id }) => (
              <input id={id} type="time" className="input" value={horaManual} onChange={(e) => setHoraManual(e.target.value)} />
            )}
          </Campo>
        ) : (
          <div className="pila" style={{ gap: 8 }}>
            <span className="campo__etiqueta">Hora</span>
            {!ids ? (
              <p className="campo__ayuda">Marca los servicios para ver las horas libres.</p>
            ) : horas === null ? (
              <div className="esqueleto" style={{ height: 40 }} />
            ) : horas.length === 0 ? (
              <p className="campo__ayuda">No hay horas libres ese día dentro del horario.</p>
            ) : (
              <div className="horas-chicas">
                {horas.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="hora"
                    aria-pressed={h === horaElegida}
                    onClick={() => setHoraElegida(h)}
                  >
                    {hora(h)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button type="button" className="enlace" style={{ justifySelf: 'start', background: 'none', border: 0, padding: 0 }} onClick={() => setManual(!manual)}>
          {manual ? 'Elegir entre las horas libres' : 'Escribir otra hora (fuera de horario)'}
        </button>

        {cliente?.email ? (
          <Interruptor
            marcado={recordatorio}
            alCambiar={setRecordatorio}
            titulo="Enviar recordatorio por email"
            detalle={cliente.email}
          />
        ) : (
          cliente && <p className="campo__ayuda">Este cliente no tiene email, así que no recibirá recordatorio.</p>
        )}

        <Campo etiqueta="Notas" opcional>
          {({ id }) => <textarea id={id} className="input" value={notas} onChange={(e) => setNotas(e.target.value)} />}
        </Campo>

        <AvisoError>{error}</AvisoError>
      </form>
    </Panel>
  );
}
