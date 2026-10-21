import { CalendarPlus, Link2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { BotonConfirmar } from '../../components/BotonConfirmar.jsx';
import { AvisoError } from '../../components/Formulario.jsx';
import { mensajeDeError, publico } from '../../lib/api.js';
import { ETIQUETA_ESTADO, dinero, fechaLarga, hora } from '../../lib/formato.js';
import { useCarga } from '../../lib/useCarga.js';
import { BarraSitio } from './BarraSitio.jsx';
import './publico.css';

const fechaIcs = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

function descargarCalendario(cita) {
  const servicios = cita.servicios.map((s) => s.nombre).join(', ');
  const contenido = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Malignos Barber//Agenda//ES',
    'BEGIN:VEVENT',
    `UID:${cita.id}@malignos-barber`,
    `DTSTAMP:${fechaIcs(new Date().toISOString())}`,
    `DTSTART:${fechaIcs(cita.inicio)}`,
    `DTEND:${fechaIcs(cita.fin)}`,
    "SUMMARY:Cita en Maligno's Barber",
    `DESCRIPTION:${servicios}`,
    `URL:${window.location.href}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'cita-malignos-barber.ics' });
  a.click();
  URL.revokeObjectURL(url);
}

export default function MiCita() {
  const { id } = useParams();
  const { state } = useLocation();
  const reducir = useReducedMotion();
  const cita = useCarga(() => publico(`/citas/${id}`), [id]);
  const c = cita.datos;

  async function cancelar() {
    try {
      await publico(`/citas/${id}/cancelar`, { metodo: 'POST' });
      toast.success('Tu cita quedó cancelada.');
      cita.recargar();
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
  }

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Enlace copiado.');
    } catch {
      toast.error('No se pudo copiar. Copia la dirección desde la barra del navegador.');
    }
  }

  const activa = c && ['pendiente', 'confirmada'].includes(c.estado) && new Date(c.inicio) > new Date();
  const total = c?.servicios.reduce((t, s) => t + s.precio, 0) ?? 0;

  return (
    <div className="sitio">
      <BarraSitio conNavegacion={false} />
      <main className="mi-cita">
        {cita.error ? (
          <div className="mi-cita__error">
            <h1 className="titulo-pagina">No encontramos esa cita</h1>
            <AvisoError>{cita.error.status === 404 ? 'Revisa que el enlace esté completo.' : mensajeDeError(cita.error)}</AvisoError>
            <Link to="/agendar" className="btn btn--oro">
              Agendar una cita
            </Link>
          </div>
        ) : !c ? (
          <div className="esqueleto" style={{ height: 320, maxWidth: 760, margin: '0 auto' }} />
        ) : (
          <>
            <motion.h1
              className="titulo-pagina mi-cita__titulo"
              initial={reducir ? { opacity: 0 } : { opacity: 0, transform: 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {c.estado === 'cancelada'
                ? 'Cita cancelada'
                : state?.nueva
                  ? `¡Listo, ${c.nombre.split(' ')[0]}!`
                  : `Tu cita, ${c.nombre.split(' ')[0]}`}
            </motion.h1>
            {state?.nueva && (
              <p className="texto-seccion mi-cita__nota">
                Guarda este enlace: con él puedes revisar o cancelar tu cita cuando quieras.
              </p>
            )}

            <motion.article
              className={`ticket ${c.estado === 'cancelada' ? 'ticket--anulado' : ''}`}
              initial={reducir ? { opacity: 0 } : { opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
              animate={{ opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.76, 0, 0.24, 1] }}
            >
              <div className="ticket__cuerpo">
                <img src="/logo.png" alt="" width="96" height="96" className="ticket__logo logo-luz" />
                <p className="ticket__fecha">{fechaLarga(c.inicio)}</p>
                <ul className="ticket__servicios">
                  {c.servicios.map((s) => (
                    <li key={s.nombre}>
                      <span>{s.nombre}</span>
                      <span className="num">{dinero(s.precio)}</span>
                    </li>
                  ))}
                  <li className="ticket__total">
                    <span>Total</span>
                    <span className="num">{dinero(total)}</span>
                  </li>
                </ul>
                <p className="ticket__aviso">
                  {c.recordatorio_activo && activa
                    ? 'Te enviaremos un recordatorio por email antes de tu cita.'
                    : 'Pagas en la barbería al terminar.'}
                </p>
              </div>
              <div className="ticket__talon">
                <span className={`estado estado--${c.estado}`}>{ETIQUETA_ESTADO[c.estado]}</span>
                <p className="ticket__hora num">
                  {hora(c.inicio).split(' ')[0]}
                  <span className="ticket__periodo">{hora(c.inicio).split(' ').slice(1).join(' ')}</span>
                </p>
                <p className="ticket__hasta num">hasta las {hora(c.fin)}</p>
              </div>
            </motion.article>

            <div className="mi-cita__acciones">
              {activa && (
                <button type="button" className="btn btn--borde" onClick={() => descargarCalendario(c)}>
                  <CalendarPlus /> Guardar en mi calendario
                </button>
              )}
              <button type="button" className="btn btn--suave" onClick={copiarEnlace}>
                <Link2 /> Copiar enlace
              </button>
              {activa && (
                <BotonConfirmar confirmar="Sí, cancelar mi cita" alConfirmar={cancelar}>
                  Cancelar cita
                </BotonConfirmar>
              )}
              {!activa && (
                <Link to="/agendar" className="btn btn--oro">
                  Agendar otra cita
                </Link>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
