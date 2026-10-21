import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { pool, transaccion } from '../db.js';
import { ErrorHttp } from '../middleware/errores.js';
import { emailOpcional, fecha, fechaHora, listaIds, nombre, telefono, textoOpcional, uuid } from '../esquemas.js';
import { cancelarCita, crearCita, horasDisponibles, obtenerCita, obtenerServicios } from '../servicios/agenda.js';

// Rutas sin login: lo que usa el cliente para ver servicios, horas libres y agendar.
export const rutasPublicas = Router();

rutasPublicas.use(
  rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }),
);

const limiteAgendar = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
});

// Fecha local de hoy en la zona de la barbería, en formato AAAA-MM-DD.
function hoyLocal(diasExtra = 0) {
  const fecha = new Date(Date.now() + diasExtra * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: config.zonaHoraria }).format(fecha);
}

// La vista pública de una cita no expone teléfono ni datos internos.
function citaPublica(cita) {
  return {
    id: cita.id,
    nombre: cita.cliente_nombre,
    inicio: cita.inicio,
    fin: cita.fin,
    estado: cita.estado,
    recordatorio_activo: cita.recordatorio_activo,
    servicios: cita.servicios.map(({ nombre, precio, duracion_min }) => ({ nombre, precio, duracion_min })),
  };
}

rutasPublicas.get('/servicios', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, nombre, descripcion, duracion_min, precio FROM servicios WHERE activo ORDER BY nombre',
  );
  res.json(rows);
});

// Horario semanal y la próxima hora libre para el servicio más corto (portada pública).
rutasPublicas.get('/agenda-resumen', async (req, res) => {
  const [{ rows: horarios }, { rows: [corto] }] = await Promise.all([
    pool.query(
      `SELECT dia_semana, to_char(hora_inicio, 'HH24:MI') AS hora_inicio, to_char(hora_fin, 'HH24:MI') AS hora_fin
       FROM horarios ORDER BY dia_semana, hora_inicio`,
    ),
    pool.query('SELECT min(duracion_min) AS duracion FROM servicios WHERE activo'),
  ]);

  let proximaHora = null;
  if (corto?.duracion && horarios.length) {
    for (let dia = 0; dia <= 14 && !proximaHora; dia++) {
      const [primera] = await horasDisponibles(pool, hoyLocal(dia), corto.duracion);
      proximaHora = primera ?? null;
    }
  }
  res.json({ zona_horaria: config.zonaHoraria, horarios, proxima_hora: proximaHora });
});

const esquemaDisponibilidad = z.object({
  fecha,
  servicios: z
    .string()
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(listaIds),
});

rutasPublicas.get('/disponibilidad', async (req, res) => {
  const { fecha, servicios } = esquemaDisponibilidad.parse(req.query);
  if (fecha < hoyLocal() || fecha > hoyLocal(config.diasMaxAgenda)) {
    throw new ErrorHttp(400, `Solo se puede agendar desde hoy hasta ${config.diasMaxAgenda} días adelante`);
  }
  const { duracion } = await obtenerServicios(pool, servicios);
  const horas = await horasDisponibles(pool, fecha, duracion);
  res.json({ fecha, duracion_min: duracion, horas });
});

const esquemaAgendar = z.object({
  nombre,
  telefono,
  email: emailOpcional,
  recordatorio: z.boolean().default(false),
  servicios: listaIds,
  inicio: fechaHora,
  notas: textoOpcional,
});

rutasPublicas.post('/citas', limiteAgendar, async (req, res) => {
  const datos = esquemaAgendar.parse(req.body);
  if (datos.recordatorio && !datos.email) {
    throw new ErrorHttp(400, 'Para recibir el recordatorio necesitamos tu email');
  }
  const limite = new Date(Date.now() + (config.diasMaxAgenda + 1) * 86_400_000);
  if (datos.inicio > limite) {
    throw new ErrorHttp(400, `Solo se puede agendar hasta ${config.diasMaxAgenda} días adelante`);
  }

  const cita = await transaccion(async (db) => {
    // El teléfono identifica al cliente. Si ya existe no se cambia su nombre ni su email
    // (para que nadie pueda modificar datos ajenos conociendo un teléfono); solo se
    // completa el email si no tenía uno.
    const {
      rows: [cliente],
    } = await db.query(
      `INSERT INTO clientes (nombre, telefono, email, acepta_recordatorios)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (telefono) DO UPDATE
         SET email = coalesce(clientes.email, EXCLUDED.email),
             acepta_recordatorios = clientes.acepta_recordatorios
               OR (EXCLUDED.acepta_recordatorios AND coalesce(clientes.email, EXCLUDED.email) IS NOT NULL)
       RETURNING id, activo`,
      [datos.nombre, datos.telefono, datos.email ?? null, datos.recordatorio],
    );
    if (!cliente.activo) throw new ErrorHttp(403, 'No es posible agendar con este teléfono, contacta a la barbería');

    const {
      rows: [{ activas }],
    } = await db.query(
      `SELECT count(*) AS activas FROM citas
       WHERE cliente_id = $1 AND estado IN ('pendiente', 'confirmada') AND inicio > now()`,
      [cliente.id],
    );
    if (activas >= config.maxCitasActivasPorCliente) {
      throw new ErrorHttp(409, 'Ya tienes citas agendadas; cancela una antes de agendar otra');
    }

    return crearCita(db, {
      clienteId: cliente.id,
      inicio: datos.inicio,
      servicioIds: datos.servicios,
      origen: 'web',
      recordatorio: datos.recordatorio,
      notas: datos.notas,
      validarAgenda: true,
    });
  });

  res.status(201).json(citaPublica(cita));
});

rutasPublicas.get('/citas/:id', async (req, res) => {
  const cita = await obtenerCita(pool, uuid.parse(req.params.id));
  if (!cita) throw new ErrorHttp(404, 'Cita no encontrada');
  res.json(citaPublica(cita));
});

rutasPublicas.post('/citas/:id/cancelar', async (req, res) => {
  const id = uuid.parse(req.params.id);
  const cita = await transaccion(async (db) => {
    const actual = await obtenerCita(db, id);
    if (!actual) throw new ErrorHttp(404, 'Cita no encontrada');
    if (new Date(actual.inicio) <= new Date()) throw new ErrorHttp(409, 'La cita ya pasó');
    const cancelada = await cancelarCita(db, id);
    if (!cancelada) throw new ErrorHttp(409, 'La cita ya no se puede cancelar');
    return cancelada;
  });
  res.json(citaPublica(cita));
});
