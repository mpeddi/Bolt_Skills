
CREATE TABLE bolt_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bolt_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_skills" ON bolt_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_skills" ON bolt_skills FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_skills" ON bolt_skills FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_skills" ON bolt_skills FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bolt_skills_updated_at
  BEFORE UPDATE ON bolt_skills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
