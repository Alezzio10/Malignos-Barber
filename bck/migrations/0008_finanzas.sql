-- Up Migration

CREATE TYPE metodo_pago AS ENUM ('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia');

-- Ingresos: lo que el cliente paga en una visita (puede dividirse en varios métodos).
CREATE TABLE pagos (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visita_id bigint        NOT NULL REFERENCES visitas (id) ON DELETE RESTRICT,
  monto     numeric(10,2) NOT NULL,
  metodo    metodo_pago   NOT NULL,
  pagado_en timestamptz   NOT NULL DEFAULT now(),
  notas     text,
  CONSTRAINT pagos_monto_valido CHECK (monto > 0)
);

CREATE INDEX pagos_visita ON pagos (visita_id);
CREATE INDEX pagos_fecha ON pagos (pagado_en);

CREATE TABLE categorias_gasto (
  id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text    NOT NULL,
  activo boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX categorias_gasto_nombre_unico ON categorias_gasto (lower(nombre));

INSERT INTO categorias_gasto (nombre) VALUES
  ('Arriendo'),
  ('Productos e insumos'),
  ('Servicios básicos'),
  ('Equipamiento'),
  ('Marketing'),
  ('Otros');

-- Salidas de dinero.
CREATE TABLE gastos (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria_id   bigint        NOT NULL REFERENCES categorias_gasto (id) ON DELETE RESTRICT,
  descripcion    text          NOT NULL,
  monto          numeric(10,2) NOT NULL,
  metodo         metodo_pago   NOT NULL,
  fecha          date          NOT NULL DEFAULT current_date,
  creado_en      timestamptz   NOT NULL DEFAULT now(),
  actualizado_en timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT gastos_monto_valido CHECK (monto > 0)
);

CREATE INDEX gastos_fecha ON gastos (fecha);
CREATE INDEX gastos_categoria ON gastos (categoria_id, fecha);

CREATE TRIGGER gastos_actualizado_en BEFORE UPDATE ON gastos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Down Migration

DROP TABLE gastos;
DROP TABLE categorias_gasto;
DROP TABLE pagos;
DROP TYPE metodo_pago;
