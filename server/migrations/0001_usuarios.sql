-- Up Migration

-- Función compartida: mantiene actualizado_en al día en cada UPDATE.
CREATE FUNCTION set_actualizado_en() RETURNS trigger AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Administrador de la app (el dueño). Se deja como tabla por si en el futuro entra alguien más.
CREATE TABLE usuarios (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre         text        NOT NULL,
  email          text        NOT NULL,
  password_hash  text        NOT NULL,
  activo         boolean     NOT NULL DEFAULT true,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_email_formato CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE UNIQUE INDEX usuarios_email_unico ON usuarios (lower(email));

CREATE TRIGGER usuarios_actualizado_en BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- Down Migration

DROP TABLE usuarios;
DROP FUNCTION set_actualizado_en();
