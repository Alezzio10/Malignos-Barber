import { Router } from 'express';
import { z } from 'zod';
import { pool, transaccion } from '../db.js';
import { ErrorHttp } from '../middleware/errores.js';
import { id, nombre } from '../esquemas.js';
import { marcarRecompensasVencidas } from '../servicios/fidelidad.js';

export const rutasFidelidad = Router();

rutasFidelidad.get('/regla', async (req, res) => {
  const {
    rows: [regla],
  } = await pool.query('SELECT * FROM reglas_fidelidad WHERE activo');
  res.json(regla ?? null);
});

const esquemaRegla = z.object({
  nombre,
  visitas_requeridas: z.coerce.number().int().min(1).max(100),
  tipo_recompensa: z.enum(['corte_gratis', 'descuento_porcentaje', 'descuento_monto', 'producto']),
  valor: z.coerce.number().positive().nullish(),
  dias_vigencia: z.coerce.number().int().positive().nullish(),
});

// Cambiar la regla desactiva la actual y crea una nueva, para no alterar el historial
// de recompensas ya entregadas con la regla anterior.
rutasFidelidad.put('/regla', async (req, res) => {
  const r = esquemaRegla.parse(req.body);
  const regla = await transaccion(async (db) => {
    await db.query('UPDATE reglas_fidelidad SET activo = false WHERE activo');
    const {
      rows: [nueva],
    } = await db.query(
      `INSERT INTO reglas_fidelidad (nombre, visitas_requeridas, tipo_recompensa, valor, dias_vigencia)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [r.nombre, r.visitas_requeridas, r.tipo_recompensa, r.valor ?? null, r.dias_vigencia ?? null],
    );
    return nueva;
  });
  res.json(regla);
});

rutasFidelidad.get('/recompensas', async (req, res) => {
  const { estado } = z
    .object({ estado: z.enum(['disponible', 'canjeada', 'vencida', 'anulada']).optional() })
    .parse(req.query);
  await marcarRecompensasVencidas(pool);
  const { rows } = await pool.query(
    `SELECT r.*, c.nombre AS cliente_nombre, c.telefono AS cliente_telefono,
            rf.nombre AS regla_nombre, rf.tipo_recompensa, rf.valor
     FROM recompensas_cliente r
     JOIN clientes c ON c.id = r.cliente_id
     JOIN reglas_fidelidad rf ON rf.id = r.regla_id
     WHERE ($1::estado_recompensa IS NULL OR r.estado = $1)
     ORDER BY r.otorgada_en DESC`,
    [estado ?? null],
  );
  res.json(rows);
});

rutasFidelidad.patch('/recompensas/:id/anular', async (req, res) => {
  const {
    rows: [recompensa],
  } = await pool.query(
    `UPDATE recompensas_cliente SET estado = 'anulada' WHERE id = $1 AND estado = 'disponible' RETURNING *`,
    [id.parse(req.params.id)],
  );
  if (!recompensa) throw new ErrorHttp(409, 'La recompensa no existe o ya no está disponible');
  res.json(recompensa);
});
