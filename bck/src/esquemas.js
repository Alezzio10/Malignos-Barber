import { z } from 'zod';

// Validaciones compartidas entre rutas.

export const id = z.coerce.number().int().positive();
export const uuid = z.uuid('Id inválido');
export const fecha = z.iso.date('Fecha inválida (formato AAAA-MM-DD)');
export const fechaHora = z.iso
  .datetime({ offset: true, message: 'Fecha y hora inválidas (ISO 8601 con zona)' })
  .transform((v) => new Date(v));

// Se quitan espacios, guiones, puntos y paréntesis: "+504 9999-0000" -> "+50499990000".
export const telefono = z
  .string()
  .transform((v) => v.trim().replace(/[\s\-().]/g, ''))
  .pipe(z.string().regex(/^\+?\d{7,15}$/, 'Teléfono inválido'));

const vacioANulo = (v) => (typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v);

export const emailOpcional = z.preprocess(
  (v) => {
    const limpio = vacioANulo(v);
    return typeof limpio === 'string' ? limpio.toLowerCase() : limpio;
  },
  z.email('Email inválido').nullish(),
);

export const textoOpcional = z.preprocess(vacioANulo, z.string().max(1000).nullish());
export const nombre = z.string().trim().min(1, 'Requerido').max(120);
export const monto = z.coerce.number().nonnegative().max(99_999_999);
export const metodoPago = z.enum(['efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia']);

export const rangoFechas = z
  .object({ desde: fecha, hasta: fecha })
  .refine((r) => r.desde <= r.hasta, { message: '"desde" no puede ser posterior a "hasta"', path: ['desde'] });

export const listaIds = z.array(id).min(1).refine((ids) => new Set(ids).size === ids.length, 'Hay ids repetidos');
