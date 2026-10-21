import { ArrowLeft, CalendarPlus, Mail, Pencil, Phone, Scissors } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { BotonConfirmar } from '../../components/BotonConfirmar.jsx';
import { AvisoError } from '../../components/Formulario.jsx';
import { TarjetaFidelidad } from '../../components/TarjetaFidelidad.jsx';
import { admin, mensajeDeError } from '../../lib/api.js';
import { ETIQUETA_ESTADO, dinero, fechaCorta, fechaLarga, hora, telefonoLegible } from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';
import { FichaCliente } from './componentes/FichaCliente.jsx';
import { NuevaCita } from './componentes/NuevaCita.jsx';
import { RegistrarVisita } from './componentes/RegistrarVisita.jsx';

export default function ClienteDetalle() {
  const { id } = useParams();
  const cliente = useCarga(() => admin(`/clientes/${id}`), [id]);
  const [panel, setPanel] = useState(null); // 'visita' | 'cita' | 'editar'
  const c = cliente.datos;

  if (cliente.error) {
    return (
      <div className="pila">
        <Link to="/admin/clientes" className="enlace">
          Volver a clientes
        </Link>
        <AvisoError>{mensajeDeError(cliente.error)}</AvisoError>
      </div>
    );
  }
  if (!c) return <div className="esqueleto" style={{ height: 320 }} />;

  const disponibles = c.recompensas.filter((r) => r.estado === 'disponible');

  async function anular(recompensa) {
    try {
      await admin(`/fidelidad/recompensas/${recompensa.id}/anular`, { metodo: 'PATCH' });
      toast.success('Corte gratis anulado');
      cliente.recargar();
    } catch (e) {
      toast.error(mensajeDeError(e));
    }
  }

  return (
    <>
      <Link to="/admin/clientes" className="enlace" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 14 }}>
        <ArrowLeft size={16} /> Clientes
      </Link>
      <header className="cabecera">
        <div>
          <h1>{c.nombre}</h1>
          <p style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
            <a href={`tel:${c.telefono}`} className="num" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <Phone size={15} /> {telefonoLegible(c.telefono)}
            </a>
            {c.email && (
              <a href={`mailto:${c.email}`} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <Mail size={15} /> {c.email}
              </a>
            )}
            <span>Cliente desde {fechaCorta(c.creado_en)}</span>
            {!c.activo && <span style={{ color: 'var(--error)' }}>Inactivo</span>}
          </p>
        </div>
        <div className="cabecera__acciones">
          <button type="button" className="btn btn--borde" onClick={() => setPanel('editar')}>
            <Pencil /> Editar
          </button>
          <button type="button" className="btn btn--borde" onClick={() => setPanel('cita')}>
            <CalendarPlus /> Nueva cita
          </button>
          <button type="button" className="btn btn--oro" onClick={() => setPanel('visita')}>
            <Scissors /> Registrar visita
          </button>
        </div>
      </header>

      <div className="columnas">
        <div className="pila">
          <section className="bloque" aria-labelledby="cli-tarjeta">
            <div className="bloque__cabeza">
              <h2 id="cli-tarjeta">Tarjeta de fidelidad</h2>
              {c.fidelidad && (
                <span className="chip num">
                  {c.fidelidad.visitas_faltantes === 0 ? 'Completa' : `Faltan ${c.fidelidad.visitas_faltantes}`}
                </span>
              )}
            </div>
            <div className="bloque__cuerpo pila">
              {c.fidelidad ? (
                <TarjetaFidelidad
                  key={c.fidelidad.visitas_acumuladas}
                  acumuladas={c.fidelidad.visitas_acumuladas}
                  requeridas={c.fidelidad.visitas_requeridas}
                  tamano="grande"
                  titular={c.nombre}
                />
              ) : (
                <p style={{ color: 'var(--muted)' }}>No hay una regla de fidelidad activa. Configúrala en Ajustes.</p>
              )}
              {disponibles.map((r) => (
                <div key={r.id} className="premio">
                  <span>
                    <strong>Corte gratis disponible</strong> desde el {fechaCorta(r.otorgada_en)}
                    {r.vence_en && `, vence el ${fechaCorta(r.vence_en)}`}. Se canjea al registrar su próxima visita.
                  </span>
                  <BotonConfirmar chico confirmar="Sí, anular" alConfirmar={() => anular(r)}>
                    Anular
                  </BotonConfirmar>
                </div>
              ))}
            </div>
          </section>

          <section className="bloque" aria-labelledby="cli-visitas">
            <div className="bloque__cabeza">
              <h2 id="cli-visitas">Últimas visitas</h2>
            </div>
            {c.ultimas_visitas.length === 0 ? (
              <p className="bloque__cuerpo" style={{ color: 'var(--muted)' }}>
                Aún no tiene visitas. La primera suma su primer sello.
              </p>
            ) : (
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Sello</th>
                      <th className="derecha">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.ultimas_visitas.map((v) => (
                      <tr key={v.id}>
                        <td className="num">
                          {fechaCorta(v.fecha)} · {hora(v.fecha)}
                        </td>
                        <td>
                          {v.cuenta_para_fidelidad ? (
                            <span className="chip">Suma</span>
                          ) : (
                            <span className="chip chip--oro">Corte gratis</span>
                          )}
                        </td>
                        <td className="derecha num">{dinero(v.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="pila">
          <section className="bloque" aria-labelledby="cli-citas">
            <div className="bloque__cabeza">
              <h2 id="cli-citas">Próximas citas</h2>
            </div>
            <div className="bloque__cuerpo">
              {c.proximas_citas.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>No tiene citas agendadas.</p>
              ) : (
                <ul className="pila" style={{ gap: 10 }}>
                  {c.proximas_citas.map((ci) => (
                    <li key={ci.id} className="elegido">
                      <div>
                        <strong style={{ textTransform: 'capitalize' }}>{fechaLarga(ci.inicio)}</strong>
                        <small className="num">{hora(ci.inicio)}</small>
                      </div>
                      <span className={`estado estado--${ci.estado}`}>{ETIQUETA_ESTADO[ci.estado]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {(c.notas || c.fecha_nacimiento) && (
            <section className="bloque" aria-labelledby="cli-notas">
              <div className="bloque__cabeza">
                <h2 id="cli-notas">Notas</h2>
              </div>
              <div className="bloque__cuerpo pila" style={{ gap: 8 }}>
                {c.fecha_nacimiento && (
                  <p>
                    Cumpleaños:{' '}
                    {new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
                      new Date(`${c.fecha_nacimiento}T12:00:00Z`),
                    )}
                  </p>
                )}
                {c.notas && <p style={{ whiteSpace: 'pre-line' }}>{c.notas}</p>}
              </div>
            </section>
          )}
        </div>
      </div>

      <RegistrarVisita abierto={panel === 'visita'} alCerrar={() => setPanel(null)} alGuardar={cliente.recargar} clienteInicial={c} />
      <NuevaCita abierto={panel === 'cita'} alCerrar={() => setPanel(null)} alGuardar={cliente.recargar} clienteInicial={c} />
      <FichaCliente abierto={panel === 'editar'} alCerrar={() => setPanel(null)} alGuardar={cliente.recargar} cliente={c} />
    </>
  );
}
