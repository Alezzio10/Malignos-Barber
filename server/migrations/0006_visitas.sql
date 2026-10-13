-- Up Migration

-- Una visita = el cliente efectivamente se atendió. Es lo que cuenta para la fidelidad.
-- Puede venir de una cita o ser un cliente que llegó sin agendar (cita_id NULL).
CREATE TABLE visitas (
  id                    bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id            bigint      NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
  cita_id               uuid        REFERENCES citas (id) ON DELETE RESTRICT,
  fecha                 timestamptz NOT NULL DEFAULT now(),
  cuenta_para_fidelidad boolean     NOT NULL DEFAULT true,
  notas                 text,
  creado_en             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT visitas_cita_unica UNIQUE (cita_id)
);

CREATE INDEX visitas_cliente_fecha ON visitas (cliente_id, fecha DESC);
CREATE INDEX visitas_fecha ON visitas (fecha);

-- Servicios realizados y lo que se cobró por cada uno (0 si fue un corte de regalo).
-- El total de la visita es la suma de estas filas.
CREATE TABLE visita_servicios (
  visita_id      bigint        NOT NULL REFERENCES visitas (id) ON DELETE CASCADE,
  servicio_id    bigint        NOT NULL REFERENCES servicios (id) ON DELETE RESTRICT,
  precio_cobrado numeric(10,2) NOT NULL,
  PRIMARY KEY (visita_id, servicio_id),
  CONSTRAINT visita_servicios_precio_valido CHECK (precio_cobrado >= 0)
);

-- Down Migration

DROP TABLE visita_servicios;
DROP TABLE visitas;
