
-- 1) Add attachments column to order_messages and support_chat_messages
ALTER TABLE public.order_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.support_chat_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2) RLS policies for storage.objects on bucket 'chat-attachments'
--    Path convention: <scope>/<resource_id>/<user_id>/<filename>
--    scope ∈ {order, support, ticket}

-- INSERT: authenticated users may upload to a path that starts with their own uid
--         as third segment, and they must be a legitimate participant in that resource.
CREATE POLICY "chat_attach_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[3] = auth.uid()::text
  AND (
    -- order chat: user is customer OR owner of establishment OR admin
    (
      (storage.foldername(name))[1] = 'order'
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(name))[2]
          AND (
            o.user_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.establishment_owners eo
              WHERE eo.establishment_id = o.establishment_id AND eo.user_id = auth.uid()
            )
            OR public.is_admin(auth.uid())
          )
      )
    )
    OR
    -- support chat: chat owner, claimed admin, or any admin
    (
      (storage.foldername(name))[1] = 'support'
      AND EXISTS (
        SELECT 1 FROM public.support_chats c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND (c.user_id = auth.uid() OR c.claimed_by = auth.uid() OR public.is_admin(auth.uid()))
      )
    )
    OR
    -- ticket: opener, assigned admin, establishment owner, or any admin
    (
      (storage.foldername(name))[1] = 'ticket'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id::text = (storage.foldername(name))[2]
          AND (
            t.opened_by = auth.uid()
            OR t.assigned_admin_id = auth.uid()
            OR public.is_admin(auth.uid())
            OR (t.establishment_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.establishment_owners eo
              WHERE eo.establishment_id = t.establishment_id AND eo.user_id = auth.uid()
            ))
          )
      )
    )
  )
);

CREATE POLICY "chat_attach_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (
      (storage.foldername(name))[1] = 'order'
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id::text = (storage.foldername(name))[2]
          AND (
            o.user_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.establishment_owners eo
              WHERE eo.establishment_id = o.establishment_id AND eo.user_id = auth.uid()
            )
            OR public.is_admin(auth.uid())
          )
      )
    )
    OR
    (
      (storage.foldername(name))[1] = 'support'
      AND EXISTS (
        SELECT 1 FROM public.support_chats c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND (c.user_id = auth.uid() OR c.claimed_by = auth.uid() OR public.is_admin(auth.uid()))
      )
    )
    OR
    (
      (storage.foldername(name))[1] = 'ticket'
      AND EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id::text = (storage.foldername(name))[2]
          AND (
            t.opened_by = auth.uid()
            OR t.assigned_admin_id = auth.uid()
            OR public.is_admin(auth.uid())
            OR (t.establishment_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.establishment_owners eo
              WHERE eo.establishment_id = t.establishment_id AND eo.user_id = auth.uid()
            ))
          )
      )
    )
  )
);

CREATE POLICY "chat_attach_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (storage.foldername(name))[3] = auth.uid()::text
    OR public.is_admin(auth.uid())
  )
);
