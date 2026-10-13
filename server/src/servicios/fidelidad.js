import { ErrorHttp } from '../middleware/errores.js';

export async function marcarRecompensasVencidas(db) {
  await db.query(
    `UPDATE recompensas_cliente SET estado = 'vencida'
     WHERE estado = 'disponible' AND vence_en IS NOT NULL AND vence_en < now()`,
  );
}

// Si el cliente completó las visitas de la regla activa, le otorga la recompensa.
// La visita más reciente que cuenta queda como la que generó la recompensa,
// y desde ahí el contador vuelve a cero.
export async function otorgarSiCorresponde(db, clienteId) {
  const {
    rows: [progreso],
  } = await db.query(
    'SELECT visitas_acumuladas, visitas_requeridas FROM v_progreso_fidelidad WHERE cliente_id = $1',
    [clienteId],
  );
  if (!progreso || progreso.visitas_acumuladas < progreso.visitas_requeridas) return null;

  const {
    rows: [recompensa],
  } = await db.query(
    `INSERT INTO recompensas_cliente (cliente_id, regla_id, generada_por_visita_id, vence_en)
     SELECT $1, rf.id, v.id,
            CASE WHEN rf.dias_vigencia IS NULL THEN NULL
                 ELSE now() + make_interval(days => rf.dias_vigencia) END
     FROM reglas_fidelidad rf,
          LATERAL (SELECT id FROM visitas
                   WHERE cliente_id = $1 AND cuenta_para_fidelidad
                   ORDER BY fecha DESC, id DESC LIMIT 1) v
     WHERE rf.activo
     RETURNING *`,
    [clienteId],
  );
  return recompensa ?? null;
}

// Bloquea y valida una recompensa antes de canjearla en una visita.
export async function bloquearRecompensaParaCanje(db, recompensaId, clienteId) {
  await marcarRecompensasVencidas(db);
  const {
    rows: [recompensa],
  } = await db.query('SELECT * FROM recompensas_cliente WHERE id = $1 FOR UPDATE', [recompensaId]);
  if (!recompensa || recompensa.cliente_id !== clienteId) {
    throw new ErrorHttp(404, 'Recompensa no encontrada para este cliente');
  }
  if (recompensa.estado !== 'disponible') {
    throw new ErrorHttp(409, `La recompensa no está disponible (estado: ${recompensa.estado})`);
  }
  return recompensa;
}
