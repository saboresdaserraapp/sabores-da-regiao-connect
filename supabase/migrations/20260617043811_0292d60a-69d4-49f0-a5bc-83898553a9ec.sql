
-- 1. Protect support_chats privileged columns from owner edits
CREATE OR REPLACE FUNCTION public.protect_support_chat_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  NEW.status := OLD.status;
  NEW.claimed_by := OLD.claimed_by;
  NEW.claimed_at := OLD.claimed_at;
  NEW.user_id := OLD.user_id;
  NEW.establishment_id := OLD.establishment_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_support_chat_columns ON public.support_chats;
CREATE TRIGGER trg_protect_support_chat_columns
BEFORE UPDATE ON public.support_chats
FOR EACH ROW EXECUTE FUNCTION public.protect_support_chat_columns();

-- 2. Protect support_tickets privileged columns from opener edits
CREATE OR REPLACE FUNCTION public.protect_support_ticket_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  NEW.status := OLD.status;
  NEW.assigned_admin_id := OLD.assigned_admin_id;
  NEW.priority := OLD.priority;
  NEW.opened_by := OLD.opened_by;
  NEW.opened_by_role := OLD.opened_by_role;
  NEW.establishment_id := OLD.establishment_id;
  NEW.order_id := OLD.order_id;
  NEW.category := OLD.category;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_support_ticket_columns ON public.support_tickets;
CREATE TRIGGER trg_protect_support_ticket_columns
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.protect_support_ticket_columns();

-- 3. Explicit deny INSERT on notifications from clients (SECURITY DEFINER triggers bypass RLS)
DROP POLICY IF EXISTS "notifications_no_client_insert" ON public.notifications;
CREATE POLICY "notifications_no_client_insert"
ON public.notifications FOR INSERT TO authenticated, anon
WITH CHECK (false);

COMMENT ON TABLE public.notifications IS
  'Inserts only via SECURITY DEFINER triggers (handle_*_notification). Clients cannot insert directly.';
