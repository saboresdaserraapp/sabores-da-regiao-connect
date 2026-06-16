
CREATE OR REPLACE FUNCTION public.accept_order_proposal(_proposal_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal public.order_confirmation_proposals%ROWTYPE;
  v_order_user uuid;
BEGIN
  SELECT * INTO v_proposal FROM public.order_confirmation_proposals WHERE id = _proposal_id;
  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = '42704';
  END IF;
  IF v_proposal.status <> 'sent' THEN
    RAISE EXCEPTION 'Proposta não está ativa' USING ERRCODE = '22023';
  END IF;

  SELECT user_id INTO v_order_user FROM public.orders WHERE id = v_proposal.order_id;
  IF v_order_user IS NULL OR v_order_user <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
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
            auth.uid(), 'Cliente aceitou a proposta');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'order_status_history insert failed: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.order_messages (order_id, establishment_id, sender_type, sender_user_id, message)
    VALUES (v_proposal.order_id, v_proposal.establishment_id, 'system', auth.uid(),
            'Cliente aceitou a proposta. Pedido confirmado.');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'order_messages insert failed: %', SQLERRM;
  END;

  RETURN jsonb_build_object('ok', true, 'proposal_id', _proposal_id);
END $function$;

CREATE OR REPLACE FUNCTION public.reject_order_proposal(_proposal_id uuid, _note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_proposal public.order_confirmation_proposals%ROWTYPE;
  v_order_user uuid;
BEGIN
  SELECT * INTO v_proposal FROM public.order_confirmation_proposals WHERE id = _proposal_id;
  IF v_proposal.id IS NULL THEN
    RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = '42704';
  END IF;
  IF v_proposal.status <> 'sent' THEN
    RAISE EXCEPTION 'Proposta não está ativa' USING ERRCODE = '22023';
  END IF;

  SELECT user_id INTO v_order_user FROM public.orders WHERE id = v_proposal.order_id;
  IF v_order_user IS NULL OR v_order_user <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.order_confirmation_proposals
     SET status = 'rejected',
         rejected_at = now(),
         customer_response_note = COALESCE(_note, customer_response_note),
         updated_at = now()
   WHERE id = _proposal_id;

  UPDATE public.orders
     SET customer_rejected_proposal_at = now(),
         confirmation_flow_status = 'customer_rejected'
   WHERE id = v_proposal.order_id;

  BEGIN
    INSERT INTO public.order_messages (order_id, establishment_id, sender_type, sender_user_id, message)
    VALUES (v_proposal.order_id, v_proposal.establishment_id, 'system', auth.uid(),
            'Cliente recusou a proposta.' ||
            CASE WHEN _note IS NOT NULL AND length(trim(_note)) > 0
                 THEN ' Observação: ' || _note ELSE '' END);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'order_messages insert failed: %', SQLERRM;
  END;

  RETURN jsonb_build_object('ok', true, 'proposal_id', _proposal_id);
END $function$;
