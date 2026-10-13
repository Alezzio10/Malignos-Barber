# Malignos Barber

App de gestión para la barbería Malignos Barber: clientes, citas, fidelidad (corte gratis cada 10 visitas), ingresos y gastos, y recordatorios de citas por email.

## Estructura

- `server/` — API en Node.js y migraciones de la base de datos (PostgreSQL).
- `client/` — App web en React (pendiente).

## Base de datos

Requiere PostgreSQL 13 o superior y la base `malignosbarber_db` creada.

```bash
cd server
npm install
cp .env.example .env   # y completa DATABASE_URL
npm run migrate:up
```

Para deshacer la última migración: `npm run migrate:down`.

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
