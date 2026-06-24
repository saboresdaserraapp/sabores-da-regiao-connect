
-- 1) whatsapp_send_logs
CREATE TABLE public.whatsapp_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  tracking_code text,
  whatsapp_message text,
  kind text NOT NULL DEFAULT 'resend' CHECK (kind IN ('initial','resend')),
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_logs_order ON public.whatsapp_send_logs(order_id, sent_at DESC);
CREATE INDEX idx_wa_logs_estab ON public.whatsapp_send_logs(establishment_id, sent_at DESC);

GRANT SELECT, INSERT ON public.whatsapp_send_logs TO authenticated;
GRANT ALL ON public.whatsapp_send_logs TO service_role;

ALTER TABLE public.whatsapp_send_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estab members can view wa logs"
  ON public.whatsapp_send_logs FOR SELECT TO authenticated
  USING (public.user_role_in_establishment(auth.uid(), establishment_id) IS NOT NULL
         OR public.is_admin(auth.uid()));

-- Inserts são feitos via SECURITY DEFINER RPCs; sem policy de insert pública.

-- 2) coluna em orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS availability_confirmed_at timestamptz;

-- 3) RPC log_whatsapp_send (initial / resend) idempotente por kind+order
CREATE OR REPLACE FUNCTION public.log_whatsapp_send(_code text, _message text, _kind text DEFAULT 'resend')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_existing uuid;
BEGIN
  IF _code IS NULL THEN RETURN jsonb_build_object('ok',false,'error','invalid_code'); END IF;
  IF _kind NOT IN ('initial','resend') THEN _kind := 'resend'; END IF;

  SELECT * INTO v_order FROM public.orders WHERE tracking_code = _code LIMIT 1;
  IF v_order.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;

  -- idempotência: 'initial' só uma vez por pedido
  IF _kind = 'initial' THEN
    SELECT id INTO v_existing FROM public.whatsapp_send_logs
      WHERE order_id = v_order.id AND kind = 'initial' LIMIT 1;
    IF v_existing IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'duplicated', true, 'log_id', v_existing);
    END IF;
  END IF;

  INSERT INTO public.whatsapp_send_logs(order_id, establishment_id, tracking_code, whatsapp_message, kind, sent_by)
  VALUES (v_order.id, v_order.establishment_id, _code, _message, _kind, auth.uid())
  RETURNING id INTO v_existing;

  RETURN jsonb_build_object('ok', true, 'log_id', v_existing);
END $$;

-- 4) register_whatsapp_resend agora grava log também
CREATE OR REPLACE FUNCTION public.register_whatsapp_resend(_code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_count integer; v_estab uuid; v_msg text;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  UPDATE public.orders
     SET whatsapp_resent_count = whatsapp_resent_count + 1,
         last_whatsapp_sent_at = now()
   WHERE tracking_code = _code
   RETURNING id, whatsapp_resent_count, establishment_id, whatsapp_message
     INTO v_id, v_count, v_estab, v_msg;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  INSERT INTO public.whatsapp_send_logs(order_id, establishment_id, tracking_code, whatsapp_message, kind, sent_by)
  VALUES (v_id, v_estab, _code, v_msg, 'resend', auth.uid());

  RETURN jsonb_build_object('ok', true, 'order_id', v_id, 'resent_count', v_count);
END $$;

-- 5) Cliente cancela pedido (até sair para entrega)
CREATE OR REPLACE FUNCTION public.customer_cancel_order(_code text, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE tracking_code = _code LIMIT 1;
  IF v_order.id IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado' USING ERRCODE='42704'; END IF;

  -- Permite anônimo (pedido sem user_id) ou o próprio dono
  IF v_order.user_id IS NOT NULL AND v_order.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501';
  END IF;

  IF v_order.status::text NOT IN ('waiting_business_confirmation','confirmed_by_business','preparing','ready_for_pickup') THEN
    RAISE EXCEPTION 'Não é mais possível cancelar este pedido' USING ERRCODE='22023';
  END IF;

  UPDATE public.orders
     SET status = 'canceled_by_customer'::order_status,
         status_history = COALESCE(status_history,'[]'::jsonb) ||
           jsonb_build_array(jsonb_build_object(
             'status','canceled_by_customer','at', now(),'by','customer',
             'reason', COALESCE(_reason,'')))
   WHERE id = v_order.id;

  INSERT INTO public.order_messages(order_id, establishment_id, sender_type, message)
  VALUES (v_order.id, v_order.establishment_id, 'system',
          'Pedido cancelado pelo cliente.' ||
          CASE WHEN _reason IS NOT NULL AND length(trim(_reason))>0
               THEN ' Motivo: ' || _reason ELSE '' END);

  RETURN jsonb_build_object('ok', true);
END $$;

-- 6) Confirmações da loja (3 botões) — idempotentes
CREATE OR REPLACE FUNCTION public._assert_estab_member(_order_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_estab uuid;
BEGIN
  SELECT establishment_id INTO v_estab FROM public.orders WHERE id = _order_id;
  IF v_estab IS NULL THEN RAISE EXCEPTION 'Pedido não encontrado' USING ERRCODE='42704'; END IF;
  IF public.user_role_in_establishment(auth.uid(), v_estab) IS NULL
     AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501';
  END IF;
  RETURN v_estab;
END $$;

CREATE OR REPLACE FUNCTION public.mark_order_availability(_order_id uuid, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_estab uuid; v_existing timestamptz;
BEGIN
  v_estab := public._assert_estab_member(_order_id);
  SELECT availability_confirmed_at INTO v_existing FROM public.orders WHERE id = _order_id;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'duplicated', true);
  END IF;
  UPDATE public.orders SET availability_confirmed_at = now() WHERE id = _order_id;
  INSERT INTO public.order_messages(order_id, establishment_id, sender_type, message)
  VALUES (_order_id, v_estab, 'system',
          'Loja confirmou disponibilidade do pedido.' ||
          CASE WHEN _note IS NOT NULL AND length(trim(_note))>0
               THEN ' Observação: ' || _note ELSE '' END);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.mark_order_eta(_order_id uuid, _minutes integer, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_estab uuid; v_current integer;
BEGIN
  v_estab := public._assert_estab_member(_order_id);
  IF _minutes IS NULL OR _minutes <= 0 THEN
    RAISE EXCEPTION 'Prazo inválido' USING ERRCODE='22023';
  END IF;
  SELECT estimated_minutes INTO v_current FROM public.orders WHERE id = _order_id;
  IF v_current IS NOT DISTINCT FROM _minutes THEN
    RETURN jsonb_build_object('ok', true, 'duplicated', true);
  END IF;
  UPDATE public.orders SET estimated_minutes = _minutes WHERE id = _order_id;
  INSERT INTO public.order_messages(order_id, establishment_id, sender_type, message)
  VALUES (_order_id, v_estab, 'system',
          'Loja informou prazo estimado: ~' || _minutes || ' min.' ||
          CASE WHEN _note IS NOT NULL AND length(trim(_note))>0
               THEN ' ' || _note ELSE '' END);
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.mark_order_final_value(_order_id uuid, _total numeric, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_estab uuid; v_current numeric;
BEGIN
  v_estab := public._assert_estab_member(_order_id);
  IF _total IS NULL OR _total < 0 THEN
    RAISE EXCEPTION 'Valor inválido' USING ERRCODE='22023';
  END IF;
  SELECT final_total INTO v_current FROM public.orders WHERE id = _order_id;
  IF v_current IS NOT DISTINCT FROM _total THEN
    RETURN jsonb_build_object('ok', true, 'duplicated', true);
  END IF;
  UPDATE public.orders SET final_total = _total WHERE id = _order_id;
  INSERT INTO public.order_messages(order_id, establishment_id, sender_type, message)
  VALUES (_order_id, v_estab, 'system',
          'Loja informou valor final: R$ ' || to_char(_total, 'FM999G990D00') || '.' ||
          CASE WHEN _note IS NOT NULL AND length(trim(_note))>0
               THEN ' ' || _note ELSE '' END);
  RETURN jsonb_build_object('ok', true);
END $$;

-- 7) get_order_public_events agora retorna prazo/valor atual
CREATE OR REPLACE FUNCTION public.get_order_public_events(_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id uuid;
  v_history jsonb;
  v_messages jsonb;
  v_eta integer;
  v_total numeric;
  v_avail timestamptz;
  v_status text;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN RETURN '{}'::jsonb; END IF;

  SELECT id, COALESCE(status_history,'[]'::jsonb), estimated_minutes, final_total,
         availability_confirmed_at, status::text
    INTO v_order_id, v_history, v_eta, v_total, v_avail, v_status
    FROM public.orders WHERE tracking_code = _code LIMIT 1;

  IF v_order_id IS NULL THEN RETURN '{}'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'kind','system_message','at',created_at,'message',message) ORDER BY created_at), '[]'::jsonb)
    INTO v_messages
    FROM public.order_messages
    WHERE order_id = v_order_id AND sender_type = 'system';

  RETURN jsonb_build_object(
    'status_history', v_history,
    'system_messages', v_messages,
    'estimated_minutes', v_eta,
    'final_total', v_total,
    'availability_confirmed_at', v_avail,
    'current_status', v_status
  );
END $$;
