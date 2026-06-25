
-- 1) Buscar a proposta ativa de um pedido pelo tracking_code (sem login)
CREATE OR REPLACE FUNCTION public.get_active_proposal_by_tracking(_code text)
RETURNS SETOF public.order_confirmation_proposals
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.*
  FROM public.order_confirmation_proposals p
  JOIN public.orders o ON o.id = p.order_id
  WHERE o.tracking_code = _code
    AND p.status IN ('sent','accepted')
  ORDER BY p.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_proposal_by_tracking(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_proposal_by_tracking(text) TO anon, authenticated, service_role;

-- 2) Aceitar a proposta como visitante (validando tracking_code)
CREATE OR REPLACE FUNCTION public.accept_order_proposal_by_tracking(_code text, _proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_proposal public.order_confirmation_proposals%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_proposal FROM public.order_confirmation_proposals WHERE id = _proposal_id;
  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = '42704';
  END IF;
  IF v_proposal.status <> 'sent' THEN
    RAISE EXCEPTION 'Proposta não está ativa' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_proposal.order_id;
  IF v_order.id IS NULL OR v_order.tracking_code IS NULL OR v_order.tracking_code <> _code THEN
    RAISE EXCEPTION 'Código de pedido inválido' USING ERRCODE = '42501';
  END IF;

  UPDATE public.order_confirmation_proposals
     SET status = 'accepted', accepted_at = now(), updated_at = now()
   WHERE id = _proposal_id;

  UPDATE public.orders
     SET final_subtotal     = COALESCE(v_proposal.proposed_subtotal, final_subtotal, subtotal),
         final_delivery_fee = COALESCE(v_proposal.proposed_delivery_fee, final_delivery_fee, delivery_fee),
         final_discount     = COALESCE(v_proposal.proposed_discount, final_discount),
         final_extra_fee    = COALESCE(v_proposal.proposed_extra_fee, final_extra_fee),
         final_total        = COALESCE(v_proposal.proposed_total, final_total, total),
         business_confirmation_note = COALESCE(v_proposal.business_note, business_confirmation_note),
         customer_accepted_proposal_at = now(),
         confirmed_at = now(),
         confirmation_flow_status = 'customer_accepted',
         status = 'confirmed_by_business'::order_status
   WHERE id = v_proposal.order_id;

  BEGIN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, created_by, note)
    VALUES (v_proposal.order_id, 'waiting_business_confirmation', 'confirmed_by_business',
            NULL, 'Cliente (visitante) aceitou a proposta');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'order_status_history insert failed: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.order_messages (order_id, establishment_id, sender_type, sender_user_id, message)
    VALUES (v_proposal.order_id, v_proposal.establishment_id, 'system', NULL,
            'Cliente aceitou a proposta. Pedido confirmado.');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'order_messages insert failed: %', SQLERRM;
  END;

  RETURN jsonb_build_object('ok', true, 'proposal_id', _proposal_id);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_order_proposal_by_tracking(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_order_proposal_by_tracking(text, uuid) TO anon, authenticated, service_role;

-- 3) Recusar a proposta como visitante
CREATE OR REPLACE FUNCTION public.reject_order_proposal_by_tracking(_code text, _proposal_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_proposal public.order_confirmation_proposals%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  SELECT * INTO v_proposal FROM public.order_confirmation_proposals WHERE id = _proposal_id;
  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = '42704';
  END IF;
  IF v_proposal.status <> 'sent' THEN
    RAISE EXCEPTION 'Proposta não está ativa' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_proposal.order_id;
  IF v_order.id IS NULL OR v_order.tracking_code IS NULL OR v_order.tracking_code <> _code THEN
    RAISE EXCEPTION 'Código de pedido inválido' USING ERRCODE = '42501';
  END IF;

  UPDATE public.order_confirmation_proposals
     SET status = 'rejected', rejected_at = now(), updated_at = now(),
         customer_response_note = _note
   WHERE id = _proposal_id;

  BEGIN
    INSERT INTO public.order_messages (order_id, establishment_id, sender_type, sender_user_id, message)
    VALUES (v_proposal.order_id, v_proposal.establishment_id, 'system', NULL,
            'Cliente recusou a proposta.' || COALESCE(' Observação: ' || _note, ''));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'order_messages insert failed: %', SQLERRM;
  END;

  RETURN jsonb_build_object('ok', true, 'proposal_id', _proposal_id);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_order_proposal_by_tracking(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_order_proposal_by_tracking(text, uuid, text) TO anon, authenticated, service_role;

-- 4) Enviar mensagem de chat como visitante (somente enquanto o pedido está ativo)
CREATE OR REPLACE FUNCTION public.send_order_message_by_tracking(_code text, _message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_msg_id uuid;
BEGIN
  IF _message IS NULL OR length(btrim(_message)) = 0 THEN
    RAISE EXCEPTION 'Mensagem vazia' USING ERRCODE = '22023';
  END IF;
  IF length(_message) > 2000 THEN
    RAISE EXCEPTION 'Mensagem muito longa' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE tracking_code = _code;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado' USING ERRCODE = '42704';
  END IF;
  IF v_order.status::text IN ('delivered','canceled_by_customer','canceled_by_business','not_completed') THEN
    RAISE EXCEPTION 'Pedido encerrado' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.order_messages (order_id, establishment_id, sender_type, sender_user_id, message)
  VALUES (v_order.id, v_order.establishment_id, 'customer', NULL, btrim(_message))
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object('ok', true, 'message_id', v_msg_id);
END;
$$;

REVOKE ALL ON FUNCTION public.send_order_message_by_tracking(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_order_message_by_tracking(text, text) TO anon, authenticated, service_role;
