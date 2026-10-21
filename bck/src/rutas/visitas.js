import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { pool, transaccion } from '../db.js';
import { ErrorHttp } from '../middleware/errores.js';
import { fecha, fechaHora, id, metodoPago, monto, textoOpcional, uuid } from '../esquemas.js';
import { bloquearRecompensaParaCanje, otorgarSiCorresponde } from '../servicios/fidelidad.js';
import { cancelarRecordatorios } from '../servicios/recordatorios.js';

// Registro de atenciones: servicios realizados, pagos y fidelidad.
export const rutasVisitas = Router();

const esquemaPago = z.object({ monto: monto.positive(), metodo: metodoPago, notas: textoOpcional });

const esquemaVisita = z.object({
  cliente_id: id,
  cita_id: uuid.nullish(),
  fecha: fechaHora.optional(),
  // precio_cobrado es opcional: si no viene se usa el precio actual del servicio.
  servicios: z
    .array(z.object({ servicio_id: id, precio_cobrado: monto.optional() }))
    .min(1)
    .refine((s) => new Set(s.map((x) => x.servicio_id)).size === s.length, 'Hay servicios repetidos'),
  pagos: z.array(esquemaPago).default([]),
  canjear_recompensa_id: id.nullish(),
  notas: textoOpcional,
});

async function detalleVisita(db, visitaId) {
  const {
    rows: [visita],
  } = await db.query(
    `SELECT v.*, cl.nombre AS cliente_nombre,
            coalesce((SELECT json_agg(json_build_object('servicio_id', s.id, 'nombre', s.nombre,
                                                        'precio_cobrado', vs.precio_cobrado) ORDER BY s.id)
                      FROM visita_servicios vs JOIN servicios s ON s.id = vs.servicio_id
                      WHERE vs.visita_id = v.id), '[]') AS servicios,
            coalesce((SELECT json_agg(p ORDER BY p.pagado_en) FROM pagos p WHERE p.visita_id = v.id), '[]') AS pagos,
            coalesce((SELECT sum(precio_cobrado) FROM visita_servicios WHERE visita_id = v.id), 0) AS total,
            coalesce((SELECT sum(monto) FROM pagos WHERE visita_id = v.id), 0) AS pagado,
            (SELECT id FROM recompensas_cliente WHERE canjeada_en_visita_id = v.id) AS recompensa_canjeada_id
     FROM visitas v JOIN clientes cl ON cl.id = v.cliente_id
     WHERE v.id = $1`,
    [visitaId],
  );
  return visita ?? null;
}

const esquemaListado = z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  cliente_id: id.optional(),
});

rutasVisitas.get('/', async (req, res) => {
  const q = esquemaListado.parse(req.query);
  if (!q.cliente_id && !(q.desde && q.hasta)) {
    throw new ErrorHttp(400, 'Indica "desde" y "hasta", o un "cliente_id"');
  }
  const { rows } = await pool.query(
    `SELECT v.id, v.cliente_id, cl.nombre AS cliente_nombre, v.cita_id, v.fecha, v.cuenta_para_fidelidad,
            coalesce((SELECT sum(precio_cobrado) FROM visita_servicios WHERE visita_id = v.id), 0) AS total,
            coalesce((SELECT sum(monto) FROM pagos WHERE visita_id = v.id), 0) AS pagado
     FROM visitas v JOIN clientes cl ON cl.id = v.cliente_id
     WHERE ($1::date IS NULL OR v.fecha >= ($1::date)::timestamp AT TIME ZONE $3::text)
       AND ($2::date IS NULL OR v.fecha <  ($2::date + 1)::timestamp AT TIME ZONE $3::text)
       AND ($4::bigint IS NULL OR v.cliente_id = $4)
     ORDER BY v.fecha DESC`,
    [q.desde ?? null, q.hasta ?? null, config.zonaHoraria, q.cliente_id ?? null],
  );
  res.json(rows);
});

rutasVisitas.get('/:id', async (req, res) => {
  const visita = await detalleVisita(pool, id.parse(req.params.id));
  if (!visita) throw new ErrorHttp(404, 'Visita no encontrada');
  res.json(visita);
});

rutasVisitas.post('/', async (req, res) => {
  const d = esquemaVisita.parse(req.body);
  if (d.fecha && d.fecha > new Date()) throw new ErrorHttp(400, 'La visita no puede tener fecha futura');

  const resultado = await transaccion(async (db) => {
    // Bloquear al cliente serializa las visitas simultáneas y evita dar dos veces la misma recompensa.
    const {
      rows: [cliente],
    } = await db.query('SELECT id FROM clientes WHERE id = $1 FOR UPDATE', [d.cliente_id]);
    if (!cliente) throw new ErrorHttp(404, 'Cliente no encontrado');

    if (d.cita_id) {
      const {
        rows: [cita],
      } = await db.query('SELECT cliente_id, estado FROM citas WHERE id = $1 FOR UPDATE', [d.cita_id]);
      if (!cita) throw new ErrorHttp(404, 'Cita no encontrada');
      if (cita.cliente_id !== d.cliente_id) throw new ErrorHttp(400, 'La cita es de otro cliente');
      if (!['pendiente', 'confirmada'].includes(cita.estado)) {
        throw new ErrorHttp(409, `La cita está ${cita.estado}`);
      }
    }

    const servicioIds = d.servicios.map((s) => s.servicio_id);
    const { rows: catalogo } = await db.query('SELECT id, precio FROM servicios WHERE id = ANY($1::bigint[])', [
      servicioIds,
    ]);
    if (catalogo.length !== servicioIds.length) throw new ErrorHttp(400, 'Uno o más servicios no existen');
    const precioActual = new Map(catalogo.map((s) => [s.id, s.precio]));

    // La visita en que se canjea un premio no suma para el siguiente.
    const canje = d.canjear_recompensa_id != null;
    if (canje) await bloquearRecompensaParaCanje(db, d.canjear_recompensa_id, d.cliente_id);

    const {
      rows: [visita],
    } = await db.query(
      `INSERT INTO visitas (cliente_id, cita_id, fecha, cuenta_para_fidelidad, notas)
       VALUES ($1, $2, coalesce($3, now()), $4, $5) RETURNING id, fecha`,
      [d.cliente_id, d.cita_id ?? null, d.fecha ?? null, !canje, d.notas ?? null],
    );

    await db.query(
      `INSERT INTO visita_servicios (visita_id, servicio_id, precio_cobrado)
       SELECT $1, unnest($2::bigint[]), unnest($3::numeric[])`,
      [visita.id, servicioIds, d.servicios.map((s) => s.precio_cobrado ?? precioActual.get(s.servicio_id))],
    );

    // Los pagos cobrados al registrar la visita llevan la fecha de la visita (puede ser una pasada).
    for (const p of d.pagos) {
      await db.query('INSERT INTO pagos (visita_id, monto, metodo, notas, pagado_en) VALUES ($1, $2, $3, $4, $5)', [
        visita.id,
        p.monto,
        p.metodo,
        p.notas ?? null,
        visita.fecha,
      ]);
    }

    if (canje) {
      await db.query(
        `UPDATE recompensas_cliente SET estado = 'canjeada', canjeada_en_visita_id = $2 WHERE id = $1`,
        [d.canjear_recompensa_id, visita.id],
      );
    }

    if (d.cita_id) {
      await db.query(`UPDATE citas SET estado = 'completada' WHERE id = $1`, [d.cita_id]);
      await cancelarRecordatorios(db, d.cita_id);
    }

    const recompensaOtorgada = canje ? null : await otorgarSiCorresponde(db, d.cliente_id);
    return { visita: await detalleVisita(db, visita.id), recompensa_otorgada: recompensaOtorgada };
  });

  res.status(201).json(resultado);
});

// Pagos agregados después (ej. el cliente pagó una parte después).
rutasVisitas.post('/:id/pagos', async (req, res) => {
  const p = esquemaPago.parse(req.body);
  const {
    rows: [pago],
  } = await pool.query('INSERT INTO pagos (visita_id, monto, metodo, notas) VALUES ($1, $2, $3, $4) RETURNING *', [
    id.parse(req.params.id),
    p.monto,
    p.metodo,
    p.notas ?? null,
  ]);
  res.status(201).json(pago);
});

rutasVisitas.delete('/pagos/:id', async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM pagos WHERE id = $1', [id.parse(req.params.id)]);
  if (!rowCount) throw new ErrorHttp(404, 'Pago no encontrado');
  res.status(204).end();
});
