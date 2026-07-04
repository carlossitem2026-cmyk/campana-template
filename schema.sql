-- ============================================================
--  SCHEMA COMPLETO — Sistema de Gestión de Votantes
-- ============================================================

-- ─── EXTENSIONES ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLA: equipo ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipo (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre      TEXT        NOT NULL,
  telefono    TEXT,
  zona        TEXT,
  rol         TEXT        DEFAULT 'coordinador',
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLA: profiles ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID        PRIMARY KEY,
  user_id     UUID        UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  equipo_id   UUID        REFERENCES equipo(id) ON DELETE SET NULL,
  nombre      TEXT,
  rol         TEXT        DEFAULT 'coordinador',
  telefono    TEXT,
  zona        TEXT,
  activo      BOOLEAN     DEFAULT true
);

-- ─── TABLA: votantes ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votantes (
  id                  UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre              TEXT        NOT NULL,
  apellido            TEXT        NOT NULL,
  cedula              TEXT,
  cedula_limpia       TEXT,
  orden               TEXT,
  mesa                TEXT,
  local_votacion      TEXT,
  seccional           TEXT,
  barrio              TEXT,
  fecha_nacimiento    TEXT,
  telefono            TEXT,
  observacion         TEXT,
  ha_votado           BOOLEAN     DEFAULT FALSE,
  por_parte_de_nombre TEXT,
  equipo_id           UUID        REFERENCES equipo(id) ON DELETE SET NULL,
  user_id             UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TABLA: padron_importado ─────────────────────────────────
CREATE TABLE IF NOT EXISTS padron_importado (
  id              UUID  DEFAULT uuid_generate_v4() PRIMARY KEY,
  cedula          TEXT,
  cedula_limpia   TEXT,
  nombre          TEXT,
  apellido        TEXT,
  mesa            TEXT,
  orden           TEXT,
  seccional       TEXT,
  local_votacion  TEXT,
  fecha_nacimiento TEXT
);

-- ─── EXTENSIONES ADICIONALES ─────────────────────────────────
-- pg_trgm permite índices GIN para búsquedas ilike '%texto%' sin full scan
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─── ÍNDICES ─────────────────────────────────────────────────

-- Búsqueda exacta por cédula normalizada (duplicados + padrón)
CREATE INDEX IF NOT EXISTS idx_votantes_cedula_limpia       ON votantes(cedula_limpia);

-- Filtro por usuario (tab Mis Votantes) + orden cronológico inverso
-- Este índice cubre la query más frecuente del sistema
CREATE INDEX IF NOT EXISTS idx_votantes_created_by_time     ON votantes(created_by, created_at DESC);

-- Orden por fecha para Lista General (admin, sin filtro de usuario)
CREATE INDEX IF NOT EXISTS idx_votantes_created_at          ON votantes(created_at DESC);

-- Índices de trigrama para búsqueda ilike '%texto%' en Mis Votantes
-- Sin estos, PostgreSQL hace full scan aunque haya millones de filas
CREATE INDEX IF NOT EXISTS idx_votantes_nombre_trgm         ON votantes USING gin(nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_votantes_apellido_trgm       ON votantes USING gin(apellido gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_votantes_cedula_trgm         ON votantes USING gin(cedula gin_trgm_ops);

-- Índice parcial para COUNT(*) WHERE ha_votado = TRUE (Resumen Participación)
-- Solo indexa filas donde ha_votado es verdadero — muy liviano
CREATE INDEX IF NOT EXISTS idx_votantes_ha_votado           ON votantes(id) WHERE ha_votado = TRUE;

-- Índice para filtros por equipo
CREATE INDEX IF NOT EXISTS idx_votantes_equipo_id           ON votantes(equipo_id);

-- Padrón importado
CREATE INDEX IF NOT EXISTS idx_padron_cedula_limpia         ON padron_importado(cedula_limpia);
CREATE INDEX IF NOT EXISTS idx_padron_cedula_trgm           ON padron_importado USING gin(cedula gin_trgm_ops);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id             ON profiles(user_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE equipo          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE votantes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE padron_importado ENABLE ROW LEVEL SECURITY;

-- ─── FUNCIÓN HELPER: is_admin() ──────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND rol = 'administrador'
  );
$$;

-- ─── POLÍTICAS: profiles ─────────────────────────────────────
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR is_admin());

-- ─── POLÍTICAS: equipo ───────────────────────────────────────
CREATE POLICY "equipo_select" ON equipo
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "equipo_insert" ON equipo
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "equipo_update" ON equipo
  FOR UPDATE TO authenticated
  USING (is_admin());

CREATE POLICY "equipo_delete" ON equipo
  FOR DELETE TO authenticated
  USING (is_admin());

-- ─── POLÍTICAS: votantes ─────────────────────────────────────
CREATE POLICY "votantes_select" ON votantes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "votantes_insert" ON votantes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "votantes_update" ON votantes
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR is_admin());

CREATE POLICY "votantes_delete" ON votantes
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR is_admin());

-- ─── POLÍTICAS: padron_importado ─────────────────────────────
CREATE POLICY "padron_select" ON padron_importado
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "padron_insert" ON padron_importado
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- ─── FUNCIÓN: obtener_conteo_total_votantes() ────────────────
CREATE OR REPLACE FUNCTION obtener_conteo_total_votantes()
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(DISTINCT cedula_limpia)
  FROM votantes
  WHERE cedula_limpia IS NOT NULL AND cedula_limpia <> '';
$$;

-- ─── FUNCIÓN: eliminar_usuario_completo() ────────────────────
CREATE OR REPLACE FUNCTION eliminar_usuario_completo(target_equipo_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT user_id INTO target_user_id
  FROM equipo
  WHERE id = target_equipo_id;

  DELETE FROM votantes WHERE equipo_id = target_equipo_id;
  DELETE FROM profiles  WHERE equipo_id = target_equipo_id;
  DELETE FROM equipo    WHERE id        = target_equipo_id;

  IF target_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = target_user_id;
  END IF;
END;
$$;

-- ─── NOTA FINAL ──────────────────────────────────────────────
-- Después de correr este script:
-- 1. Crear el usuario administrador desde Supabase Auth (Authentication > Users > Invite)
-- 2. Insertar su perfil manualmente:
--    INSERT INTO profiles (id, user_id, nombre, rol)
--    VALUES ('[uuid-del-usuario]', '[uuid-del-usuario]', 'Nombre Admin', 'administrador');
