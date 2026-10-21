-- Up Migration

CREATE TYPE estado_cita AS ENUM ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio');
CREATE TYPE origen_cita AS ENUM ('web', 'presencial');

-- uuid como id para poder usarlo en enlaces públicos (ej. cancelar desde el email)
-- sin exponer ids correlativos.
CREATE TABLE citas (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id          bigint      NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
  inicio              timestamptz NOT NULL,
  fin                 timestamptz NOT NULL,
  estado              estado_cita NOT NULL DEFAULT 'pendiente',
  origen              origen_cita NOT NULL DEFAULT 'web',
  recordatorio_activo boolean     NOT NULL DEFAULT false,
  notas               text,
  cancelada_en        timestamptz,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  actualizado_en      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT citas_rango_valido CHECK (fin > inicio),
  CONSTRAINT citas_cancelacion_coherente CHECK ((estado = 'cancelada') = (cancelada_en IS NOT NULL)),
  -- Un solo barbero: dos citas activas nunca pueden cruzarse en el tiempo.
  CONSTRAINT citas_sin_traslape EXCLUDE USING gist (tstzrange(inicio, fin) WITH &&)
    WHERE (estado IN ('pendiente', 'confirmada'))
);

CREATE INDEX citas_inicio ON citas (inicio);
CREATE INDEX citas_cliente ON citas (cliente_id, inicio DESC);

CREATE TRIGGER citas_actualizado_en BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Servicios reservados en la cita. Se copia precio y duración del momento de la reserva
-- para que un cambio de precio posterior no altere citas ya agendadas.
CREATE TABLE cita_servicios (
  cita_id         uuid          NOT NULL REFERENCES citas (id) ON DELETE CASCADE,
  servicio_id     bigint        NOT NULL REFERENCES servicios (id) ON DELETE RESTRICT,
  precio_aplicado numeric(10,2) NOT NULL,
  duracion_min    integer       NOT NULL,
  PRIMARY KEY (cita_id, servicio_id),
  CONSTRAINT cita_servicios_precio_valido   CHECK (precio_aplicado >= 0),
  CONSTRAINT cita_servicios_duracion_valida CHECK (duracion_min > 0)
);

-- Down Migration

DROP TABLE cita_servicios;
DROP TABLE citas;
DROP TYPE origen_cita;
DROP TYPE estado_cita;
