
-- =========================================================
-- ORDER CONFIRMATION PROPOSALS
-- =========================================================

CREATE TABLE IF NOT EXISTS public.order_confirmation_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  proposed_subtotal numeric(10,2),
  proposed_delivery_fee numeric(10,2),
  proposed_discount numeric(10,2),
  proposed_extra_fee numeric(10,2),
  proposed_total numeric(10,2),
  estimated_preparation_time_min integer,
  estimated_delivery_time_min integer,
  business_note text,
  customer_response_note text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','accepted','rejected','canceled','expired','superseded')),
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  canceled_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_proposals_order ON public.order_confirmation_proposals(order_id);
CREATE INDEX IF NOT EXISTS idx_order_proposals_estab ON public.order_confirmation_proposals(establishment_id);
CREATE INDEX IF NOT EXISTS idx_order_proposals_status ON public.order_confirmation_proposals(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_confirmation_proposals TO authenticated;
GRANT ALL ON public.order_confirmation_proposals TO service_role;

ALTER TABLE public.order_confirmation_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estab members manage proposals"
  ON public.order_confirmation_proposals FOR ALL
  TO authenticated
  USING (
    public.user_role_in_establishment(auth.uid(), establishment_id) IS NOT NULL
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.user_role_in_establishment(auth.uid(), establishment_id) IS NOT NULL
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Order owner can view own proposals"
  ON public.order_confirmation_proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_order_proposals_updated
  BEFORE UPDATE ON public.order_confirmation_proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- supersede previous active proposals when a new one is sent
CREATE OR REPLACE FUNCTION public.supersede_previous_proposals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'sent' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'sent') THEN
    UPDATE public.order_confirmation_proposals
       SET status = 'superseded', updated_at = now()
     WHERE order_id = NEW.order_id
       AND id <> NEW.id
       AND status = 'sent';
    UPDATE public.orders
       SET current_confirmation_proposal_id = NEW.id,
           confirmation_flow_status = 'proposal_sent_to_customer'
     WHERE id = NEW.order_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_supersede_proposals
  AFTER INSERT OR UPDATE OF status ON public.order_confirmation_proposals
  FOR EACH ROW EXECUTE FUNCTION public.supersede_previous_proposals();

-- =========================================================
-- ORDERS: novos campos (todos nullable, fallback seguro)
-- =========================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS final_subtotal numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_discount numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_extra_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS final_delivery_fee numeric(10,2),
  ADD COLUMN IF NOT EXISTS business_confirmation_note text,
  ADD COLUMN IF NOT EXISTS customer_accepted_proposal_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_rejected_proposal_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS current_confirmation_proposal_id uuid
    REFERENCES public.order_confirmation_proposals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmation_flow_status text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- =========================================================
-- RPCs para aceite/recusa pelo cliente
-- =========================================================

CREATE OR REPLACE FUNCTION public.accept_order_proposal(_proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
  VALUES (v_proposal.order_id, 'waiting_business_confirmation', 'confirmed_by_business',
          auth.uid(), 'Cliente aceitou a proposta');

  INSERT INTO public.order_messages (order_id, establishment_id, sender_type, sender_user_id, message)
  VALUES (v_proposal.order_id, v_proposal.establishment_id, 'system', auth.uid(),
          'Cliente aceitou a proposta. Pedido confirmado.');

  RETURN jsonb_build_object('ok', true, 'proposal_id', _proposal_id);
END $$;

CREATE OR REPLACE FUNCTION public.reject_order_proposal(_proposal_id uuid, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.order_messages (order_id, establishment_id, sender_type, sender_user_id, message)
  VALUES (v_proposal.order_id, v_proposal.establishment_id, 'system', auth.uid(),
          'Cliente recusou a proposta.' ||
          CASE WHEN _note IS NOT NULL AND length(trim(_note)) > 0
               THEN ' Observação: ' || _note ELSE '' END);

  RETURN jsonb_build_object('ok', true, 'proposal_id', _proposal_id);
END $$;

GRANT EXECUTE ON FUNCTION public.accept_order_proposal(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_order_proposal(uuid, text) TO authenticated;

-- enable realtime for proposals
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_confirmation_proposals;
