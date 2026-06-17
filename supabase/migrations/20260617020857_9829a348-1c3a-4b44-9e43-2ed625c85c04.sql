
DO $$ BEGIN
  CREATE TYPE public.support_chat_status AS ENUM ('waiting','active','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL,
  topic text,
  status public.support_chat_status NOT NULL DEFAULT 'waiting',
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  closed_at timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_chats TO authenticated;
GRANT ALL ON public.support_chats TO service_role;

ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat: owner can view"
  ON public.support_chats FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Chat: admins can view"
  ON public.support_chats FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE POLICY "Chat: user can open own"
  ON public.support_chats FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Chat: owner can update own"
  ON public.support_chats FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Chat: admins can update"
  ON public.support_chats FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_support_chats_updated_at
  BEFORE UPDATE ON public.support_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_support_chats_user ON public.support_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_support_chats_status ON public.support_chats(status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role public.support_actor_role NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_chat_messages TO authenticated;
GRANT ALL ON public.support_chat_messages TO service_role;

ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat msg: view if can view chat"
  ON public.support_chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_chats c
            WHERE c.id = chat_id
              AND (c.user_id = auth.uid() OR public.is_admin(auth.uid())))
  );

CREATE POLICY "Chat msg: send if can view chat"
  ON public.support_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.support_chats c
                WHERE c.id = chat_id
                  AND (c.user_id = auth.uid() OR public.is_admin(auth.uid())))
  );

CREATE INDEX IF NOT EXISTS idx_support_chat_messages_chat ON public.support_chat_messages(chat_id, created_at);

-- Bump last_message_at + notify counterpart
CREATE OR REPLACE FUNCTION public.handle_support_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_chat public.support_chats%ROWTYPE;
  v_admin RECORD;
BEGIN
  SELECT * INTO v_chat FROM public.support_chats WHERE id = NEW.chat_id;
  UPDATE public.support_chats
    SET last_message_at = NEW.created_at, updated_at = now()
    WHERE id = NEW.chat_id;

  IF NEW.sender_role = 'admin' THEN
    IF v_chat.user_id IS NOT NULL AND v_chat.user_id <> NEW.sender_id THEN
      PERFORM public.create_notification(
        v_chat.user_id, 'Suporte respondeu',
        substring(NEW.message FROM 1 FOR 120), 'support_chat_reply',
        jsonb_build_object('chat_id', NEW.chat_id), v_chat.establishment_id
      );
    END IF;
  ELSE
    IF v_chat.claimed_by IS NOT NULL THEN
      PERFORM public.create_notification(
        v_chat.claimed_by, 'Nova mensagem no chat de suporte',
        substring(NEW.message FROM 1 FOR 120), 'support_chat_reply',
        jsonb_build_object('chat_id', NEW.chat_id), v_chat.establishment_id
      );
    ELSE
      FOR v_admin IN
        SELECT DISTINCT user_id FROM public.user_roles
        WHERE role IN ('super_admin','admin_operacional','suporte')
      LOOP
        PERFORM public.create_notification(
          v_admin.user_id, 'Novo chat de suporte aguardando',
          substring(NEW.message FROM 1 FOR 120), 'support_chat_waiting',
          jsonb_build_object('chat_id', NEW.chat_id), v_chat.establishment_id
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_support_chat_message
  AFTER INSERT ON public.support_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_support_chat_message();

-- Claim RPC
CREATE OR REPLACE FUNCTION public.claim_support_chat(_chat_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_chat public.support_chats%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_chat FROM public.support_chats WHERE id = _chat_id FOR UPDATE;
  IF v_chat.id IS NULL THEN
    RAISE EXCEPTION 'Chat não encontrado' USING ERRCODE = '42704';
  END IF;
  IF v_chat.status = 'closed' THEN
    RAISE EXCEPTION 'Chat já encerrado' USING ERRCODE = '22023';
  END IF;
  UPDATE public.support_chats
     SET claimed_by = auth.uid(),
         claimed_at = COALESCE(claimed_at, now()),
         status = 'active'
   WHERE id = _chat_id;
  RETURN jsonb_build_object('ok', true);
END $$;

REVOKE ALL ON FUNCTION public.claim_support_chat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_support_chat(uuid) TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_messages;
