-- ============================================================
-- Kasb DB Init — run ONCE as superuser (postgres) before
-- the first Drizzle migration.
-- Creates the limited kasb_app role used at runtime.
-- The migration/admin user retains DDL rights.
-- ============================================================

-- 1. Create the runtime app role (no superuser, no createdb)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kasb_app') THEN
    CREATE ROLE kasb_app WITH LOGIN PASSWORD 'changeme_in_prod';
  END IF;
END;
$$;

-- 2. Connect + schema access
GRANT CONNECT ON DATABASE kasb TO kasb_app;
GRANT USAGE ON SCHEMA public TO kasb_app;

-- 3. DML on tables that already exist (re-run after migrations)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO kasb_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kasb_app;

-- 4. DML on future tables created by migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kasb_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO kasb_app;
