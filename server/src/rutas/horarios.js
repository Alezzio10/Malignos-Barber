import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { ErrorHttp } from '../middleware/errores.js';
import { fechaHora, id, rangoFechas, textoOpcional } from '../esquemas.js';
import { config } from '../config.js';

// Horario semanal de atención y bloqueos puntuales (vacaciones, feriados...).
export const rutasHorarios = Router();

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (formato HH:MM)');

const esquemaHorario = z
  .object({
    dia_semana: z.coerce.number().int().min(0).max(6),
    hora_inicio: hora,
    hora_fin: hora,
  })
  .refine((h) => h.hora_fin > h.hora_inicio, { message: 'La hora de fin debe ser posterior al inicio', path: ['hora_fin'] });

rutasHorarios.get('/horarios', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, dia_semana, to_char(hora_inicio, 'HH24:MI') AS hora_inicio, to_char(hora_fin, 'HH24:MI') AS hora_fin
     FROM horarios ORDER BY dia_semana, hora_inicio`,
  );
  res.json(rows);
});

rutasHorarios.post('/horarios', async (req, res) => {
  const h = esquemaHorario.parse(req.body);
  const {
    rows: [creado],
  } = await pool.query(
    `INSERT INTO horarios (dia_semana, hora_inicio, hora_fin) VALUES ($1, $2, $3)
     RETURNING id, dia_semana, to_char(hora_inicio, 'HH24:MI') AS hora_inicio, to_char(hora_fin, 'HH24:MI') AS hora_fin`,
    [h.dia_semana, h.hora_inicio, h.hora_fin],
  );
  res.status(201).json(creado);
});

rutasHorarios.delete('/horarios/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM horarios WHERE id = $1', [id.parse(req.params.id)]);
  if (!rowCount) throw new ErrorHttp(404, 'Tramo no encontrado');
  res.status(204).end();
});

const esquemaBloqueo = z
  .object({ inicio: fechaHora, fin: fechaHora, motivo: textoOpcional })
  .refine((b) => b.fin > b.inicio, { message: 'El fin debe ser posterior al inicio', path: ['fin'] });

rutasHorarios.get('/bloqueos', async (req, res) => {
  const { desde, hasta } = rangoFechas.parse(req.query);
  const { rows } = await pool.query(
    `SELECT * FROM bloqueos_horario
     WHERE tstzrange(inicio, fin) && tstzrange(($1::date)::timestamp AT TIME ZONE $3::text,
                                               ($2::date + 1)::timestamp AT TIME ZONE $3::text)
     ORDER BY inicio`,
    [desde, hasta, config.zonaHoraria],
  );
  res.json(rows);
});

rutasHorarios.post('/bloqueos', async (req, res) => {
  const b = esquemaBloqueo.parse(req.body);
  const {
    rows: [creado],
  } = await pool.query('INSERT INTO bloqueos_horario (inicio, fin, motivo) VALUES ($1, $2, $3) RETURNING *', [
    b.inicio,
    b.fin,
    b.motivo ?? null,
  ]);
  res.status(201).json(creado);
});

rutasHorarios.delete('/bloqueos/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM bloqueos_horario WHERE id = $1', [id.parse(req.params.id)]);
  if (!rowCount) throw new ErrorHttp(404, 'Bloqueo no encontrado');
  res.status(204).end();
});
