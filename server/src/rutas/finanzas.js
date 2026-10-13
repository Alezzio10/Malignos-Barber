import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db.js';
import { ErrorHttp } from '../middleware/errores.js';
import { fecha, id, metodoPago, monto, nombre, rangoFechas } from '../esquemas.js';

// Gastos (salidas de dinero) y reportes de ingresos vs. gastos.
export const rutasFinanzas = Router();

rutasFinanzas.get('/categorias-gasto', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categorias_gasto ORDER BY activo DESC, nombre');
  res.json(rows);
});

rutasFinanzas.post('/categorias-gasto', async (req, res) => {
  const c = z.object({ nombre }).parse(req.body);
  const {
    rows: [creada],
  } = await pool.query('INSERT INTO categorias_gasto (nombre) VALUES ($1) RETURNING *', [c.nombre]);
  res.status(201).json(creada);
});

rutasFinanzas.patch('/categorias-gasto/:id', async (req, res) => {
  const c = z.object({ nombre: nombre.optional(), activo: z.boolean().optional() }).parse(req.body);
  const {
    rows: [actualizada],
  } = await pool.query(
    'UPDATE categorias_gasto SET nombre = coalesce($2, nombre), activo = coalesce($3, activo) WHERE id = $1 RETURNING *',
    [id.parse(req.params.id), c.nombre, c.activo],
  );
  if (!actualizada) throw new ErrorHttp(404, 'Categoría no encontrada');
  res.json(actualizada);
});

const esquemaGasto = z.object({
  categoria_id: id,
  descripcion: z.string().trim().min(1).max(500),
  monto: monto.positive(),
  metodo: metodoPago,
  fecha: fecha.optional(),
});

rutasFinanzas.get('/gastos', async (req, res) => {
  const q = rangoFechas.and(z.object({ categoria_id: id.optional() })).parse(req.query);
  const { rows } = await pool.query(
    `SELECT g.*, c.nombre AS categoria
     FROM gastos g JOIN categorias_gasto c ON c.id = g.categoria_id
     WHERE g.fecha BETWEEN $1 AND $2 AND ($3::bigint IS NULL OR g.categoria_id = $3)
     ORDER BY g.fecha DESC, g.id DESC`,
    [q.desde, q.hasta, q.categoria_id ?? null],
  );
  res.json(rows);
});

rutasFinanzas.post('/gastos', async (req, res) => {
  const g = esquemaGasto.parse(req.body);
  const {
    rows: [creado],
  } = await pool.query(
    `INSERT INTO gastos (categoria_id, descripcion, monto, metodo, fecha)
     VALUES ($1, $2, $3, $4, coalesce($5::date, (now() AT TIME ZONE $6::text)::date)) RETURNING *`,
    [g.categoria_id, g.descripcion, g.monto, g.metodo, g.fecha ?? null, config.zonaHoraria],
  );
  res.status(201).json(creado);
});

rutasFinanzas.patch('/gastos/:id', async (req, res) => {
  const g = esquemaGasto.partial().parse(req.body);
  const {
    rows: [actualizado],
  } = await pool.query(
    `UPDATE gastos SET
       categoria_id = coalesce($2, categoria_id),
       descripcion  = coalesce($3, descripcion),
       monto        = coalesce($4, monto),
       metodo       = coalesce($5, metodo),
       fecha        = coalesce($6, fecha)
     WHERE id = $1 RETURNING *`,
    [id.parse(req.params.id), g.categoria_id, g.descripcion, g.monto, g.metodo, g.fecha],
  );
  if (!actualizado) throw new ErrorHttp(404, 'Gasto no encontrado');
  res.json(actualizado);
});

rutasFinanzas.delete('/gastos/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM gastos WHERE id = $1', [id.parse(req.params.id)]);
  if (!rowCount) throw new ErrorHttp(404, 'Gasto no encontrado');
  res.status(204).end();
});

// Resumen de un período: ingresos (pagos) vs. gastos, visitas y citas.
rutasFinanzas.get('/reportes/resumen', async (req, res) => {
  const { desde, hasta } = rangoFechas.parse(req.query);
  const p = [desde, hasta, config.zonaHoraria];
  const enRango = (col) =>
    `${col} >= ($1::date)::timestamp AT TIME ZONE $3::text AND ${col} < ($2::date + 1)::timestamp AT TIME ZONE $3::text`;

  const [ingresos, gastos, visitas, clientesNuevos, citas] = await Promise.all([
    pool.query(`SELECT metodo, sum(monto) AS total FROM pagos WHERE ${enRango('pagado_en')} GROUP BY metodo`, p),
    pool.query(
      `SELECT c.nombre AS categoria, sum(g.monto) AS total
       FROM gastos g JOIN categorias_gasto c ON c.id = g.categoria_id
       WHERE g.fecha BETWEEN $1 AND $2
       GROUP BY c.nombre ORDER BY total DESC`,
      [desde, hasta],
    ),
    pool.query(
      `SELECT count(*) AS total, count(DISTINCT cliente_id) AS clientes_unicos FROM visitas WHERE ${enRango('fecha')}`,
      p,
    ),
    pool.query(`SELECT count(*) AS total FROM clientes WHERE ${enRango('creado_en')}`, p),
    pool.query(`SELECT estado, count(*) AS total FROM citas WHERE ${enRango('inicio')} GROUP BY estado`, p),
  ]);

  const suma = (filas) => Math.round(filas.reduce((t, f) => t + f.total, 0) * 100) / 100;
  const totalIngresos = suma(ingresos.rows);
  const totalGastos = suma(gastos.rows);

  res.json({
    desde,
    hasta,
    ingresos: { total: totalIngresos, por_metodo: ingresos.rows },
    gastos: { total: totalGastos, por_categoria: gastos.rows },
    utilidad: Math.round((totalIngresos - totalGastos) * 100) / 100,
    visitas: visitas.rows[0],
    clientes_nuevos: clientesNuevos.rows[0].total,
    citas_por_estado: Object.fromEntries(citas.rows.map((c) => [c.estado, c.total])),
  });
});

// Ingresos y gastos día por día, para gráficos.
rutasFinanzas.get('/reportes/diario', async (req, res) => {
  const { desde, hasta } = rangoFechas.parse(req.query);
  const { rows } = await pool.query(
    `SELECT to_char(d, 'YYYY-MM-DD') AS fecha,
            coalesce((SELECT sum(monto) FROM pagos
                      WHERE (pagado_en AT TIME ZONE $3::text)::date = d::date), 0) AS ingresos,
            coalesce((SELECT sum(monto) FROM gastos WHERE fecha = d::date), 0) AS gastos
     FROM generate_series($1::date, $2::date, interval '1 day') AS d
     ORDER BY d`,
    [desde, hasta, config.zonaHoraria],
  );
  res.json(rows);
});
