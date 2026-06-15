-- Function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT DEFAULT 'info',
    p_data JSONB DEFAULT '{}'::jsonb,
    p_establishment_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, data, establishment_id)
    VALUES (p_user_id, p_title, p_message, p_type, p_data, p_establishment_id)
    RETURNING id INTO v_notification_id;
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for order status change
CREATE OR REPLACE FUNCTION public.handle_order_status_change_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) AND NEW.user_id IS NOT NULL THEN
        PERFORM public.create_notification(
            NEW.user_id,
            'Pedido ' || NEW.tracking_code,
            'O status do seu pedido foi atualizado para: ' || 
            CASE NEW.status
                WHEN 'enviado_whatsapp' THEN 'Enviado'
                WHEN 'aguardando_confirmacao' THEN 'Aguardando Confirmação'
                WHEN 'confirmado_manual' THEN 'Confirmado'
                WHEN 'em_preparo' THEN 'Em Preparo'
                WHEN 'pronto' THEN 'Pronto para Retirada/Entrega'
                WHEN 'saiu_entrega' THEN 'Saiu para Entrega'
                WHEN 'entregue' THEN 'Entregue'
                WHEN 'cancelado' THEN 'Cancelado'
                ELSE NEW.status
            END,
            'order_status',
            jsonb_build_object('order_id', NEW.id, 'tracking_code', NEW.tracking_code, 'new_status', NEW.status),
            NEW.establishment_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_status_change_notify
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_status_change_notification();

-- Trigger for new order messages
CREATE OR REPLACE FUNCTION public.handle_new_order_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_recipient_id UUID;
    v_order_user_id UUID;
    v_establishment_owner_id UUID;
    v_tracking_code TEXT;
BEGIN
    SELECT user_id, tracking_code INTO v_order_user_id, v_tracking_code FROM public.orders WHERE id = NEW.order_id;
    
    -- If sender is customer, notify establishment owner
    IF NEW.sender_type = 'customer' THEN
        SELECT owner_id INTO v_establishment_owner_id FROM public.establishments WHERE id = NEW.establishment_id;
        v_recipient_id := v_establishment_owner_id;
    -- If sender is business or system, notify customer
    ELSE
        v_recipient_id := v_order_user_id;
    END IF;

    IF v_recipient_id IS NOT NULL AND v_recipient_id != NEW.sender_user_id THEN
        PERFORM public.create_notification(
            v_recipient_id,
            'Nova mensagem - Pedido ' || v_tracking_code,
            substring(NEW.message FROM 1 FOR 100),
            'new_order_message',
            jsonb_build_object('order_id', NEW.order_id, 'message_id', NEW.id),
            NEW.establishment_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_order_message_notify
AFTER INSERT ON public.order_messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_order_message_notification();

-- Trigger for profile update
CREATE OR REPLACE FUNCTION public.handle_profile_update_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if significant fields changed
    IF (OLD.display_name IS DISTINCT FROM NEW.display_name) OR 
       (OLD.phone IS DISTINCT FROM NEW.phone) OR 
       (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url) THEN
        
        PERFORM public.create_notification(
            NEW.id,
            'Perfil atualizado',
            'Suas alterações de perfil foram salvas com sucesso.',
            'profile_update',
            jsonb_build_object('updated_at', now())
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_update_notify
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_update_notification();
