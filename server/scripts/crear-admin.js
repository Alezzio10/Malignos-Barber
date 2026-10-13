// Crea el usuario del dueño, o le cambia la contraseña si el email ya existe.
// Uso: npm run crear-admin -- "Nombre" correo@ejemplo.com "contraseña"
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const [nombre, email, password] = process.argv.slice(2);

if (!nombre || !email || !password) {
  console.error('Uso: npm run crear-admin -- "Nombre" correo@ejemplo.com "contraseña"');
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const {
  rows: [usuario],
} = await pool.query(
  `INSERT INTO usuarios (nombre, email, password_hash) VALUES ($1, $2, $3)
   ON CONFLICT ((lower(email))) DO UPDATE
     SET nombre = EXCLUDED.nombre, password_hash = EXCLUDED.password_hash, activo = true
   RETURNING id, nombre, email`,
  [nombre, email.trim().toLowerCase(), hash],
);
console.log(`Usuario listo: ${usuario.nombre} <${usuario.email}> (id ${usuario.id})`);
await pool.end();
