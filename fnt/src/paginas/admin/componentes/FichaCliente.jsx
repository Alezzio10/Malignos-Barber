import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AvisoError, Campo, Interruptor } from '../../../components/Formulario.jsx';
import { Panel } from '../../../components/Panel.jsx';
import { admin, mensajeDeError } from '../../../lib/api.js';

const vacio = { nombre: '', telefono: '', email: '', fecha_nacimiento: '', acepta_recordatorios: false, notas: '', activo: true };

// Crear o editar un cliente.
export function FichaCliente({ abierto, alCerrar, alGuardar, cliente }) {
  const [datos, setDatos] = useState(vacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    setDatos(
      cliente
        ? {
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            email: cliente.email ?? '',
            fecha_nacimiento: cliente.fecha_nacimiento ?? '',
            acepta_recordatorios: cliente.acepta_recordatorios,
            notas: cliente.notas ?? '',
            activo: cliente.activo,
          }
        : vacio,
    );
  }, [abierto, cliente]);

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const body = { ...datos, fecha_nacimiento: datos.fecha_nacimiento || null, email: datos.email || null };
    try {
      const guardado = cliente
        ? await admin(`/clientes/${cliente.id}`, { metodo: 'PATCH', body })
        : await admin('/clientes', { metodo: 'POST', body });
      toast.success(cliente ? 'Cliente actualizado' : 'Cliente creado');
      alGuardar?.(guardado);
      alCerrar();
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Panel
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      pie={
        <>
          <button type="button" className="btn btn--borde" onClick={alCerrar}>
            Cancelar
          </button>
          <button type="submit" form="form-cliente" className="btn btn--oro" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form id="form-cliente" onSubmit={guardar} className="pila">
        <Campo etiqueta="Nombre">
          {({ id }) => <input id={id} className="input" value={datos.nombre} onChange={cambiar('nombre')} required />}
        </Campo>
        <Campo etiqueta="Teléfono" ayuda="Es el identificador del cliente: no puede repetirse.">
          {({ id }) => <input id={id} type="tel" className="input" value={datos.telefono} onChange={cambiar('telefono')} required />}
        </Campo>
        <Campo etiqueta="Email" opcional>
          {({ id }) => <input id={id} type="email" className="input" value={datos.email} onChange={cambiar('email')} />}
        </Campo>
        <Campo etiqueta="Cumpleaños" opcional>
          {({ id }) => <input id={id} type="date" className="input" value={datos.fecha_nacimiento} onChange={cambiar('fecha_nacimiento')} />}
        </Campo>
        <Interruptor
          marcado={datos.acepta_recordatorios}
          alCambiar={(v) => setDatos({ ...datos, acepta_recordatorios: v })}
          titulo="Acepta recordatorios por email"
          detalle="Necesita un email registrado."
        />
        <Campo etiqueta="Notas" opcional ayuda="Ej. cómo le gusta el corte.">
          {({ id }) => <textarea id={id} className="input" value={datos.notas} onChange={cambiar('notas')} />}
        </Campo>
        {cliente && (
          <Interruptor
            marcado={datos.activo}
            alCambiar={(v) => setDatos({ ...datos, activo: v })}
            titulo="Cliente activo"
            detalle="Un cliente inactivo no puede agendar desde la web."
          />
        )}
        <AvisoError>{error}</AvisoError>
      </form>
    </Panel>
  );
}
