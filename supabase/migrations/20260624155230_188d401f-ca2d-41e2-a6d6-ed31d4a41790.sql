CREATE TABLE public.signup_invite_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_code text NOT NULL UNIQUE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  source text
);

GRANT SELECT, INSERT ON public.signup_invite_dismissals TO anon, authenticated;
GRANT ALL ON public.signup_invite_dismissals TO service_role;

ALTER TABLE public.signup_invite_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read invite dismissals"
  ON public.signup_invite_dismissals
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can insert invite dismissals"
  ON public.signup_invite_dismissals
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (tracking_code IS NOT NULL AND length(tracking_code) BETWEEN 4 AND 32);

CREATE INDEX idx_signup_invite_dismissals_tracking ON public.signup_invite_dismissals(tracking_code);