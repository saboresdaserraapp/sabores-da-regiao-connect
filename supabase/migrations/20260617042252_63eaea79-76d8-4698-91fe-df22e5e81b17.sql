
-- 1. Add is_internal_note column
ALTER TABLE public.support_ticket_messages
  ADD COLUMN IF NOT EXISTS is_internal_note boolean NOT NULL DEFAULT false;

-- 2. Add new category enum values (no-op if already present)
ALTER TYPE public.support_ticket_category ADD VALUE IF NOT EXISTS 'complaint';
ALTER TYPE public.support_ticket_category ADD VALUE IF NOT EXISTS 'report_establishment';
ALTER TYPE public.support_ticket_category ADD VALUE IF NOT EXISTS 'report_customer';
ALTER TYPE public.support_ticket_category ADD VALUE IF NOT EXISTS 'report_content';
ALTER TYPE public.support_ticket_category ADD VALUE IF NOT EXISTS 'technical_problem';
ALTER TYPE public.support_ticket_category ADD VALUE IF NOT EXISTS 'subscription_problem';

-- 3. Rewrite policies to hide internal notes from non-admins
DROP POLICY IF EXISTS "Ticket msg: view if can view ticket" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Ticket msg: send if can view ticket" ON public.support_ticket_messages;

CREATE POLICY "Ticket msg: admin sees all"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Ticket msg: user sees non-internal of own ticket"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    is_internal_note = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND (
          t.opened_by = auth.uid()
          OR (t.establishment_id IS NOT NULL
              AND public.user_role_in_establishment(auth.uid(), t.establishment_id) IS NOT NULL)
        )
    )
  );

CREATE POLICY "Ticket msg: admin can insert any"
  ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid())
    AND sender_id = auth.uid()
  );

CREATE POLICY "Ticket msg: user can insert public on own ticket"
  ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_internal_note = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
        AND (
          t.opened_by = auth.uid()
          OR (t.establishment_id IS NOT NULL
              AND public.user_role_in_establishment(auth.uid(), t.establishment_id) IS NOT NULL)
        )
    )
  );

-- 4. Update notification trigger to skip internal notes for the opener
CREATE OR REPLACE FUNCTION public.handle_support_ticket_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Internal notes never notify the opener
  IF NEW.is_internal_note THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_role = 'admin' THEN
    v_recipient := v_ticket.opened_by;
    IF v_recipient IS NOT NULL AND v_recipient <> NEW.sender_id THEN
      PERFORM public.create_notification(
        v_recipient,
        'Resposta no ticket de suporte',
        substring(NEW.message FROM 1 FOR 120),
        'support_ticket_reply',
        jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id),
        v_ticket.establishment_id
      );
    END IF;
  ELSE
    IF v_ticket.assigned_admin_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_ticket.assigned_admin_id,
        'Nova mensagem no ticket',
        substring(NEW.message FROM 1 FOR 120),
        'support_ticket_reply',
        jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id),
        v_ticket.establishment_id
      );
    ELSE
      FOR v_admin IN
        SELECT DISTINCT user_id FROM public.user_roles
        WHERE role IN ('super_admin','admin_operacional','suporte')
      LOOP
        IF v_admin.user_id <> NEW.sender_id THEN
          PERFORM public.create_notification(
            v_admin.user_id,
            'Nova mensagem no ticket',
            substring(NEW.message FROM 1 FOR 120),
            'support_ticket_reply',
            jsonb_build_object('ticket_id', NEW.ticket_id, 'message_id', NEW.id),
            v_ticket.establishment_id
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END $function$;
