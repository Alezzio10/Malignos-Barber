import 'dotenv/config';

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta la variable de entorno ${nombre} (revisa server/.env)`);
  return valor;
}

function smtpDesdeEntorno() {
  if (!process.env.SMTP_HOST) return null;
  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    remitente: process.env.SMTP_FROM ?? process.env.SMTP_USER,
  };
}

export const config = {
  puerto: Number(process.env.PORT ?? 3000),
  databaseUrl: requerida('DATABASE_URL'),
  jwtSecret: requerida('JWT_SECRET'),
  jwtExpira: process.env.JWT_EXPIRA ?? '7d',
  clienteUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  // Zona horaria de la barbería: los horarios de atención se interpretan en esta zona.
  zonaHoraria: process.env.ZONA_HORARIA ?? 'America/Guatemala',
  // Cada cuántos minutos se ofrecen horas en la agenda pública.
  intervaloAgendaMin: Number(process.env.INTERVALO_AGENDA_MIN ?? 15),
  // Hasta cuántos días hacia adelante puede agendar un cliente desde la web.
  diasMaxAgenda: Number(process.env.DIAS_MAX_AGENDA ?? 60),
  // Citas futuras activas que un mismo teléfono puede tener a la vez desde la web.
  maxCitasActivasPorCliente: Number(process.env.MAX_CITAS_ACTIVAS ?? 2),
  // Horas antes de la cita en que se envían recordatorios.
  recordatoriosHorasAntes: (process.env.RECORDATORIOS_HORAS_ANTES ?? '24,2').split(',').map(Number),
  smtp: smtpDesdeEntorno(),
};
