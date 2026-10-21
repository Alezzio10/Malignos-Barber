import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';

// Panel lateral (abajo en teléfonos) para formularios que no deben sacar al usuario de su contexto.
export function Panel({ abierto, alCerrar, titulo, descripcion, children, pie }) {
  return (
    <Dialog.Root open={abierto} onOpenChange={(abrir) => !abrir && alCerrar()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="panel-fondo" />
        <Dialog.Popup className="panel">
          <header className="panel__cabecera">
            <div>
              <Dialog.Title className="panel__titulo">{titulo}</Dialog.Title>
              {descripcion && <Dialog.Description className="panel__descripcion">{descripcion}</Dialog.Description>}
            </div>
            <Dialog.Close className="icono-btn" aria-label="Cerrar">
              <X />
            </Dialog.Close>
          </header>
          <div className="panel__cuerpo">{children}</div>
          {pie && <footer className="panel__pie">{pie}</footer>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
