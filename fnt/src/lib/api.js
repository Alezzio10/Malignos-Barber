const BASE = import.meta.env.VITE_API_URL ?? '/api';
const CLAVE_TOKEN = 'mb_token';

export const sesion = {
  get token() {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  guardar(token) {
    try {
      localStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      /* sin almacenamiento: la sesión dura lo que la pestaña */
    }
  },
  cerrar() {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* nada que borrar */
    }
  },
};

export class ErrorApi extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

export async function api(ruta, { metodo = 'GET', body, auth = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth && sesion.token) headers.authorization = `Bearer ${sesion.token}`;

  let respuesta;
  try {
    respuesta = await fetch(BASE + ruta, {
      method: metodo,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ErrorApi(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (respuesta.status === 401 && auth) {
      sesion.cerrar();
      window.dispatchEvent(new Event('mb:sesion-expirada'));
    }
    throw new ErrorApi(respuesta.status, datos?.error ?? 'Algo salió mal. Inténtalo de nuevo.', datos?.detalles);
  }
  return datos;
}

export const publico = (ruta, opciones) => api(`/publico${ruta}`, opciones);
export const admin = (ruta, opciones) => api(`/admin${ruta}`, { ...opciones, auth: true });

const NOMBRES_CAMPO = {
  nombre: 'Nombre',
  telefono: 'Teléfono',
  email: 'Email',
  inicio: 'Hora',
  servicios: 'Servicios',
  monto: 'Monto',
  precio: 'Precio',
  duracion_min: 'Duración',
  descripcion: 'Descripción',
};

// Mensaje legible para mostrar en pantalla, incluyendo el primer campo inválido si lo hay.
export function mensajeDeError(error) {
  const detalle = error?.detalles?.[0];
  if (detalle) {
    const campo = NOMBRES_CAMPO[detalle.campo.split('.')[0]] ?? detalle.campo;
    return `${campo}: ${detalle.mensaje}`;
  }
  return error?.message ?? 'Algo salió mal. Inténtalo de nuevo.';
}
