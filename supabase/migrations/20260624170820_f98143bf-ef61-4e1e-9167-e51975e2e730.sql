
-- Idempotent resend tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS whatsapp_resent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_whatsapp_sent_at timestamptz;

-- RPC: register a WhatsApp resend without duplicating events
CREATE OR REPLACE FUNCTION public.register_whatsapp_resend(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_count integer;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  UPDATE public.orders
     SET whatsapp_resent_count = whatsapp_resent_count + 1,
         last_whatsapp_sent_at = now()
   WHERE tracking_code = _code
   RETURNING id, whatsapp_resent_count INTO v_id, v_count;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  RETURN jsonb_build_object('ok', true, 'order_id', v_id, 'resent_count', v_count);
END $$;

GRANT EXECUTE ON FUNCTION public.register_whatsapp_resend(text) TO anon, authenticated;

-- RPC: public timeline events (status_history + system messages)
CREATE OR REPLACE FUNCTION public.get_order_public_events(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_history jsonb;
  v_messages jsonb;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT id, COALESCE(status_history, '[]'::jsonb)
    INTO v_order_id, v_history
    FROM public.orders
   WHERE tracking_code = _code
   LIMIT 1;

  IF v_order_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'kind', 'system_message',
           'at', created_at,
           'message', message
         ) ORDER BY created_at), '[]'::jsonb)
    INTO v_messages
    FROM public.order_messages
   WHERE order_id = v_order_id
     AND sender_type = 'system';

  RETURN jsonb_build_object(
    'status_history', v_history,
    'system_messages', v_messages
  );
END $$;

GRANT EXECUTE ON FUNCTION public.get_order_public_events(text) TO anon, authenticated;
