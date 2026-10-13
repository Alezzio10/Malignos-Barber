import { Router } from 'express';
import { z } from 'zod';
import { pool, transaccion } from '../db.js';
import { ErrorHttp } from '../middleware/errores.js';
import { fechaHora, id, listaIds, rangoFechas, textoOpcional, uuid } from '../esquemas.js';
import {
  cancelarCita,
  crearCita,
  listarCitas,
  obtenerCita,
  reprogramarCita,
} from '../servicios/agenda.js';
import { cancelarRecordatorios } from '../servicios/recordatorios.js';

// Agenda vista por el dueño.
export const rutasCitas = Router();

const estadoCita = z.enum(['pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio']);

rutasCitas.get('/', async (req, res) => {
  const filtros = rangoFechas
    .and(z.object({ estado: estadoCita.optional(), cliente_id: id.optional() }))
    .parse(req.query);
  res.json(await listarCitas(pool, { ...filtros, clienteId: filtros.cliente_id }));
});

rutasCitas.get('/:id', async (req, res) => {
  const cita = await obtenerCita(pool, uuid.parse(req.params.id));
  if (!cita) throw new ErrorHttp(404, 'Cita no encontrada');
  res.json(cita);
});

// "forzar" permite al dueño agendar fuera del horario de atención (nunca encima de otra cita).
const esquemaCita = z.object({
  cliente_id: id,
  inicio: fechaHora,
  servicios: listaIds,
  recordatorio: z.boolean().default(false),
  notas: textoOpcional,
  forzar: z.boolean().default(false),
});

rutasCitas.post('/', async (req, res) => {
  const d = esquemaCita.parse(req.body);
  const cita = await transaccion((db) =>
    crearCita(db, {
      clienteId: d.cliente_id,
      inicio: d.inicio,
      servicioIds: d.servicios,
      origen: 'presencial',
      recordatorio: d.recordatorio,
      notas: d.notas,
      validarAgenda: !d.forzar,
    }),
  );
  res.status(201).json(cita);
});

rutasCitas.put('/:id/reprogramar', async (req, res) => {
  const d = z.object({ inicio: fechaHora, forzar: z.boolean().default(false) }).parse(req.body);
  const cita = await transaccion((db) => reprogramarCita(db, uuid.parse(req.params.id), d.inicio, !d.forzar));
  res.json(cita);
});

// Cambios de estado manuales. "completada" se asigna al registrar la visita.
const esquemaEstado = z.object({ estado: z.enum(['pendiente', 'confirmada', 'cancelada', 'no_asistio']) });

rutasCitas.patch('/:id/estado', async (req, res) => {
  const citaId = uuid.parse(req.params.id);
  const { estado } = esquemaEstado.parse(req.body);

  const cita = await transaccion(async (db) => {
    const actual = await obtenerCita(db, citaId);
    if (!actual) throw new ErrorHttp(404, 'Cita no encontrada');
    if (['completada', 'cancelada'].includes(actual.estado)) {
      throw new ErrorHttp(409, `La cita está ${actual.estado} y ya no se puede cambiar`);
    }

    if (estado === 'cancelada') return cancelarCita(db, citaId);

    await db.query('UPDATE citas SET estado = $2 WHERE id = $1', [citaId, estado]);
    if (estado === 'no_asistio') await cancelarRecordatorios(db, citaId);
    return obtenerCita(db, citaId);
  });
  res.json(cita);
});
