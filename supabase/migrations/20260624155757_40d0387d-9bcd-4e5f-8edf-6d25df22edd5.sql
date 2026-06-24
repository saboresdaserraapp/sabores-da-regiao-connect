ALTER TABLE public.signup_invite_dismissals
  ADD COLUMN IF NOT EXISTS campaign text NOT NULL DEFAULT 'post_delivery_invite';

CREATE INDEX IF NOT EXISTS idx_signup_invite_dismissals_campaign
  ON public.signup_invite_dismissals(campaign);