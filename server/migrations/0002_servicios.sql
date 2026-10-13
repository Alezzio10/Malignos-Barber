-- Up Migration

CREATE TABLE servicios (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre         text          NOT NULL,
  descripcion    text,
  duracion_min   integer       NOT NULL,
  precio         numeric(10,2) NOT NULL,
  activo         boolean       NOT NULL DEFAULT true,
  creado_en      timestamptz   NOT NULL DEFAULT now(),
  actualizado_en timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT servicios_duracion_valida CHECK (duracion_min > 0 AND duracion_min <= 480),
  CONSTRAINT servicios_precio_valido   CHECK (precio >= 0)
);

CREATE UNIQUE INDEX servicios_nombre_unico ON servicios (lower(nombre));

CREATE TRIGGER servicios_actualizado_en BEFORE UPDATE ON servicios
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Down Migration

DROP TABLE servicios;
