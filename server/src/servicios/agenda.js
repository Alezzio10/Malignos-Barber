import { config } from '../config.js';
import { ErrorHttp } from '../middleware/errores.js';
import { cancelarRecordatorios, programarRecordatorios } from './recordatorios.js';

export const ESTADOS_ACTIVOS = ['pendiente', 'confirmada'];

export async function obtenerServicios(db, servicioIds) {
  const { rows } = await db.query(
    'SELECT id, nombre, duracion_min, precio FROM servicios WHERE id = ANY($1::bigint[]) AND activo ORDER BY id',
    [servicioIds],
  );
  if (rows.length !== servicioIds.length) {
    throw new ErrorHttp(400, 'Uno o más servicios no existen o no están disponibles');
  }
  const duracion = rows.reduce((total, s) => total + s.duracion_min, 0);
  return { servicios: rows, duracion };
}

// Horas de inicio libres para un día y una duración, según horarios, bloqueos y citas activas.
export async function horasDisponibles(db, fecha, duracionMin) {
  const { rows } = await db.query(
    `WITH tramos AS (
       SELECT ($1::date + h.hora_inicio) AT TIME ZONE $3::text AS ini,
              ($1::date + h.hora_fin)    AT TIME ZONE $3::text AS fin
       FROM horarios h
       WHERE h.dia_semana = extract(dow FROM $1::date)
     ),
     candidatos AS (
       SELECT gs AS inicio, gs + make_interval(mins => $2::int) AS fin
       FROM tramos,
            generate_series(tramos.ini, tramos.fin - make_interval(mins => $2::int),
                            make_interval(mins => $4::int)) AS gs
     )
     SELECT c.inicio
     FROM candidatos c
     WHERE c.inicio > now()
       AND NOT EXISTS (
         SELECT 1 FROM citas ci
         WHERE ci.estado IN ('pendiente', 'confirmada')
           AND tstzrange(ci.inicio, ci.fin) && tstzrange(c.inicio, c.fin))
       AND NOT EXISTS (
         SELECT 1 FROM bloqueos_horario b
         WHERE tstzrange(b.inicio, b.fin) && tstzrange(c.inicio, c.fin))
     ORDER BY c.inicio`,
    [fecha, duracionMin, config.zonaHoraria, config.intervaloAgendaMin],
  );
  return rows.map((r) => r.inicio);
}

// Verifica que [inicio, fin) sea futuro, caiga dentro de un tramo de atención y no esté bloqueado.
// Los choques con otras citas los rechaza la restricción citas_sin_traslape de la base de datos.
export async function validarHorario(db, inicio, fin) {
  const {
    rows: [r],
  } = await db.query(
    `SELECT
       $1::timestamptz > now() AS futuro,
       EXISTS (
         SELECT 1 FROM horarios h
         WHERE h.dia_semana = extract(dow FROM $1::timestamptz AT TIME ZONE $3::text)
           AND ($1::timestamptz AT TIME ZONE $3::text)::date = ($2::timestamptz AT TIME ZONE $3::text)::date
           AND ($1::timestamptz AT TIME ZONE $3::text)::time >= h.hora_inicio
           AND ($2::timestamptz AT TIME ZONE $3::text)::time <= h.hora_fin
       ) AS en_horario,
       EXISTS (
         SELECT 1 FROM bloqueos_horario b
         WHERE tstzrange(b.inicio, b.fin) && tstzrange($1::timestamptz, $2::timestamptz)
       ) AS bloqueado`,
    [inicio, fin, config.zonaHoraria],
  );
  if (!r.futuro) throw new ErrorHttp(400, 'La cita debe ser en el futuro');
  if (!r.en_horario) throw new ErrorHttp(400, 'La hora elegida está fuera del horario de atención');
  if (r.bloqueado) throw new ErrorHttp(409, 'La barbería no atiende en ese horario');
}

export async function crearCita(db, { clienteId, inicio, servicioIds, origen, recordatorio, notas, validarAgenda }) {
  const {
    rows: [cliente],
  } = await db.query('SELECT email, activo FROM clientes WHERE id = $1', [clienteId]);
  if (!cliente) throw new ErrorHttp(404, 'Cliente no encontrado');
  if (recordatorio && !cliente.email) {
    throw new ErrorHttp(400, 'Para recibir recordatorios el cliente necesita un email');
  }

  const { duracion } = await obtenerServicios(db, servicioIds);
  const fin = new Date(inicio.getTime() + duracion * 60_000);
  if (validarAgenda) await validarHorario(db, inicio, fin);

  const {
    rows: [cita],
  } = await db.query(
    `INSERT INTO citas (cliente_id, inicio, fin, origen, recordatorio_activo, notas)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [clienteId, inicio, fin, origen, recordatorio, notas ?? null],
  );
  await db.query(
    `INSERT INTO cita_servicios (cita_id, servicio_id, precio_aplicado, duracion_min)
     SELECT $1, s.id, s.precio, s.duracion_min FROM servicios s WHERE s.id = ANY($2::bigint[])`,
    [cita.id, servicioIds],
  );
  if (cita.recordatorio_activo) await programarRecordatorios(db, cita);

  return obtenerCita(db, cita.id);
}

export async function reprogramarCita(db, citaId, inicio, validarAgenda) {
  const {
    rows: [cita],
  } = await db.query(
    `SELECT c.*, (SELECT sum(duracion_min) FROM cita_servicios WHERE cita_id = c.id) AS duracion
     FROM citas c WHERE c.id = $1 FOR UPDATE`,
    [citaId],
  );
  if (!cita) throw new ErrorHttp(404, 'Cita no encontrada');
  if (!ESTADOS_ACTIVOS.includes(cita.estado)) throw new ErrorHttp(409, 'Solo se pueden reprogramar citas activas');

  const fin = new Date(inicio.getTime() + cita.duracion * 60_000);
  if (validarAgenda) await validarHorario(db, inicio, fin);

  const {
    rows: [actualizada],
  } = await db.query('UPDATE citas SET inicio = $2, fin = $3 WHERE id = $1 RETURNING *', [citaId, inicio, fin]);
  await cancelarRecordatorios(db, citaId);
  if (actualizada.recordatorio_activo) await programarRecordatorios(db, actualizada);

  return obtenerCita(db, citaId);
}

export async function cancelarCita(db, citaId) {
  const {
    rows: [cita],
  } = await db.query(
    `UPDATE citas SET estado = 'cancelada', cancelada_en = now()
     WHERE id = $1 AND estado IN ('pendiente', 'confirmada')
     RETURNING id`,
    [citaId],
  );
  if (!cita) return null;
  await cancelarRecordatorios(db, citaId);
  return obtenerCita(db, citaId);
}

const SELECT_CITAS = `
  SELECT c.*, cl.nombre AS cliente_nombre, cl.telefono AS cliente_telefono,
         coalesce(json_agg(json_build_object(
           'id', s.id, 'nombre', s.nombre, 'precio', cs.precio_aplicado, 'duracion_min', cs.duracion_min
         ) ORDER BY s.id) FILTER (WHERE s.id IS NOT NULL), '[]') AS servicios
  FROM citas c
  JOIN clientes cl ON cl.id = c.cliente_id
  LEFT JOIN cita_servicios cs ON cs.cita_id = c.id
  LEFT JOIN servicios s ON s.id = cs.servicio_id`;

export async function obtenerCita(db, citaId) {
  const { rows } = await db.query(`${SELECT_CITAS} WHERE c.id = $1 GROUP BY c.id, cl.id`, [citaId]);
  return rows[0] ?? null;
}

export async function listarCitas(db, { desde, hasta, estado, clienteId }) {
  const { rows } = await db.query(
    `${SELECT_CITAS}
     WHERE c.inicio >= ($1::date)::timestamp AT TIME ZONE $3::text
       AND c.inicio <  ($2::date + 1)::timestamp AT TIME ZONE $3::text
       AND ($4::estado_cita IS NULL OR c.estado = $4)
       AND ($5::bigint IS NULL OR c.cliente_id = $5)
     GROUP BY c.id, cl.id
     ORDER BY c.inicio`,
    [desde, hasta, config.zonaHoraria, estado ?? null, clienteId ?? null],
  );
  return rows;
}
