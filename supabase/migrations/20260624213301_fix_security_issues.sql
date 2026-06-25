
-- Fix mutable search_path; use SECURITY INVOKER so the function never runs
-- with elevated privileges, and revoke all direct-call access from public roles.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY INVOKER
   SET search_path = '';

REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM authenticated;

-- Drop always-true write policies on bolt_skills.
-- bolt_skills is a system table written only via service_role (which bypasses RLS).
-- Authenticated users (browser clients) have no business mutating skill definitions.
DROP POLICY IF EXISTS "insert_skills" ON bolt_skills;
DROP POLICY IF EXISTS "update_skills" ON bolt_skills;
DROP POLICY IF EXISTS "delete_skills" ON bolt_skills;
