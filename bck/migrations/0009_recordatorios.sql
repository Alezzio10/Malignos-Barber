-- Up Migration

CREATE TYPE estado_recordatorio AS ENUM ('pendiente', 'enviado', 'fallido', 'cancelado');

-- Recordatorios por email. Al crear una cita con recordatorio_activo se insertan sus filas
-- (ej. 24 h y 2 h antes); un proceso periódico envía las pendientes cuya hora ya llegó.
-- El email se toma del cliente al momento de enviar.
CREATE TABLE recordatorios (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cita_id         uuid                NOT NULL REFERENCES citas (id) ON DELETE CASCADE,
  programado_para timestamptz         NOT NULL,
  estado          estado_recordatorio NOT NULL DEFAULT 'pendiente',
  intentos        smallint            NOT NULL DEFAULT 0,
  ultimo_error    text,
  enviado_en      timestamptz,
  creado_en       timestamptz         NOT NULL DEFAULT now(),
  CONSTRAINT recordatorios_unico_por_hora   UNIQUE (cita_id, programado_para),
  CONSTRAINT recordatorios_intentos_validos CHECK (intentos >= 0),
  CONSTRAINT recordatorios_envio_coherente  CHECK ((estado = 'enviado') = (enviado_en IS NOT NULL))
);

-- Para la consulta del proceso que envía: "pendientes cuya hora ya pasó".
CREATE INDEX recordatorios_pendientes ON recordatorios (programado_para) WHERE estado = 'pendiente';

-- Down Migration

DROP TABLE recordatorios;
DROP TYPE estado_recordatorio;
