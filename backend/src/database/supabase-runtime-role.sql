-- Run once in the Supabase SQL Editor as the database owner.
-- Replace the placeholder with a long, unique password before execution.
CREATE ROLE sismarket_runtime
  LOGIN PASSWORD 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;

GRANT CONNECT ON DATABASE postgres TO sismarket_runtime;
GRANT USAGE ON SCHEMA public TO sismarket_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sismarket_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sismarket_runtime;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO sismarket_runtime;

-- Migrations are owned by postgres; preserve runtime access to tables created later.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sismarket_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO sismarket_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO sismarket_runtime;
