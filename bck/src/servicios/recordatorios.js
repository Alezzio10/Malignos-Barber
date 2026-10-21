import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { pool } from '../db.js';

const MAX_INTENTOS = 3;
const INTERVALO_MS = 60_000;

// Crea los recordatorios de una cita (ej. 24 h y 2 h antes), omitiendo los que ya pasaron.
export async function programarRecordatorios(db, cita) {
  await db.query(
    `INSERT INTO recordatorios (cita_id, programado_para)
     SELECT $1, $2::timestamptz - make_interval(hours => h)
     FROM unnest($3::int[]) AS h
     WHERE $2::timestamptz - make_interval(hours => h) > now()
     ON CONFLICT (cita_id, programado_para) DO NOTHING`,
    [cita.id, cita.inicio, config.recordatoriosHorasAntes],
  );
}

export async function cancelarRecordatorios(db, citaId) {
  await db.query(
    `UPDATE recordatorios SET estado = 'cancelado' WHERE cita_id = $1 AND estado = 'pendiente'`,
    [citaId],
  );
}

function armarCorreo(r) {
  const cuando = new Intl.DateTimeFormat('es', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: config.zonaHoraria,
  }).format(r.inicio);

  return {
    from: config.smtp.remitente,
    to: r.email,
    subject: 'Recordatorio de tu cita en Malignos Barber',
    text:
      `Hola ${r.nombre},\n\n` +
      `Te recordamos tu cita en Malignos Barber el ${cuando}.\n\n` +
      `Si no puedes asistir, puedes cancelarla aquí: ${config.clienteUrl}/cita/${r.cita_id}\n\n` +
      `¡Te esperamos!`,
  };
}

async function procesarPendientes(transporte) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    // SKIP LOCKED evita que dos procesos envíen el mismo recordatorio.
    const { rows } = await db.query(
      `SELECT r.id, r.intentos, r.cita_id, c.inicio, c.estado AS estado_cita, c.recordatorio_activo,
              cl.nombre, cl.email
       FROM recordatorios r
       JOIN citas c ON c.id = r.cita_id
       JOIN clientes cl ON cl.id = c.cliente_id
       WHERE r.estado = 'pendiente' AND r.programado_para <= now()
       ORDER BY r.programado_para
       LIMIT 20
       FOR UPDATE OF r SKIP LOCKED`,
    );

    for (const r of rows) {
      const vigente =
        ['pendiente', 'confirmada'].includes(r.estado_cita) &&
        r.recordatorio_activo &&
        r.email &&
        r.inicio > new Date();

      if (!vigente) {
        await db.query(`UPDATE recordatorios SET estado = 'cancelado' WHERE id = $1`, [r.id]);
        continue;
      }

      try {
        await transporte.sendMail(armarCorreo(r));
        await db.query(
          `UPDATE recordatorios SET estado = 'enviado', enviado_en = now(), intentos = intentos + 1 WHERE id = $1`,
          [r.id],
        );
      } catch (error) {
        await db.query(
          `UPDATE recordatorios
           SET intentos = intentos + 1, ultimo_error = $2,
               estado = CASE WHEN intentos + 1 >= $3 THEN 'fallido'::estado_recordatorio ELSE 'pendiente' END
           WHERE id = $1`,
          [r.id, String(error.message).slice(0, 500), MAX_INTENTOS],
        );
      }
    }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}

export function iniciarEnvioRecordatorios() {
  if (!config.smtp) {
    console.warn('[recordatorios] SMTP no configurado: los recordatorios quedan pendientes y no se envían.');
    return () => {};
  }

  const transporte = nodemailer.createTransport(config.smtp);
  let enCurso = false;

  const ciclo = async () => {
    if (enCurso) return;
    enCurso = true;
    try {
      await procesarPendientes(transporte);
    } catch (error) {
      console.error('[recordatorios] Error procesando pendientes:', error);
    } finally {
      enCurso = false;
    }
  };

  const temporizador = setInterval(ciclo, INTERVALO_MS);
  ciclo();
  console.log('[recordatorios] Envío de recordatorios activo.');
  return () => clearInterval(temporizador);
}
