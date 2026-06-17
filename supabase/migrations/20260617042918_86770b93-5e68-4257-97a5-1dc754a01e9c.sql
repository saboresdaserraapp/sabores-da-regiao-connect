
-- Add related_* columns
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS related_order_id uuid,
  ADD COLUMN IF NOT EXISTS related_support_chat_id uuid,
  ADD COLUMN IF NOT EXISTS related_ticket_id uuid;

-- Extended create_notification with related ids (overload-friendly via defaults)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_data jsonb DEFAULT '{}'::jsonb,
  p_establishment_id uuid DEFAULT NULL,
  p_related_order_id uuid DEFAULT NULL,
  p_related_support_chat_id uuid DEFAULT NULL,
  p_related_ticket_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.notifications (
    user_id, title, message, type, data, establishment_id,
    related_order_id, related_support_chat_id, related_ticket_id
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_data, p_establishment_id,
    p_related_order_id, p_related_support_chat_id, p_related_ticket_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- Update order message trigger to set related_order_id
CREATE OR REPLACE FUNCTION public.handle_new_order_message_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_recipient_id uuid;
  v_order_user_id uuid;
  v_owner_id uuid;
  v_tracking text;
BEGIN
  SELECT user_id, tracking_code INTO v_order_user_id, v_tracking FROM public.orders WHERE id = NEW.order_id;
  IF NEW.sender_type = 'customer' THEN
    SELECT owner_id INTO v_owner_id FROM public.establishments WHERE id = NEW.establishment_id;
    v_recipient_id := v_owner_id;
  ELSE
    v_recipient_id := v_order_user_id;
  END IF;

  IF v_recipient_id IS NOT NULL AND v_recipient_id <> NEW.sender_user_id THEN
    PERFORM public.create_notification(
      v_recipient_id,
      'Nova mensagem - Pedido ' || COALESCE(v_tracking,''),
      substring(NEW.message FROM 1 FOR 100),
      'order_chat_message',
      jsonb_build_object('order_id', NEW.order_id, 'message_id', NEW.id),
      NEW.establishment_id,
      NEW.order_id, NULL, NULL
    );
  END IF;
  RETURN NEW;
END $$;

-- Update support chat trigger
CREATE OR REPLACE FUNCTION public.handle_support_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_chat public.support_chats%ROWTYPE;
  v_admin RECORD;
BEGIN
  SELECT * INTO v_chat FROM public.support_chats WHERE id = NEW.chat_id;
  UPDATE public.support_chats SET last_message_at = NEW.created_at, updated_at = now() WHERE id = NEW.chat_id;

  IF NEW.sender_role = 'admin' THEN
    IF v_chat.user_id IS NOT NULL AND v_chat.user_id <> NEW.sender_id THEN
      PERFORM public.create_notification(
        v_chat.user_id, 'Suporte respondeu',
        substring(NEW.message FROM 1 FOR 120), 'support_chat_message',
        jsonb_build_object('chat_id', NEW.chat_id), v_chat.establishment_id,
        NULL, NEW.chat_id, NULL
      );
    END IF;
  ELSE
    IF v_chat.claimed_by IS NOT NULL THEN
      PERFORM public.create_notification(
        v_chat.claimed_by, 'Nova mensagem no chat de suporte',
        substring(NEW.message FROM 1 FOR 120), 'support_chat_message',
        jsonb_build_object('chat_id', NEW.chat_id), v_chat.establishment_id,
        NULL, NEW.chat_id, NULL
      );
    ELSE
      FOR v_admin IN
        SELECT DISTINCT user_id FROM public.user_roles
        WHERE role IN ('super_admin','admin_operacional','suporte')
      LOOP
        PERFORM public.create_notification(
          v_admin.user_id, 'Novo chat de suporte aguardando',
          substring(NEW.message FROM 1 FOR 120), 'support_chat_waiting',
          jsonb_build_object('chat_id', NEW.chat_id), v_chat.establishment_id,
          NULL, NEW.chat_id, NULL
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Update ticket created trigger
CREATE OR REPLACE FUNCTION public.handle_support_ticket_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin RECORD;
BEGIN
  FOR v_admin IN
    SELECT DISTINCT user_id FROM public.user_roles
    WHERE role IN ('super_admin','admin_operacional','suporte')
  LOOP
    PERFORM public.create_notification(
      v_admin.user_id,
      'Novo ticket de suporte',
      'Assunto: ' || NEW.subject,
      'support_ticket_created',
      jsonb_build_object('ticket_id', NEW.id, 'category', NEW.category, 'priority', NEW.priority),
      NEW.establishment_id,
      NEW.order_id, NULL, NEW.id
    );
  END LOOP;
  RETURN NEW;
END $$;

-- Update ticket message trigger
CREATE OR REPLACE FUNCTION public.handle_support_ticket_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ticket public.support_tickets%ROWTYPE;
  v_recipient uuid;
  v_admin RECORD;
BEGIN
  SELECT * INTO v_ticket FROM public.support_tickets WHERE id = NEW.ticket_id;

  UPDATE public.support_tickets
    SET last_message_at = NEW.created_at,
        updated_at = now(),
        status = CASE
          WHEN NEW.sender_role = 'admin' AND NOT NEW.is_internal_note AND status = 'open' THEN 'in_progress'::support_ticket_status
          WHEN NEW.sender_role IN ('customer','establishment') AND status = 'waiting_user' THEN 'in_progress'::support_ticket_status
          ELSE status
        END
    WHERE id = NEW.ticket_id;

  IF NEW.is_internal_note THEN RETURN NEW; END IF;

  IF NEW.sender_role = 'admin' THEN
    v_recipient := v_ticket.opened_by;
    IF v_recipient IS NOT NULL AND v_recipient <> NEW.sender_id THEN
      PERFORM public.create_notification(
        v_recipient, 'Resposta no ticket de suporte',
        substring(NEW.message FROM 1 FOR 120), 'support_ticket_reply',
        jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id),
        v_ticket.establishment_id, v_ticket.order_id, NULL, NEW.ticket_id
      );
    END IF;
  ELSE
    IF v_ticket.assigned_admin_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_ticket.assigned_admin_id, 'Nova mensagem no ticket',
        substring(NEW.message FROM 1 FOR 120), 'support_ticket_reply',
        jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id),
        v_ticket.establishment_id, v_ticket.order_id, NULL, NEW.ticket_id
      );
    ELSE
      FOR v_admin IN
        SELECT DISTINCT user_id FROM public.user_roles
        WHERE role IN ('super_admin','admin_operacional','suporte')
      LOOP
        IF v_admin.user_id <> NEW.sender_id THEN
          PERFORM public.create_notification(
            v_admin.user_id, 'Nova mensagem no ticket',
            substring(NEW.message FROM 1 FOR 120), 'support_ticket_reply',
            jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id),
            v_ticket.establishment_id, v_ticket.order_id, NULL, NEW.ticket_id
          );
        END IF;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Ticket status change trigger
CREATE OR REPLACE FUNCTION public.handle_support_ticket_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_label text;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.opened_by IS NOT NULL THEN
    v_label := CASE NEW.status::text
      WHEN 'open' THEN 'Aberto'
      WHEN 'in_progress' THEN 'Em atendimento'
      WHEN 'waiting_user' THEN 'Aguardando você'
      WHEN 'resolved' THEN 'Resolvido'
      WHEN 'closed' THEN 'Encerrado'
      ELSE NEW.status::text
    END;
    PERFORM public.create_notification(
      NEW.opened_by,
      'Status do ticket atualizado',
      'Novo status: ' || v_label,
      'support_ticket_status_changed',
      jsonb_build_object('ticket_id', NEW.id, 'new_status', NEW.status),
      NEW.establishment_id, NEW.order_id, NULL, NEW.id
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_support_ticket_status_change ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_status_change
AFTER UPDATE OF status ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.handle_support_ticket_status_change();
