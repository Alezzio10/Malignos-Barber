import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { pool } from '../db.js';
import { requiereAdmin } from '../middleware/auth.js';
import { ErrorHttp } from '../middleware/errores.js';

export const rutasAuth = Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera unos minutos' },
});

const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1),
});

rutasAuth.post('/login', limiteLogin, async (req, res) => {
  const { email, password } = esquemaLogin.parse(req.body);
  const {
    rows: [usuario],
  } = await pool.query('SELECT id, nombre, email, password_hash FROM usuarios WHERE lower(email) = $1 AND activo', [
    email,
  ]);

  const valido = usuario && (await bcrypt.compare(password, usuario.password_hash));
  if (!valido) throw new ErrorHttp(401, 'Email o contraseña incorrectos');

  const token = jwt.sign({ sub: usuario.id, nombre: usuario.nombre }, config.jwtSecret, {
    expiresIn: config.jwtExpira,
  });
  res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } });
});

rutasAuth.get('/yo', requiereAdmin, async (req, res) => {
  const {
    rows: [usuario],
  } = await pool.query('SELECT id, nombre, email FROM usuarios WHERE id = $1 AND activo', [req.usuario.sub]);
  if (!usuario) throw new ErrorHttp(401, 'Usuario no válido');
  res.json(usuario);
});
