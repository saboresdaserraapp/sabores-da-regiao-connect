
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.support_ticket_status AS ENUM ('open','in_progress','waiting_user','resolved','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.support_ticket_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.support_ticket_category AS ENUM (
    'order_issue','delivery_issue','payment_issue','account_issue',
    'establishment_issue','report_followup','feature_request','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.support_actor_role AS ENUM ('customer','establishment','admin','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ TABLES ============
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  description text,
  category public.support_ticket_category NOT NULL DEFAULT 'other',
  priority public.support_ticket_priority NOT NULL DEFAULT 'normal',
  status public.support_ticket_status NOT NULL DEFAULT 'open',
  opened_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_by_role public.support_actor_role NOT NULL,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  assigned_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  closed_at timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket: opener can view own"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (opened_by = auth.uid());

CREATE POLICY "Ticket: establishment members can view"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    establishment_id IS NOT NULL
    AND public.user_role_in_establishment(auth.uid(), establishment_id) IS NOT NULL
  );

CREATE POLICY "Ticket: admins can view all"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Ticket: authenticated can open"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (opened_by = auth.uid());

CREATE POLICY "Ticket: opener can update own (not status admin fields)"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (opened_by = auth.uid())
  WITH CHECK (opened_by = auth.uid());

CREATE POLICY "Ticket: admins can update all"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Ticket: admins can delete"
  ON public.support_tickets FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_support_tickets_opened_by ON public.support_tickets(opened_by);
CREATE INDEX IF NOT EXISTS idx_support_tickets_establishment ON public.support_tickets(establishment_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_message ON public.support_tickets(last_message_at DESC);

-- ---------- MESSAGES ----------
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role public.support_actor_role NOT NULL,
  message text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket msg: view if can view ticket"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.opened_by = auth.uid()
          OR public.is_admin(auth.uid())
          OR (t.establishment_id IS NOT NULL
              AND public.user_role_in_establishment(auth.uid(), t.establishment_id) IS NOT NULL)
        )
    )
  );

CREATE POLICY "Ticket msg: send if can view ticket"
  ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.opened_by = auth.uid()
          OR public.is_admin(auth.uid())
          OR (t.establishment_id IS NOT NULL
              AND public.user_role_in_establishment(auth.uid(), t.establishment_id) IS NOT NULL)
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);

-- ---------- ATTACHMENTS ----------
CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text,
  file_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_attachments TO authenticated;
GRANT ALL ON public.support_ticket_attachments TO service_role;

ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ticket att: view if can view ticket"
  ON public.support_ticket_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.opened_by = auth.uid()
          OR public.is_admin(auth.uid())
          OR (t.establishment_id IS NOT NULL
              AND public.user_role_in_establishment(auth.uid(), t.establishment_id) IS NOT NULL)
        )
    )
  );

CREATE POLICY "Ticket att: upload if can view ticket"
  ON public.support_ticket_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND (
          t.opened_by = auth.uid()
          OR public.is_admin(auth.uid())
          OR (t.establishment_id IS NOT NULL
              AND public.user_role_in_establishment(auth.uid(), t.establishment_id) IS NOT NULL)
        )
    )
  );

-- ---------- Link reports → tickets ----------
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL;

-- ============ TRIGGERS: bump last_message_at + notifications ============
CREATE OR REPLACE FUNCTION public.handle_support_ticket_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin RECORD;
BEGIN
  -- notify all admins
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
      NEW.establishment_id
    );
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_support_ticket_created
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.handle_support_ticket_created();

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
          WHEN NEW.sender_role = 'admin' AND status = 'open' THEN 'in_progress'::support_ticket_status
          WHEN NEW.sender_role IN ('customer','establishment') AND status = 'waiting_user' THEN 'in_progress'::support_ticket_status
          ELSE status
        END
    WHERE id = NEW.ticket_id;

  IF NEW.sender_role = 'admin' THEN
    -- notify opener
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
    -- notify admins (assigned if any, else all support admins)
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
END $$;

CREATE TRIGGER trg_support_ticket_message
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_support_ticket_message();
