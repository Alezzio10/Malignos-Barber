-- Up Migration

CREATE TYPE tipo_recompensa AS ENUM ('corte_gratis', 'descuento_porcentaje', 'descuento_monto', 'producto');
CREATE TYPE estado_recompensa AS ENUM ('disponible', 'canjeada', 'vencida', 'anulada');

CREATE TABLE reglas_fidelidad (
  id                 bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre             text            NOT NULL,
  visitas_requeridas integer         NOT NULL,
  tipo_recompensa    tipo_recompensa NOT NULL,
  valor              numeric(10,2),
  dias_vigencia      integer,
  activo             boolean         NOT NULL DEFAULT true,
  creado_en          timestamptz     NOT NULL DEFAULT now(),
  actualizado_en     timestamptz     NOT NULL DEFAULT now(),
  CONSTRAINT reglas_visitas_validas CHECK (visitas_requeridas > 0),
  CONSTRAINT reglas_vigencia_valida CHECK (dias_vigencia IS NULL OR dias_vigencia > 0),
  -- Los descuentos necesitan un valor; el corte gratis y el producto no.
  CONSTRAINT reglas_valor_coherente CHECK (
    tipo_recompensa IN ('corte_gratis', 'producto')
    OR (valor IS NOT NULL AND valor > 0)
  ),
  CONSTRAINT reglas_porcentaje_valido CHECK (tipo_recompensa <> 'descuento_porcentaje' OR valor <= 100)
);

-- Solo una regla activa a la vez.
CREATE UNIQUE INDEX reglas_fidelidad_una_activa ON reglas_fidelidad ((true)) WHERE activo;

CREATE TRIGGER reglas_fidelidad_actualizado_en BEFORE UPDATE ON reglas_fidelidad
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

INSERT INTO reglas_fidelidad (nombre, visitas_requeridas, tipo_recompensa)
VALUES ('Corte gratis cada 10 visitas', 10, 'corte_gratis');

-- Recompensas ganadas. generada_por_visita_id apunta a la visita que completó el ciclo
-- (la 10ª) y marca desde dónde se vuelve a contar.
CREATE TABLE recompensas_cliente (
  id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cliente_id             bigint            NOT NULL REFERENCES clientes (id) ON DELETE RESTRICT,
  regla_id               bigint            NOT NULL REFERENCES reglas_fidelidad (id) ON DELETE RESTRICT,
  generada_por_visita_id bigint            NOT NULL REFERENCES visitas (id) ON DELETE RESTRICT,
  estado                 estado_recompensa NOT NULL DEFAULT 'disponible',
  otorgada_en            timestamptz       NOT NULL DEFAULT now(),
  vence_en               timestamptz,
  canjeada_en_visita_id  bigint            REFERENCES visitas (id) ON DELETE RESTRICT,
  CONSTRAINT recompensas_generada_unica UNIQUE (generada_por_visita_id),
  CONSTRAINT recompensas_canje_unico    UNIQUE (canjeada_en_visita_id),
  CONSTRAINT recompensas_canje_coherente CHECK ((estado = 'canjeada') = (canjeada_en_visita_id IS NOT NULL)),
  CONSTRAINT recompensas_vencimiento_valido CHECK (vence_en IS NULL OR vence_en > otorgada_en)
);

CREATE INDEX recompensas_cliente_estado ON recompensas_cliente (cliente_id, estado);

-- Progreso de cada cliente hacia la próxima recompensa de la regla activa:
-- cuenta las visitas válidas posteriores a la visita que generó su última recompensa.
CREATE VIEW v_progreso_fidelidad AS
WITH regla AS (
  SELECT visitas_requeridas FROM reglas_fidelidad WHERE activo
),
ultima AS (
  SELECT DISTINCT ON (r.cliente_id) r.cliente_id, v.fecha
  FROM recompensas_cliente r
  JOIN visitas v ON v.id = r.generada_por_visita_id
  ORDER BY r.cliente_id, v.fecha DESC
)
SELECT
  c.id AS cliente_id,
  c.nombre,
  regla.visitas_requeridas,
  count(v.id)::integer AS visitas_acumuladas,
  greatest(regla.visitas_requeridas - count(v.id), 0)::integer AS visitas_faltantes,
  (SELECT count(*) FROM recompensas_cliente rc
    WHERE rc.cliente_id = c.id AND rc.estado = 'disponible')::integer AS recompensas_disponibles
FROM clientes c
CROSS JOIN regla
LEFT JOIN ultima u ON u.cliente_id = c.id
LEFT JOIN visitas v
  ON v.cliente_id = c.id
 AND v.cuenta_para_fidelidad
 AND v.fecha > coalesce(u.fecha, '-infinity')
WHERE c.activo
GROUP BY c.id, c.nombre, regla.visitas_requeridas;

-- Down Migration

DROP VIEW v_progreso_fidelidad;
DROP TABLE recompensas_cliente;
DROP TABLE reglas_fidelidad;
DROP TYPE estado_recompensa;
DROP TYPE tipo_recompensa;
