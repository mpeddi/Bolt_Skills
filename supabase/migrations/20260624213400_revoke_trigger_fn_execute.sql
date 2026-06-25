-- Superseded by 20260624213301_fix_security_issues.sql which switches
-- update_updated_at to SECURITY INVOKER and revokes all execute grants.
REVOKE ALL ON FUNCTION public.update_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM anon;
REVOKE ALL ON FUNCTION public.update_updated_at() FROM authenticated;
