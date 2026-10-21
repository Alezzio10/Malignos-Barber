import { Check, Scissors } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { BotonConfirmar } from '../../../components/BotonConfirmar.jsx';
import { admin, mensajeDeError } from '../../../lib/api.js';
import { ETIQUETA_ESTADO, hora, telefonoLegible } from '../../../lib/formato.js';

const ACTIVAS = ['pendiente', 'confirmada'];

export function ListaCitas({ citas, alAtender, alCambiar }) {
  const reducir = useReducedMotion();

  async function cambiarEstado(cita, estado, mensaje) {
    try {
      await admin(`/citas/${cita.id}/estado`, { metodo: 'PATCH', body: { estado } });
      toast.success(mensaje);
      alCambiar();
    } catch (e) {
      toast.error(mensajeDeError(e));
    }
  }

  return (
    <ul className="citas">
      {citas.map((c, i) => {
        const activa = ACTIVAS.includes(c.estado);
        const pasada = new Date(c.inicio) < new Date();
        return (
          <motion.li
            key={c.id}
            className={`cita ${activa ? '' : 'cita--apagada'}`}
            initial={reducir ? false : { opacity: 0, transform: 'translateY(6px)' }}
            animate={{ opacity: activa ? 1 : 0.55, transform: 'translateY(0px)' }}
            transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="cita__hora">
              {hora(c.inicio)}
              <span className="cita__hasta">a {hora(c.fin)}</span>
            </span>
            <div>
              <Link to={`/admin/clientes/${c.cliente_id}`} className="cita__cliente">
                {c.cliente_nombre}
              </Link>
              <p className="cita__detalle">
                {c.servicios.map((s) => s.nombre).join(' + ')} ·{' '}
                <a href={`tel:${c.cliente_telefono}`} className="num">
                  {telefonoLegible(c.cliente_telefono)}
                </a>
                {c.notas && ` · ${c.notas}`}
              </p>
            </div>
            <div className="cita__acciones">
              <span className={`estado estado--${c.estado}`}>{ETIQUETA_ESTADO[c.estado]}</span>
              {c.estado === 'pendiente' && !pasada && (
                <button type="button" className="btn btn--suave btn--chico" onClick={() => cambiarEstado(c, 'confirmada', 'Cita confirmada')}>
                  <Check /> Confirmar
                </button>
              )}
              {activa && (
                <button type="button" className="btn btn--oro btn--chico" onClick={() => alAtender(c)}>
                  <Scissors /> Atender
                </button>
              )}
              {activa && pasada && (
                <BotonConfirmar chico confirmar="Sí, no vino" alConfirmar={() => cambiarEstado(c, 'no_asistio', 'Marcada como inasistencia')}>
                  No vino
                </BotonConfirmar>
              )}
              {activa && !pasada && (
                <BotonConfirmar chico confirmar="Sí, cancelar" alConfirmar={() => cambiarEstado(c, 'cancelada', 'Cita cancelada')}>
                  Cancelar
                </BotonConfirmar>
              )}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
