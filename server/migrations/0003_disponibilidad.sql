-- Up Migration

-- Horario semanal de atención. Puede haber varios tramos por día (ej. mañana y tarde).
-- dia_semana sigue la convención de JavaScript Date.getDay(): 0 = domingo ... 6 = sábado.
CREATE TABLE horarios (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dia_semana  smallint NOT NULL,
  hora_inicio time     NOT NULL,
  hora_fin    time     NOT NULL,
  CONSTRAINT horarios_dia_valido   CHECK (dia_semana BETWEEN 0 AND 6),
  CONSTRAINT horarios_rango_valido CHECK (hora_fin > hora_inicio),
  -- Evita tramos que se solapan el mismo día. Se proyecta cada tramo sobre una semana
  -- de referencia (2000-01-02 fue domingo) para poder comparar rangos.
  CONSTRAINT horarios_sin_traslape EXCLUDE USING gist (
    tsrange(('2000-01-02'::date + dia_semana) + hora_inicio,
            ('2000-01-02'::date + dia_semana) + hora_fin) WITH &&
  )
);

-- Bloqueos puntuales: vacaciones, feriados, trámites, etc.
CREATE TABLE bloqueos_horario (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inicio    timestamptz NOT NULL,
  fin       timestamptz NOT NULL,
  motivo    text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bloqueos_rango_valido CHECK (fin > inicio)
);

CREATE INDEX bloqueos_horario_rango ON bloqueos_horario USING gist (tstzrange(inicio, fin));

-- Down Migration

DROP TABLE bloqueos_horario;
DROP TABLE horarios;
