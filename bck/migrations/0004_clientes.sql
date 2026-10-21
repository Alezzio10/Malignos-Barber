-- Up Migration

-- El teléfono identifica al cliente: agenda solo con nombre y teléfono.
-- La API debe normalizarlo antes de guardar (solo dígitos, con + opcional).
CREATE TABLE clientes (
  id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre               text        NOT NULL,
  telefono             text        NOT NULL,
  email                text,
  fecha_nacimiento     date,
  acepta_recordatorios boolean     NOT NULL DEFAULT false,
  notas                text,
  activo               boolean     NOT NULL DEFAULT true,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  actualizado_en       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clientes_telefono_unico   UNIQUE (telefono),
  CONSTRAINT clientes_telefono_formato CHECK (telefono ~ '^\+?[0-9]{7,15}$'),
  CONSTRAINT clientes_email_formato    CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Los recordatorios son por email: no se pueden activar sin email.
  CONSTRAINT clientes_recordatorio_requiere_email CHECK (NOT acepta_recordatorios OR email IS NOT NULL)
);

CREATE INDEX clientes_email ON clientes (lower(email));
CREATE INDEX clientes_nombre ON clientes (lower(nombre));

CREATE TRIGGER clientes_actualizado_en BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Down Migration

DROP TABLE clientes;
