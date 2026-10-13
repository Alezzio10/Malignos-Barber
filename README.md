# Malignos Barber

App de gestión para la barbería Malignos Barber: clientes, citas, fidelidad (corte gratis cada 10 visitas), ingresos y gastos, y recordatorios de citas por email.

## Estructura

- `server/` — API en Node.js (Express) y migraciones de la base de datos (PostgreSQL).
- `client/` — App web en React (pendiente).

## Puesta en marcha

Requiere Node 20+ y PostgreSQL 13+ con la base `malignosbarber_db` creada.

```bash
cd server
npm install
cp .env.example .env               # completa DATABASE_URL y JWT_SECRET
npm run migrate:up                 # crea las tablas
npm run crear-admin -- "Nombre" correo@ejemplo.com "contraseña"
npm run dev                        # API en http://localhost:3000
```

Para deshacer la última migración: `npm run migrate:down`.

Los recordatorios se envían solo si configuras `SMTP_*` en `.env`; sin eso quedan guardados como pendientes.

## API

Todas las respuestas son JSON. Los errores tienen la forma `{ "error": "mensaje", "detalles"?: [...] }`.
Fechas con hora en ISO 8601 con zona (`2026-10-20T10:00:00-06:00`); fechas solas como `AAAA-MM-DD`.

### Públicas (clientes, sin login)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/publico/servicios` | Servicios activos |
| GET | `/api/publico/disponibilidad?fecha=&servicios=1,2` | Horas libres de un día para esos servicios |
| POST | `/api/publico/citas` | Agendar: `{ nombre, telefono, email?, recordatorio, servicios: [ids], inicio }` |
| GET | `/api/publico/citas/:id` | Ver una cita (id = uuid del enlace) |
| POST | `/api/publico/citas/:id/cancelar` | Cancelar una cita |

### Dueño (header `Authorization: Bearer <token>`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → `{ token, usuario }` |
| GET | `/api/auth/yo` | Usuario de la sesión |
| GET, POST, PATCH | `/api/admin/servicios[/:id]` | Catálogo de servicios |
| GET, POST, DELETE | `/api/admin/agenda/horarios[/:id]` | Horario semanal (`dia_semana` 0 = domingo) |
| GET, POST, DELETE | `/api/admin/agenda/bloqueos[/:id]` | Vacaciones y feriados (`?desde=&hasta=`) |
| GET, POST, PATCH | `/api/admin/clientes[/:id]` | Clientes (`?buscar=&pagina=`); el detalle incluye fidelidad, visitas y citas |
| GET, POST | `/api/admin/citas` | Agenda (`?desde=&hasta=&estado=`); `forzar: true` permite agendar fuera de horario |
| PUT | `/api/admin/citas/:id/reprogramar` | `{ inicio }` |
| PATCH | `/api/admin/citas/:id/estado` | `{ estado: confirmada \| cancelada \| no_asistio \| pendiente }` |
| GET, POST | `/api/admin/visitas[/:id]` | Registrar atención: servicios, pagos y canje de premio. Devuelve `recompensa_otorgada` al llegar a la meta |
| POST | `/api/admin/visitas/:id/pagos` | Agregar un pago a una visita |
| DELETE | `/api/admin/visitas/pagos/:id` | Borrar un pago mal registrado |
| GET, PUT | `/api/admin/fidelidad/regla` | Ver o cambiar la regla de fidelidad |
| GET | `/api/admin/fidelidad/recompensas?estado=` | Premios otorgados |
| PATCH | `/api/admin/fidelidad/recompensas/:id/anular` | Anular un premio |
| GET, POST, PATCH | `/api/admin/finanzas/categorias-gasto[/:id]` | Categorías de gasto |
| GET, POST, PATCH, DELETE | `/api/admin/finanzas/gastos[/:id]` | Gastos (`?desde=&hasta=`) |
| GET | `/api/admin/finanzas/reportes/resumen?desde=&hasta=` | Ingresos, gastos, utilidad, visitas y citas del período |
| GET | `/api/admin/finanzas/reportes/diario?desde=&hasta=` | Ingresos y gastos día por día |

## Base de datos

| Migración | Tablas |
|---|---|
| 0001 | `usuarios` (login del dueño) |
| 0002 | `servicios` |
| 0003 | `horarios`, `bloqueos_horario` |
| 0004 | `clientes` |
| 0005 | `citas`, `cita_servicios` |
| 0006 | `visitas`, `visita_servicios` |
| 0007 | `reglas_fidelidad`, `recompensas_cliente`, vista `v_progreso_fidelidad` |
| 0008 | `pagos`, `categorias_gasto`, `gastos` |
| 0009 | `recordatorios` |
