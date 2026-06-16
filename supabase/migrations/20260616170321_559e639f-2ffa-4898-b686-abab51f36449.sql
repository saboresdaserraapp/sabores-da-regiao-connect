
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS payment_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_received_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_note TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_estab_status_created 
  ON public.orders(establishment_id, status, created_at DESC);
