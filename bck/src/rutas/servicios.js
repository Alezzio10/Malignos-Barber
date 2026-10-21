import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { ErrorHttp } from '../middleware/errores.js';
import { id, monto, nombre, textoOpcional } from '../esquemas.js';

export const rutasServicios = Router();

const esquemaServicio = z.object({
  nombre,
  descripcion: textoOpcional,
  duracion_min: z.coerce.number().int().min(1).max(480),
  precio: monto,
  activo: z.boolean().default(true),
});

rutasServicios.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM servicios ORDER BY activo DESC, nombre');
  res.json(rows);
});

rutasServicios.post('/', async (req, res) => {
  const s = esquemaServicio.parse(req.body);
  const {
    rows: [creado],
  } = await pool.query(
    `INSERT INTO servicios (nombre, descripcion, duracion_min, precio, activo)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [s.nombre, s.descripcion ?? null, s.duracion_min, s.precio, s.activo],
  );
  res.status(201).json(creado);
});

// Solo se actualizan los campos que vienen en el body (zod aplicaría los valores por defecto).
rutasServicios.patch('/:id', async (req, res) => {
  const cambios = esquemaServicio.partial().parse(req.body);
  const columnas = Object.keys(cambios).filter((k) => k in req.body);
  if (columnas.length === 0) throw new ErrorHttp(400, 'No hay cambios');

  const asignaciones = columnas.map((col, i) => `${col} = $${i + 2}`).join(', ');
  const {
    rows: [actualizado],
  } = await pool.query(`UPDATE servicios SET ${asignaciones} WHERE id = $1 RETURNING *`, [
    id.parse(req.params.id),
    ...columnas.map((col) => cambios[col] ?? null),
  ]);
  if (!actualizado) throw new ErrorHttp(404, 'Servicio no encontrado');
  res.json(actualizado);
});
