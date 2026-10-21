import { Check } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AvisoError, Campo, Interruptor } from '../../components/Formulario.jsx';
import { mensajeDeError, publico } from '../../lib/api.js';
import { dinero, duracion, fechaLocal, hora, horaDelDia, partesDia, sumarDias } from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';
import { BarraSitio } from './BarraSitio.jsx';
import './publico.css';

const DIAS_VISIBLES = 21;
const EASE = [0.22, 1, 0.36, 1];

function agruparPorMomento(horas) {
  const grupos = [
    { nombre: 'Mañana', horas: [] },
    { nombre: 'Tarde', horas: [] },
    { nombre: 'Noche', horas: [] },
  ];
  for (const h of horas) {
    const hh = horaDelDia(h);
    grupos[hh < 12 ? 0 : hh < 18 ? 1 : 2].horas.push(h);
  }
  return grupos.filter((g) => g.horas.length);
}

const telefonoValido = (t) => /^\+?\d{7,15}$/.test(t.replace(/[\s\-().]/g, ''));
const emailValido = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());

export default function Agendar() {
  const navegar = useNavigate();
  const [params] = useSearchParams();
  const reducir = useReducedMotion();
  const pasoHora = useRef(null);
  const pasoDatos = useRef(null);

  const servicios = useCarga(() => publico('/servicios'), []);
  const agenda = useCarga(() => publico('/agenda-resumen'), []);

  const [elegidos, setElegidos] = useState(() => {
    const id = Number(params.get('servicio'));
    return id ? [id] : [];
  });
  const hoy = fechaLocal();
  const dias = useMemo(() => Array.from({ length: DIAS_VISIBLES }, (_, i) => sumarDias(hoy, i)), [hoy]);
  const [fecha, setFecha] = useState(hoy);
  const [horaElegida, setHoraElegida] = useState(null);
  const [datos, setDatos] = useState({ nombre: '', telefono: '', email: '', recordatorio: false });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState(null);

  const idsElegidos = [...elegidos].sort((a, b) => a - b).join(',');
  const horas = useCarga(
    () => (idsElegidos ? publico(`/disponibilidad?fecha=${fecha}&servicios=${idsElegidos}`) : Promise.resolve(null)),
    [fecha, idsElegidos],
  );

  const diasAbiertos = useMemo(() => {
    const hs = agenda.datos?.horarios;
    if (!hs) return null;
    return new Set(hs.map((h) => h.dia_semana));
  }, [agenda.datos]);

  const seleccion = (servicios.datos ?? []).filter((s) => elegidos.includes(s.id));
  const total = seleccion.reduce((t, s) => t + s.precio, 0);
  const minutos = seleccion.reduce((t, s) => t + s.duracion_min, 0);

  const desplazar = (ref) =>
    requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' }));

  function alternarServicio(id) {
    setElegidos((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]));
    setHoraElegida(null);
  }

  function elegirHora(h) {
    setHoraElegida(h);
    if (window.matchMedia('(max-width: 900px)').matches) desplazar(pasoDatos);
  }

  function validar() {
    const e = {};
    if (!datos.nombre.trim()) e.nombre = 'Escribe tu nombre para apartar la cita.';
    if (!telefonoValido(datos.telefono)) e.telefono = 'Escribe un teléfono válido, solo números (puedes incluir el código de país).';
    if (datos.recordatorio && !datos.email.trim()) e.email = 'Para enviarte el recordatorio necesitamos tu email.';
    else if (datos.email.trim() && !emailValido(datos.email)) e.email = 'Revisa el email, parece incompleto.';
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  async function confirmar(evento) {
    evento.preventDefault();
    setErrorEnvio(null);
    if (!horaElegida || !validar()) return;
    setEnviando(true);
    try {
      const cita = await publico('/citas', {
        metodo: 'POST',
        body: {
          nombre: datos.nombre,
          telefono: datos.telefono,
          email: datos.email || null,
          recordatorio: datos.recordatorio,
          servicios: elegidos,
          inicio: horaElegida,
        },
      });
      navegar(`/cita/${cita.id}`, { state: { nueva: true } });
    } catch (error) {
      if (error.status === 409 && /ocupado/i.test(error.message)) {
        toast.error('Alguien tomó esa hora hace un momento. Elige otra, por favor.');
        setHoraElegida(null);
        horas.recargar();
        desplazar(pasoHora);
      } else {
        setErrorEnvio(mensajeDeError(error));
      }
    } finally {
      setEnviando(false);
    }
  }

  const listo = Boolean(horaElegida) && datos.nombre.trim() && datos.telefono.trim();

  return (
    <div className="sitio">
      <BarraSitio conNavegacion={false} accion={false} />
      <main className="agendar">
        <header className="agendar__cabecera">
          <h1 className="titulo-pagina">Agenda tu cita</h1>
          <p className="texto-seccion">Tres pasos y listo. Solo te pedimos tu nombre y tu teléfono.</p>
        </header>

        <section className="paso" aria-labelledby="paso-servicio">
          <h2 id="paso-servicio" className="paso__titulo">
            ¿Qué te vas a hacer?
          </h2>
          {servicios.error ? (
            <AvisoError>{mensajeDeError(servicios.error)}</AvisoError>
          ) : !servicios.datos ? (
            <div className="opciones" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="esqueleto" style={{ height: 68 }} />
              ))}
            </div>
          ) : (
            <ul className="opciones">
              {servicios.datos.map((s) => {
                const activo = elegidos.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      className="opcion"
                      aria-pressed={activo}
                      onClick={() => alternarServicio(s.id)}
                    >
                      <span className="opcion__marca" aria-hidden="true">
                        <Check />
                      </span>
                      <span className="opcion__nombre">
                        {s.nombre}
                        {s.descripcion && <span className="opcion__detalle">{s.descripcion}</span>}
                      </span>
                      <span className="opcion__dur num">{duracion(s.duracion_min)}</span>
                      <span className="opcion__precio num">{dinero(s.precio)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section ref={pasoHora} className="paso" aria-labelledby="paso-hora" data-inactivo={!elegidos.length || undefined}>
          <h2 id="paso-hora" className="paso__titulo">
            ¿Cuándo?
          </h2>
          {!elegidos.length && <p className="paso__nota">Primero elige al menos un servicio.</p>}

          <div className="dias" role="listbox" aria-label="Día de la cita">
            {dias.map((d) => {
              const p = partesDia(d);
              const cerrado = diasAbiertos ? !diasAbiertos.has(p.diaSemana) : false;
              const activo = d === fecha;
              return (
                <button
                  key={d}
                  type="button"
                  role="option"
                  aria-selected={activo}
                  className="dia"
                  disabled={cerrado || !elegidos.length}
                  onClick={() => {
                    setFecha(d);
                    setHoraElegida(null);
                  }}
                  aria-label={`${p.larga}${cerrado ? ', cerrado' : ''}`}
                >
                  <span className="dia__semana">{d === hoy ? 'Hoy' : p.semana}</span>
                  <span className="dia__numero num">{p.dia}</span>
                  <span className="dia__mes">{cerrado ? 'Cerrado' : p.mes}</span>
                </button>
              );
            })}
          </div>

          {elegidos.length > 0 && (
            <div className="horas" aria-live="polite">
              {horas.error ? (
                <AvisoError>{mensajeDeError(horas.error)}</AvisoError>
              ) : horas.cargando ? (
                <div className="horas__grupo" aria-label="Cargando horas">
                  <div className="horas__lista">
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={i} className="esqueleto" style={{ height: 46 }} />
                    ))}
                  </div>
                </div>
              ) : horas.datos?.horas.length === 0 ? (
                <p className="paso__nota">
                  No quedan horas libres el {partesDia(fecha).larga}. Prueba con otro día.
                </p>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${fecha}-${idsElegidos}`}
                    initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22, ease: EASE }}
                  >
                    {agruparPorMomento(horas.datos?.horas ?? []).map((g) => (
                      <div key={g.nombre} className="horas__grupo">
                        <h3 className="horas__momento">{g.nombre}</h3>
                        <div className="horas__lista">
                          {g.horas.map((h) => (
                            <button
                              key={h}
                              type="button"
                              className="hora"
                              aria-pressed={h === horaElegida}
                              onClick={() => elegirHora(h)}
                            >
                              {hora(h)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          )}
        </section>

        <section ref={pasoDatos} className="paso" aria-labelledby="paso-datos" data-inactivo={!horaElegida || undefined}>
          <h2 id="paso-datos" className="paso__titulo">
            ¿A nombre de quién?
          </h2>
          <form id="form-cita" className="datos" onSubmit={confirmar} noValidate>
            <Campo etiqueta="Nombre" error={errores.nombre}>
              {({ id, invalido }) => (
                <input
                  id={id}
                  className="input"
                  autoComplete="name"
                  value={datos.nombre}
                  aria-invalid={invalido}
                  onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
                />
              )}
            </Campo>
            <Campo
              etiqueta="Teléfono"
              ayuda="Con él te reconocemos y sumamos tus visitas a la tarjeta."
              error={errores.telefono}
            >
              {({ id, invalido }) => (
                <input
                  id={id}
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={datos.telefono}
                  aria-invalid={invalido}
                  onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                />
              )}
            </Campo>
            <Interruptor
              marcado={datos.recordatorio}
              alCambiar={(v) => setDatos({ ...datos, recordatorio: v })}
              titulo="Quiero un recordatorio por email"
              detalle="Te escribimos un día antes y dos horas antes de tu cita."
            />
            <AnimatePresence initial={false}>
              {(datos.recordatorio || datos.email) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.24, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                >
                  <Campo etiqueta="Email" opcional={!datos.recordatorio} error={errores.email}>
                    {({ id, invalido }) => (
                      <input
                        id={id}
                        className="input"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={datos.email}
                        aria-invalid={invalido}
                        onChange={(e) => setDatos({ ...datos, email: e.target.value })}
                      />
                    )}
                  </Campo>
                </motion.div>
              )}
            </AnimatePresence>
            <AvisoError>{errorEnvio}</AvisoError>
          </form>
        </section>
      </main>

      <aside className="resumen" aria-label="Resumen de tu cita">
        <div className="resumen__texto">
          {seleccion.length ? (
            <>
              <span className="resumen__linea">
                {seleccion.map((s) => s.nombre).join(' + ')}
              </span>
              <span className="resumen__detalle num">
                {dinero(total)} · {duracion(minutos)}
                {horaElegida && ` · ${partesDia(fecha).larga}, ${hora(horaElegida)}`}
              </span>
            </>
          ) : (
            <span className="resumen__detalle">Elige un servicio para empezar</span>
          )}
        </div>
        <button type="submit" form="form-cita" className="btn btn--oro" disabled={!listo || enviando}>
          {enviando ? 'Agendando…' : 'Confirmar cita'}
        </button>
      </aside>
    </div>
  );
}
