-- Runs via `insforge db migrations up` AFTER `auth:migrate` has created the
-- four BA tables in `better_auth`. This file installs the bridge
-- infrastructure only — no demo tables. Add your own tables + RLS policies
-- that key off `public.requesting_user_id()` (see README for the pattern)
-- in subsequent `insforge db migrations new <name>` files.

-- pgcrypto so user-defined tables can use `gen_random_uuid()` for PKs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper: extract the `sub` claim from request.jwt.claims so RLS policies
-- written as `user_id = public.requesting_user_id()` work for BA-bridged JWTs.
-- (InsForge's db-init grants USAGE on `public` and default privileges on
-- new tables to `authenticated` already, so no explicit GRANTs needed
-- here for tables you create later.)
CREATE OR REPLACE FUNCTION public.requesting_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text
$$;
