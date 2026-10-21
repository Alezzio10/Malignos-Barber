import pg from 'pg';
import { config } from './config.js';

// bigint (ids, count) y numeric (dinero) llegan como string por defecto; los valores
// de esta app caben de sobra en un Number de JavaScript.
pg.types.setTypeParser(pg.types.builtins.INT8, Number);
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);
// Las columnas date se devuelven tal cual ('AAAA-MM-DD') para no desplazarlas de zona horaria.
pg.types.setTypeParser(pg.types.builtins.DATE, (valor) => valor);

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

export async function transaccion(fn) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await fn(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}
