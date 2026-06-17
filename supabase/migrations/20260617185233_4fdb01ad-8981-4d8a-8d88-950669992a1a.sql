
-- Notify customer when establishment sends a proposal
CREATE OR REPLACE FUNCTION public.handle_proposal_sent_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid;
  v_tracking text;
BEGIN
  IF NEW.status = 'sent' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'sent') THEN
    SELECT user_id, tracking_code INTO v_user, v_tracking FROM public.orders WHERE id = NEW.order_id;
    IF v_user IS NOT NULL THEN
      PERFORM public.create_notification(
        v_user,
        'Confirme o valor final da entrega',
        'O estabelecimento revisou a taxa de entrega do seu pedido ' || COALESCE(v_tracking,'') || '. Confira e aceite para o pedido prosseguir.',
        'order_delivery_fee_proposal',
        jsonb_build_object('order_id', NEW.order_id, 'proposal_id', NEW.id),
        NEW.establishment_id,
        NEW.order_id, NULL, NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proposal_sent_notification ON public.order_confirmation_proposals;
CREATE TRIGGER trg_proposal_sent_notification
AFTER INSERT OR UPDATE ON public.order_confirmation_proposals
FOR EACH ROW EXECUTE FUNCTION public.handle_proposal_sent_notification();

-- Notify establishment owner when customer accepts/rejects
CREATE OR REPLACE FUNCTION public.handle_proposal_response_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_tracking text;
  v_title text;
  v_msg text;
  v_type text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('accepted','rejected') THEN
    SELECT owner_id INTO v_owner FROM public.establishments WHERE id = NEW.establishment_id;
    SELECT tracking_code INTO v_tracking FROM public.orders WHERE id = NEW.order_id;
    IF v_owner IS NOT NULL THEN
      IF NEW.status = 'accepted' THEN
        v_type := 'order_delivery_fee_accepted';
        v_title := 'Cliente aceitou a proposta';
        v_msg := 'Cliente confirmou o valor final do pedido ' || COALESCE(v_tracking,'') || '.';
      ELSE
        v_type := 'order_delivery_fee_rejected';
        v_title := 'Cliente recusou a proposta';
        v_msg := 'Cliente recusou o valor proposto do pedido ' || COALESCE(v_tracking,'') || '.';
      END IF;
      PERFORM public.create_notification(
        v_owner, v_title, v_msg, v_type,
        jsonb_build_object('order_id', NEW.order_id, 'proposal_id', NEW.id),
        NEW.establishment_id,
        NEW.order_id, NULL, NULL
      );
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proposal_response_notification ON public.order_confirmation_proposals;
CREATE TRIGGER trg_proposal_response_notification
AFTER UPDATE ON public.order_confirmation_proposals
FOR EACH ROW EXECUTE FUNCTION public.handle_proposal_response_notification();

-- Enable realtime on notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
