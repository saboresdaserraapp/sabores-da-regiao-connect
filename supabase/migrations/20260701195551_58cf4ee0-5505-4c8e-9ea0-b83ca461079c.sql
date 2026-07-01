
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS channel_hours jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.hours_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  week jsonb NOT NULL DEFAULT '{}'::jsonb,
  channel_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  special_hours jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hours_templates TO authenticated;
GRANT ALL ON public.hours_templates TO service_role;

ALTER TABLE public.hours_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own hours templates" ON public.hours_templates;
CREATE POLICY "Users manage their own hours templates"
  ON public.hours_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hours_templates_set_updated_at ON public.hours_templates;
CREATE TRIGGER hours_templates_set_updated_at
  BEFORE UPDATE ON public.hours_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS hours_templates_user_id_idx ON public.hours_templates(user_id);
