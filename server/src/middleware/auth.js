import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { ErrorHttp } from './errores.js';

export function requiereAdmin(req, res, next) {
  const [tipo, token] = (req.get('authorization') ?? '').split(' ');
  if (tipo !== 'Bearer' || !token) throw new ErrorHttp(401, 'No autenticado');
  try {
    req.usuario = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new ErrorHttp(401, 'Sesión inválida o expirada');
  }
  next();
}
