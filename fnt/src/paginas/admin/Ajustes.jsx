import { Tabs } from '@base-ui/react/tabs';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BotonConfirmar } from '../../components/BotonConfirmar.jsx';
import { AvisoError, Campo, Interruptor } from '../../components/Formulario.jsx';
import { admin, mensajeDeError } from '../../lib/api.js';
import { DIAS, dinero, duracion, fechaLocal, hora, isoLocal, simboloMoneda, sumarDias } from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';

export default function Ajustes() {
  return (
    <>
      <header className="cabecera">
        <div>
          <h1>Ajustes</h1>
          <p>Lo que ven tus clientes al agendar.</p>
        </div>
      </header>
      <Tabs.Root defaultValue="servicios">
        <Tabs.List className="pestanas__lista">
          <Tabs.Tab value="servicios" className="pestanas__tab">
            Servicios
          </Tabs.Tab>
          <Tabs.Tab value="horario" className="pestanas__tab">
            Horario
          </Tabs.Tab>
          <Tabs.Tab value="bloqueos" className="pestanas__tab">
            Días libres
          </Tabs.Tab>
          <Tabs.Tab value="fidelidad" className="pestanas__tab">
            Fidelidad
          </Tabs.Tab>
          <Tabs.Indicator className="pestanas__indicador" />
        </Tabs.List>
        <Tabs.Panel value="servicios">
          <Servicios />
        </Tabs.Panel>
        <Tabs.Panel value="horario">
          <Horario />
        </Tabs.Panel>
        <Tabs.Panel value="bloqueos">
          <Bloqueos />
        </Tabs.Panel>
        <Tabs.Panel value="fidelidad">
          <Fidelidad />
        </Tabs.Panel>
      </Tabs.Root>
    </>
  );
}

/* ---------- Servicios ---------- */

function FilaServicio({ servicio, alGuardar }) {
  const [d, setD] = useState({
    nombre: servicio.nombre,
    duracion_min: String(servicio.duracion_min),
    precio: String(servicio.precio),
  });
  const cambiado =
    d.nombre !== servicio.nombre || Number(d.duracion_min) !== servicio.duracion_min || Number(d.precio) !== servicio.precio;

  async function guardar(cambios) {
    try {
      await admin(`/servicios/${servicio.id}`, { metodo: 'PATCH', body: cambios });
      toast.success('Servicio actualizado');
      alGuardar();
    } catch (e) {
      toast.error(mensajeDeError(e));
    }
  }

  return (
    <tr style={{ opacity: servicio.activo ? 1 : 0.6 }}>
      <td>
        <input className="input" aria-label="Nombre" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} />
      </td>
      <td>
        <input
          className="input num"
          aria-label="Duración en minutos"
          inputMode="numeric"
          style={{ width: 90 }}
          value={d.duracion_min}
          onChange={(e) => setD({ ...d, duracion_min: e.target.value })}
        />
      </td>
      <td>
        <input
          className="input num"
          aria-label={`Precio en ${simboloMoneda}`}
          inputMode="decimal"
          style={{ width: 110 }}
          value={d.precio}
          onChange={(e) => setD({ ...d, precio: e.target.value.replace(',', '.') })}
        />
      </td>
      <td>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
          {cambiado && (
            <button
              type="button"
              className="btn btn--oro btn--chico"
              onClick={() => guardar({ nombre: d.nombre, duracion_min: Number(d.duracion_min), precio: Number(d.precio) })}
            >
              Guardar
            </button>
          )}
          <button type="button" className="btn btn--suave btn--chico" onClick={() => guardar({ activo: !servicio.activo })}>
            {servicio.activo ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function Servicios() {
  const servicios = useCarga(() => admin('/servicios'), []);
  const [nuevo, setNuevo] = useState({ nombre: '', duracion_min: '30', precio: '' });
  const [error, setError] = useState(null);

  async function crear(e) {
    e.preventDefault();
    setError(null);
    try {
      await admin('/servicios', {
        metodo: 'POST',
        body: { nombre: nuevo.nombre, duracion_min: Number(nuevo.duracion_min), precio: Number(nuevo.precio) },
      });
      toast.success('Servicio agregado');
      setNuevo({ nombre: '', duracion_min: '30', precio: '' });
      servicios.recargar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  return (
    <section className="bloque">
      <div className="bloque__cabeza">
        <h2>Servicios y precios</h2>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Los ocultos no aparecen al agendar.</span>
      </div>
      {servicios.datos?.length ? (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Minutos</th>
                <th>Precio</th>
                <th>
                  <span className="solo-lector">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {servicios.datos.map((s) => (
                <FilaServicio key={`${s.id}-${s.actualizado_en}`} servicio={s} alGuardar={servicios.recargar} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        servicios.datos && (
          <p className="bloque__cuerpo" style={{ color: 'var(--muted)' }}>
            Agrega tu primer servicio para que los clientes puedan agendar.
          </p>
        )
      )}
      <form className="bloque__cuerpo" onSubmit={crear} style={{ paddingTop: 20 }}>
        <div className="fila-campos" style={{ gridTemplateColumns: 'minmax(0, 2fr) 110px 120px auto' }}>
          <Campo etiqueta="Nuevo servicio">
            {({ id }) => (
              <input id={id} className="input" placeholder="Ej. Corte y barba" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required />
            )}
          </Campo>
          <Campo etiqueta="Minutos">
            {({ id }) => (
              <input id={id} className="input num" inputMode="numeric" value={nuevo.duracion_min} onChange={(e) => setNuevo({ ...nuevo, duracion_min: e.target.value })} required />
            )}
          </Campo>
          <Campo etiqueta={`Precio (${simboloMoneda})`}>
            {({ id }) => (
              <input id={id} className="input num" inputMode="decimal" value={nuevo.precio} onChange={(e) => setNuevo({ ...nuevo, precio: e.target.value.replace(',', '.') })} required />
            )}
          </Campo>
          <button type="submit" className="btn btn--oro">
            <Plus /> Agregar
          </button>
        </div>
        {nuevo.nombre && nuevo.precio && (
          <p className="campo__ayuda num" style={{ marginTop: 8 }}>
            Se verá como: {nuevo.nombre} · {duracion(Number(nuevo.duracion_min) || 0)} · {dinero(Number(nuevo.precio) || 0)}
          </p>
        )}
        <div style={{ marginTop: 12 }}>
          <AvisoError>{error}</AvisoError>
        </div>
      </form>
    </section>
  );
}

/* ---------- Horario ---------- */

const ORDEN = [1, 2, 3, 4, 5, 6, 0];

function DiaHorario({ dia, tramos, alCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [t, setT] = useState({ hora_inicio: '09:00', hora_fin: '13:00' });

  async function agregar(e) {
    e.preventDefault();
    try {
      await admin('/agenda/horarios', { metodo: 'POST', body: { dia_semana: dia, ...t } });
      setAbierto(false);
      alCambiar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    }
  }

  async function quitar(id) {
    try {
      await admin(`/agenda/horarios/${id}`, { metodo: 'DELETE' });
      alCambiar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    }
  }

  return (
    <div className="dia-horario">
      <strong>{DIAS[dia]}</strong>
      <div className="dia-horario__tramos">
        {tramos.length === 0 && !abierto && <span style={{ color: 'var(--muted)' }}>Cerrado</span>}
        {tramos.map((tr) => (
          <span key={tr.id} className="tramo">
            {tr.hora_inicio} a {tr.hora_fin}
            <button type="button" className="icono-btn" aria-label={`Quitar ${tr.hora_inicio} a ${tr.hora_fin}`} onClick={() => quitar(tr.id)}>
              <X />
            </button>
          </span>
        ))}
        {abierto ? (
          <form onSubmit={agregar} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <input type="time" className="input" style={{ width: 'auto', minHeight: 38 }} aria-label="Desde" value={t.hora_inicio} onChange={(e) => setT({ ...t, hora_inicio: e.target.value })} required />
            <span style={{ color: 'var(--muted)' }}>a</span>
            <input type="time" className="input" style={{ width: 'auto', minHeight: 38 }} aria-label="Hasta" value={t.hora_fin} onChange={(e) => setT({ ...t, hora_fin: e.target.value })} required />
            <button type="submit" className="btn btn--oro btn--chico">
              Agregar
            </button>
            <button type="button" className="btn btn--borde btn--chico" onClick={() => setAbierto(false)}>
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" className="btn btn--suave btn--chico" onClick={() => setAbierto(true)}>
            <Plus /> Tramo
          </button>
        )}
      </div>
    </div>
  );
}

function Horario() {
  const horarios = useCarga(() => admin('/agenda/horarios'), []);
  return (
    <section className="bloque">
      <div className="bloque__cabeza">
        <h2>Horario semanal</h2>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Puedes tener varios tramos por día (mañana y tarde).</span>
      </div>
      {horarios.error && (
        <div className="bloque__cuerpo">
          <AvisoError>{mensajeDeError(horarios.error)}</AvisoError>
        </div>
      )}
      {horarios.datos &&
        ORDEN.map((d) => (
          <DiaHorario key={d} dia={d} tramos={horarios.datos.filter((h) => h.dia_semana === d)} alCambiar={horarios.recargar} />
        ))}
    </section>
  );
}

/* ---------- Días libres (bloqueos) ---------- */

function Bloqueos() {
  const hoy = fechaLocal();
  const bloqueos = useCarga(() => admin(`/agenda/bloqueos?desde=${hoy}&hasta=${sumarDias(hoy, 365)}`), [hoy]);
  const [todoElDia, setTodoElDia] = useState(true);
  const [b, setB] = useState({ desde: hoy, hasta: hoy, hora_inicio: '09:00', hora_fin: '13:00', motivo: '' });
  const [error, setError] = useState(null);

  async function crear(e) {
    e.preventDefault();
    setError(null);
    const inicio = todoElDia ? isoLocal(b.desde, '00:00') : isoLocal(b.desde, b.hora_inicio);
    const fin = todoElDia ? isoLocal(sumarDias(b.hasta, 1), '00:00') : isoLocal(b.desde, b.hora_fin);
    try {
      await admin('/agenda/bloqueos', { metodo: 'POST', body: { inicio, fin, motivo: b.motivo } });
      toast.success('Bloqueo agregado: nadie podrá agendar en ese horario');
      setB({ ...b, motivo: '' });
      bloqueos.recargar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  async function quitar(id) {
    try {
      await admin(`/agenda/bloqueos/${id}`, { metodo: 'DELETE' });
      bloqueos.recargar();
    } catch (err) {
      toast.error(mensajeDeError(err));
    }
  }

  const rango = (x) => {
    const ini = new Date(x.inicio);
    const fin = new Date(new Date(x.fin).getTime() - 1);
    const fmt = (d) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(d).replace('.', '');
    const diaCompleto = hora(x.inicio) === hora(x.fin) && hora(x.inicio).startsWith('12:00');
    if (diaCompleto) return fechaLocal(ini) === fechaLocal(fin) ? fmt(ini) : `${fmt(ini)} al ${fmt(fin)}`;
    return `${fmt(ini)}, ${hora(x.inicio)} a ${hora(x.fin)}`;
  };

  return (
    <section className="bloque">
      <div className="bloque__cabeza">
        <h2>Días libres y bloqueos</h2>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>Vacaciones, feriados o un trámite: esas horas no se ofrecen.</span>
      </div>
      <form className="bloque__cuerpo pila" style={{ gap: 14 }} onSubmit={crear}>
        <Interruptor marcado={todoElDia} alCambiar={setTodoElDia} titulo="Días completos" />
        <div className="fila-campos">
          <Campo etiqueta={todoElDia ? 'Desde' : 'Día'}>
            {({ id }) => <input id={id} type="date" className="input" min={hoy} value={b.desde} onChange={(e) => setB({ ...b, desde: e.target.value, hasta: e.target.value > b.hasta ? e.target.value : b.hasta })} required />}
          </Campo>
          {todoElDia ? (
            <Campo etiqueta="Hasta">
              {({ id }) => <input id={id} type="date" className="input" min={b.desde} value={b.hasta} onChange={(e) => setB({ ...b, hasta: e.target.value })} required />}
            </Campo>
          ) : (
            <>
              <Campo etiqueta="De">
                {({ id }) => <input id={id} type="time" className="input" value={b.hora_inicio} onChange={(e) => setB({ ...b, hora_inicio: e.target.value })} required />}
              </Campo>
              <Campo etiqueta="A">
                {({ id }) => <input id={id} type="time" className="input" value={b.hora_fin} onChange={(e) => setB({ ...b, hora_fin: e.target.value })} required />}
              </Campo>
            </>
          )}
          <Campo etiqueta="Motivo" opcional>
            {({ id }) => <input id={id} className="input" placeholder="Ej. Vacaciones" value={b.motivo} onChange={(e) => setB({ ...b, motivo: e.target.value })} />}
          </Campo>
        </div>
        <button type="submit" className="btn btn--oro" style={{ justifySelf: 'start' }}>
          <Plus /> Bloquear
        </button>
        <AvisoError>{error}</AvisoError>
      </form>
      {bloqueos.datos?.length > 0 && (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Motivo</th>
                <th>
                  <span className="solo-lector">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {bloqueos.datos.map((x) => (
                <tr key={x.id}>
                  <td className="num">{rango(x)}</td>
                  <td style={{ color: x.motivo ? 'var(--ink)' : 'var(--muted)' }}>{x.motivo || 'Sin motivo'}</td>
                  <td className="derecha">
                    <BotonConfirmar chico confirmar="Sí, quitar" alConfirmar={() => quitar(x.id)}>
                      Quitar
                    </BotonConfirmar>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------- Fidelidad ---------- */

const TIPOS = {
  corte_gratis: 'Corte gratis',
  descuento_porcentaje: 'Descuento en %',
  descuento_monto: `Descuento en ${simboloMoneda}`,
  producto: 'Producto de regalo',
};

function Fidelidad() {
  const regla = useCarga(() => admin('/fidelidad/regla'), []);
  const [d, setD] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (regla.datos !== null || !regla.cargando) {
      const r = regla.datos;
      setD({
        nombre: r?.nombre ?? 'Corte gratis cada 10 visitas',
        visitas_requeridas: String(r?.visitas_requeridas ?? 10),
        tipo_recompensa: r?.tipo_recompensa ?? 'corte_gratis',
        valor: r?.valor != null ? String(r.valor) : '',
        dias_vigencia: r?.dias_vigencia != null ? String(r.dias_vigencia) : '',
      });
    }
  }, [regla.datos, regla.cargando]);

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    try {
      await admin('/fidelidad/regla', {
        metodo: 'PUT',
        body: {
          nombre: d.nombre,
          visitas_requeridas: Number(d.visitas_requeridas),
          tipo_recompensa: d.tipo_recompensa,
          valor: d.valor ? Number(d.valor) : null,
          dias_vigencia: d.dias_vigencia ? Number(d.dias_vigencia) : null,
        },
      });
      toast.success('Regla de fidelidad actualizada');
      regla.recargar();
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  if (!d) return <div className="esqueleto" style={{ height: 240 }} />;
  const conValor = d.tipo_recompensa.startsWith('descuento');

  return (
    <section className="bloque">
      <div className="bloque__cabeza">
        <h2>Regla de fidelidad</h2>
      </div>
      <form className="bloque__cuerpo pila" onSubmit={guardar} style={{ maxWidth: 560 }}>
        <Campo etiqueta="Nombre de la promoción">
          {({ id }) => <input id={id} className="input" value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} required />}
        </Campo>
        <div className="fila-campos">
          <Campo etiqueta="Visitas para ganar">
            {({ id }) => <input id={id} className="input num" inputMode="numeric" value={d.visitas_requeridas} onChange={(e) => setD({ ...d, visitas_requeridas: e.target.value })} required />}
          </Campo>
          <Campo etiqueta="Premio">
            {({ id }) => (
              <select id={id} className="input" value={d.tipo_recompensa} onChange={(e) => setD({ ...d, tipo_recompensa: e.target.value })}>
                {Object.entries(TIPOS).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </div>
        <div className="fila-campos">
          {conValor && (
            <Campo etiqueta={d.tipo_recompensa === 'descuento_porcentaje' ? 'Porcentaje' : `Monto (${simboloMoneda})`}>
              {({ id }) => <input id={id} className="input num" inputMode="decimal" value={d.valor} onChange={(e) => setD({ ...d, valor: e.target.value })} required />}
            </Campo>
          )}
          <Campo etiqueta="Días para usarlo" opcional ayuda="Vacío = no vence.">
            {({ id }) => <input id={id} className="input num" inputMode="numeric" value={d.dias_vigencia} onChange={(e) => setD({ ...d, dias_vigencia: e.target.value })} />}
          </Campo>
        </div>
        <p className="campo__ayuda">
          Al guardar, la regla anterior se archiva. Los premios ya ganados se mantienen y el conteo de cada cliente sigue igual.
        </p>
        <AvisoError>{error}</AvisoError>
        <button type="submit" className="btn btn--oro" style={{ justifySelf: 'start' }}>
          Guardar regla
        </button>
      </form>
    </section>
  );
}
