import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { ErrorHttp } from '../middleware/errores.js';
import { emailOpcional, fecha, id, nombre, telefono, textoOpcional } from '../esquemas.js';
import { marcarRecompensasVencidas } from '../servicios/fidelidad.js';

export const rutasClientes = Router();

const esquemaCliente = z.object({
  nombre,
  telefono,
  email: emailOpcional,
  fecha_nacimiento: fecha.nullish(),
  acepta_recordatorios: z.boolean().default(false),
  notas: textoOpcional,
  activo: z.boolean().default(true),
});

const esquemaListado = z.object({
  buscar: z.string().trim().optional(),
  activo: z.enum(['true', 'false']).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).max(100).default(30),
});

rutasClientes.get('/', async (req, res) => {
  const q = esquemaListado.parse(req.query);
  const buscar = q.buscar ? q.buscar.replace(/[\\%_]/g, '\\$&') : null;
  const { rows } = await pool.query(
    `SELECT c.id, c.nombre, c.telefono, c.email, c.acepta_recordatorios, c.activo,
            p.visitas_acumuladas, p.visitas_faltantes, p.recompensas_disponibles,
            (SELECT max(fecha) FROM visitas v WHERE v.cliente_id = c.id) AS ultima_visita,
            count(*) OVER () AS total
     FROM clientes c
     LEFT JOIN v_progreso_fidelidad p ON p.cliente_id = c.id
     WHERE ($1::text IS NULL OR c.nombre ILIKE '%' || $1 || '%' OR c.telefono LIKE '%' || $1 || '%')
       AND ($2::boolean IS NULL OR c.activo = $2)
     ORDER BY c.nombre
     LIMIT $3 OFFSET $4`,
    [buscar, q.activo ?? null, q.por_pagina, (q.pagina - 1) * q.por_pagina],
  );
  res.json({
    total: rows[0]?.total ?? 0,
    pagina: q.pagina,
    clientes: rows.map(({ total, ...c }) => c),
  });
});

rutasClientes.get('/:id', async (req, res) => {
  const clienteId = id.parse(req.params.id);
  await marcarRecompensasVencidas(pool);

  const {
    rows: [cliente],
  } = await pool.query('SELECT * FROM clientes WHERE id = $1', [clienteId]);
  if (!cliente) throw new ErrorHttp(404, 'Cliente no encontrado');

  const [progreso, recompensas, visitas, citas] = await Promise.all([
    pool.query(
      'SELECT visitas_requeridas, visitas_acumuladas, visitas_faltantes FROM v_progreso_fidelidad WHERE cliente_id = $1',
      [clienteId],
    ),
    pool.query(
      `SELECT r.*, rf.nombre AS regla_nombre, rf.tipo_recompensa, rf.valor
       FROM recompensas_cliente r JOIN reglas_fidelidad rf ON rf.id = r.regla_id
       WHERE r.cliente_id = $1 ORDER BY r.otorgada_en DESC`,
      [clienteId],
    ),
    pool.query(
      `SELECT v.id, v.fecha, v.cuenta_para_fidelidad, v.cita_id,
              coalesce((SELECT sum(precio_cobrado) FROM visita_servicios WHERE visita_id = v.id), 0) AS total
       FROM visitas v WHERE v.cliente_id = $1 ORDER BY v.fecha DESC LIMIT 20`,
      [clienteId],
    ),
    pool.query(
      `SELECT id, inicio, fin, estado FROM citas
       WHERE cliente_id = $1 AND inicio > now() AND estado IN ('pendiente', 'confirmada')
       ORDER BY inicio`,
      [clienteId],
    ),
  ]);

  res.json({
    ...cliente,
    fidelidad: progreso.rows[0] ?? null,
    recompensas: recompensas.rows,
    ultimas_visitas: visitas.rows,
    proximas_citas: citas.rows,
  });
});

rutasClientes.post('/', async (req, res) => {
  const c = esquemaCliente.parse(req.body);
  const {
    rows: [creado],
  } = await pool.query(
    `INSERT INTO clientes (nombre, telefono, email, fecha_nacimiento, acepta_recordatorios, notas, activo)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [c.nombre, c.telefono, c.email ?? null, c.fecha_nacimiento ?? null, c.acepta_recordatorios, c.notas ?? null, c.activo],
  );
  res.status(201).json(creado);
});

// Los campos opcionales que vienen en el body (aunque sea con null) se actualizan;
// los que no vienen se dejan como están.
rutasClientes.patch('/:id', async (req, res) => {
  const cambios = esquemaCliente.partial().parse(req.body);
  const columnas = Object.keys(cambios).filter((k) => k in req.body);
  if (columnas.length === 0) throw new ErrorHttp(400, 'No hay cambios');

  const asignaciones = columnas.map((col, i) => `${col} = $${i + 2}`).join(', ');
  const {
    rows: [actualizado],
  } = await pool.query(`UPDATE clientes SET ${asignaciones} WHERE id = $1 RETURNING *`, [
    id.parse(req.params.id),
    ...columnas.map((col) => cambios[col] ?? null),
  ]);
  if (!actualizado) throw new ErrorHttp(404, 'Cliente no encontrado');
  res.json(actualizado);
});
