/*
# Add slug column to bolt_skills

1. Modified Tables
- `bolt_skills`: adds `slug` (text, unique, not null) as a stable identifier
  used for client-side selection and URL-safe references.
*/

ALTER TABLE bolt_skills ADD COLUMN IF NOT EXISTS slug text;
UPDATE bolt_skills SET slug = lower(regexp_replace(name, '\s+', '-', 'g')) WHERE slug IS NULL;
ALTER TABLE bolt_skills ALTER COLUMN slug SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE tablename = 'bolt_skills' AND indexname = 'bolt_skills_slug_key'
  ) THEN
    ALTER TABLE bolt_skills ADD CONSTRAINT bolt_skills_slug_key UNIQUE (slug);
  END IF;
END $$;
