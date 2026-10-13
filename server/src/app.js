import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { pool } from './db.js';
import { requiereAdmin } from './middleware/auth.js';
import { manejarErrores, noEncontrado } from './middleware/errores.js';
import { rutasAuth } from './rutas/auth.js';
import { rutasCitas } from './rutas/citas.js';
import { rutasClientes } from './rutas/clientes.js';
import { rutasFidelidad } from './rutas/fidelidad.js';
import { rutasFinanzas } from './rutas/finanzas.js';
import { rutasHorarios } from './rutas/horarios.js';
import { rutasPublicas } from './rutas/publico.js';
import { rutasServicios } from './rutas/servicios.js';
import { rutasVisitas } from './rutas/visitas.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.clienteUrl }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/salud', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

app.use('/api/auth', rutasAuth);
app.use('/api/publico', rutasPublicas);

// Todo lo de /api/admin requiere el login del dueño.
const admin = Router();
admin.use(requiereAdmin);
admin.use('/servicios', rutasServicios);
admin.use('/agenda', rutasHorarios);
admin.use('/clientes', rutasClientes);
admin.use('/citas', rutasCitas);
admin.use('/visitas', rutasVisitas);
admin.use('/fidelidad', rutasFidelidad);
admin.use('/finanzas', rutasFinanzas);
app.use('/api/admin', admin);

app.use(noEncontrado);
app.use(manejarErrores);
