import { Switch } from '@base-ui/react/switch';
import { AlertCircle } from 'lucide-react';
import { useId } from 'react';

export function Campo({ etiqueta, opcional, ayuda, error, children, id: idDado }) {
  const idAuto = useId();
  const id = idDado ?? idAuto;
  const control = typeof children === 'function' ? children({ id, invalido: Boolean(error) }) : children;
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
        {opcional && <span className="campo__opcional"> (opcional)</span>}
      </label>
      {control}
      {error ? <p className="campo__error">{error}</p> : ayuda && <p className="campo__ayuda">{ayuda}</p>}
    </div>
  );
}

export function Interruptor({ marcado, alCambiar, titulo, detalle }) {
  const id = useId();
  return (
    <div className="interruptor">
      <Switch.Root
        id={id}
        className="interruptor__raiz"
        checked={marcado}
        onCheckedChange={alCambiar}
        aria-describedby={detalle ? `${id}-detalle` : undefined}
      >
        <Switch.Thumb className="interruptor__bola" />
      </Switch.Root>
      <label htmlFor={id} style={{ cursor: 'pointer' }}>
        <span style={{ display: 'block', fontWeight: 600 }}>{titulo}</span>
        {detalle && (
          <span id={`${id}-detalle`} style={{ display: 'block', color: 'var(--muted)', fontSize: 14 }}>
            {detalle}
          </span>
        )}
      </label>
    </div>
  );
}

export function AvisoError({ children }) {
  if (!children) return null;
  return (
    <div className="aviso-error" role="alert">
      <AlertCircle />
      <span>{children}</span>
    </div>
  );
}
