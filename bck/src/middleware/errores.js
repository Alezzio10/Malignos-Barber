import { z } from 'zod';

export class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Mensajes legibles para las restricciones definidas en las migraciones.
const MENSAJES_RESTRICCION = {
  citas_sin_traslape: 'Ese horario ya está ocupado',
  horarios_sin_traslape: 'El tramo se cruza con otro tramo del mismo día',
  clientes_telefono_unico: 'Ya existe un cliente con ese teléfono',
  clientes_recordatorio_requiere_email: 'Para recibir recordatorios el cliente necesita un email',
  reglas_fidelidad_una_activa: 'Ya hay una regla de fidelidad activa',
  usuarios_email_unico: 'Ya existe un usuario con ese email',
  servicios_nombre_unico: 'Ya existe un servicio con ese nombre',
  categorias_gasto_nombre_unico: 'Ya existe una categoría con ese nombre',
  visitas_cita_unica: 'Esa cita ya tiene una visita registrada',
};

export function noEncontrado(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

// eslint-disable-next-line no-unused-vars
export function manejarErrores(err, req, res, next) {
  if (err instanceof ErrorHttp) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  // JSON mal formado y otros errores de express con status propio.
  if (err.expose && err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  const mensaje = MENSAJES_RESTRICCION[err.constraint];
  switch (err.code) {
    case '23P01': // exclusión (traslapes)
    case '23505': // unicidad
      return res.status(409).json({ error: mensaje ?? 'El registro entra en conflicto con otro existente' });
    case '23503': // llave foránea
      return res.status(409).json({ error: 'El registro está en uso o hace referencia a uno que no existe' });
    case '23514': // check
      return res.status(400).json({ error: mensaje ?? `Los datos no cumplen la regla ${err.constraint}` });
    case '22P02': // formato inválido (ej. uuid)
      return res.status(400).json({ error: 'Formato de dato inválido' });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
