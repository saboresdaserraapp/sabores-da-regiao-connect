
CREATE OR REPLACE FUNCTION public.handle_new_order_message_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipient_id uuid;
  v_order_user_id uuid;
  v_owner_id uuid;
  v_tracking text;
  v_title text;
  v_msg text;
BEGIN
  SELECT user_id, tracking_code INTO v_order_user_id, v_tracking FROM public.orders WHERE id = NEW.order_id;
  IF NEW.sender_type = 'customer' THEN
    SELECT owner_id INTO v_owner_id FROM public.establishments WHERE id = NEW.establishment_id;
    v_recipient_id := v_owner_id;
    v_title := 'Nova mensagem - Pedido ' || COALESCE(v_tracking,'');
    v_msg := substring(NEW.message FROM 1 FOR 100);
  ELSIF NEW.sender_type = 'business' THEN
    v_recipient_id := v_order_user_id;
    v_title := 'Nova mensagem sobre seu pedido';
    v_msg := 'A loja enviou uma mensagem sobre seu pedido.';
  ELSE
    RETURN NEW; -- system messages: no notification
  END IF;

  IF v_recipient_id IS NOT NULL
     AND v_recipient_id <> COALESCE(NEW.sender_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND NEW.order_id IS NOT NULL
     AND length(trim(COALESCE(NEW.message,''))) > 0 THEN
    PERFORM public.create_notification(
      v_recipient_id,
      v_title,
      v_msg,
      'order_chat_message',
      jsonb_build_object('order_id', NEW.order_id, 'message_id', NEW.id),
      NEW.establishment_id,
      NEW.order_id, NULL, NULL
    );
  END IF;
  RETURN NEW;
END $$;
