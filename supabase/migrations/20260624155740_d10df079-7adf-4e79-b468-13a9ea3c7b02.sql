ALTER TABLE public.signup_invite_dismissals
  DROP CONSTRAINT IF EXISTS signup_invite_dismissals_tracking_code_key;

CREATE INDEX IF NOT EXISTS idx_signup_invite_dismissals_source
  ON public.signup_invite_dismissals(source);
CREATE INDEX IF NOT EXISTS idx_signup_invite_dismissals_dismissed_at
  ON public.signup_invite_dismissals(dismissed_at DESC);