export const ZONA = import.meta.env.VITE_ZONA_HORARIA ?? 'America/El_Salvador';
const SIMBOLO = import.meta.env.VITE_SIMBOLO_MONEDA ?? '$';

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const numero = new Intl.NumberFormat('es', { maximumFractionDigits: 2 });

export function dinero(valor) {
  const n = Number(valor ?? 0);
  const texto = Number.isInteger(n)
    ? numero.format(n)
    : new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return `${SIMBOLO}${texto}`;
}

export const simboloMoneda = SIMBOLO;

// Fecha AAAA-MM-DD en la zona de la barbería.
export function fechaLocal(fecha = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(fecha);
}

export function sumarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// Partes de una fecha AAAA-MM-DD sin desplazarla de zona.
export function partesDia(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  const f = (op) => new Intl.DateTimeFormat('es', { timeZone: 'UTC', ...op }).format(d);
  return {
    semana: f({ weekday: 'short' }).replace('.', ''),
    dia: f({ day: 'numeric' }),
    mes: f({ month: 'short' }).replace('.', ''),
    diaSemana: d.getUTCDay(),
    larga: f({ weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

export function hora(iso) {
  return new Intl.DateTimeFormat('es', { timeZone: ZONA, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(new Date(iso))
    .replace(/\s/g, ' ');
}

export function horaDelDia(iso) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, hour: 'numeric', hour12: false }).format(new Date(iso)));
}

export function fechaLarga(iso) {
  return new Intl.DateTimeFormat('es', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(iso),
  );
}

export function fechaCorta(iso) {
  return new Intl.DateTimeFormat('es', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(iso))
    .replace('.', '');
}

// "hoy", "mañana" o la fecha larga.
export function cuandoRelativo(iso) {
  const dia = fechaLocal(new Date(iso));
  const hoy = fechaLocal();
  if (dia === hoy) return 'hoy';
  if (dia === sumarDias(hoy, 1)) return 'mañana';
  return fechaLarga(iso);
}

export function duracion(minutos) {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function telefonoLegible(tel) {
  return tel?.replace(/^(\+\d{3})(\d{4})(\d{4})$/, '$1 $2 $3') ?? '';
}

// Primer y último día del mes de una fecha AAAA-MM-DD.
export function rangoMes(iso, desplazamiento = 0) {
  const [a, m] = iso.split('-').map(Number);
  const inicio = new Date(Date.UTC(a, m - 1 + desplazamiento, 1));
  const fin = new Date(Date.UTC(a, m + desplazamiento, 0));
  return { desde: inicio.toISOString().slice(0, 10), hasta: fin.toISOString().slice(0, 10) };
}

export function nombreMes(iso) {
  return new Intl.DateTimeFormat('es', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

// Desfase de la zona de la barbería en una fecha dada, ej. "-06:00".
export function desfaseZona(fecha) {
  const parte = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, timeZoneName: 'longOffset' })
    .formatToParts(new Date(`${fecha}T12:00:00Z`))
    .find((p) => p.type === 'timeZoneName').value;
  return parte === 'GMT' ? '+00:00' : parte.replace('GMT', '');
}

// Fecha AAAA-MM-DD y hora HH:MM de la barbería -> ISO con zona para la API.
export const isoLocal = (fecha, horaHHMM) => `${fecha}T${horaHHMM}:00${desfaseZona(fecha)}`;

export const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Atendida',
  cancelada: 'Cancelada',
  no_asistio: 'No asistió',
};

export const ETIQUETA_METODO = {
  efectivo: 'Efectivo',
  tarjeta_debito: 'Tarjeta de débito',
  tarjeta_credito: 'Tarjeta de crédito',
  transferencia: 'Transferencia',
};
