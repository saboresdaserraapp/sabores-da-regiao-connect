
CREATE OR REPLACE FUNCTION public.handle_order_status_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_msg text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  v_msg := CASE NEW.status::text
    WHEN 'canceled_by_business' THEN 'Pedido cancelado pela loja.'
    WHEN 'canceled_by_customer' THEN 'Pedido cancelado pelo cliente.'
    WHEN 'out_for_delivery' THEN 'Pedido saiu para entrega.'
    WHEN 'delivered' THEN 'Pedido entregue.'
    WHEN 'needs_more_reference' THEN 'Loja solicitou mais informações ou referência para entrega.'
    ELSE NULL
  END;
  IF v_msg IS NULL THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.order_messages (order_id, establishment_id, sender_type, message)
    VALUES (NEW.id, NEW.establishment_id, 'system', v_msg);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'order_messages system insert failed: %', SQLERRM;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_order_status_chat_message ON public.orders;
CREATE TRIGGER trg_order_status_chat_message
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_chat_message();
