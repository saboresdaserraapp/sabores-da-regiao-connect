
CREATE OR REPLACE FUNCTION public.handle_order_status_change_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    notification_title TEXT;
    notification_msg TEXT;
    status_label TEXT;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Skip when there's no logged-in customer to notify (guest order).
        IF NEW.user_id IS NULL THEN
            RETURN NEW;
        END IF;

        status_label := CASE NEW.status::text
            WHEN 'waiting_business_confirmation' THEN 'Aguardando confirmação'
            WHEN 'confirmed_by_business' THEN 'Confirmado pela loja'
            WHEN 'preparing' THEN 'Em preparo'
            WHEN 'ready_for_pickup' THEN 'Pronto para retirada'
            WHEN 'out_for_delivery' THEN 'Saiu para entrega'
            WHEN 'delivered' THEN 'Entregue'
            WHEN 'canceled_by_customer' THEN 'Cancelado por você'
            WHEN 'canceled_by_business' THEN 'Cancelado pela loja'
            WHEN 'customer_not_responding' THEN 'Cliente não respondeu'
            WHEN 'difficult_address' THEN 'Endereço difícil'
            WHEN 'needs_more_reference' THEN 'Precisa de mais referência'
            WHEN 'not_completed' THEN 'Não concluído'
            ELSE 'Atualizado'
        END;

        notification_title := 'Atualização no seu pedido';
        notification_msg := 'Seu pedido agora está: ' || status_label;

        INSERT INTO public.notifications (
            user_id, type, title, message, data
        ) VALUES (
            NEW.user_id,
            'order_status_update',
            notification_title,
            notification_msg,
            jsonb_build_object(
                'order_id', NEW.id,
                'new_status', NEW.status,
                'tracking_code', NEW.tracking_code
            )
        );
    END IF;
    RETURN NEW;
END;
$function$;
