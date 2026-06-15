-- 1. Create the new enum type with canonical values
CREATE TYPE public.order_status_v2 AS ENUM (
    'waiting_business_confirmation',
    'confirmed_by_business',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'canceled_by_customer',
    'canceled_by_business',
    'customer_not_responding',
    'difficult_address',
    'needs_more_reference',
    'not_completed',
    'unknown'
);

-- 2. Change orders table status column type and map values simultaneously
ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.orders ALTER COLUMN status TYPE public.order_status_v2 
USING (
    CASE status::text
        WHEN 'enviado' THEN 'waiting_business_confirmation'
        WHEN 'aguardando_confirmacao' THEN 'waiting_business_confirmation'
        WHEN 'enviado_whatsapp' THEN 'waiting_business_confirmation'
        WHEN 'recebido' THEN 'waiting_business_confirmation'
        WHEN 'confirmado' THEN 'confirmed_by_business'
        WHEN 'confirmado_manual' THEN 'confirmed_by_business'
        WHEN 'em_preparo' THEN 'preparing'
        WHEN 'pronto' THEN 'ready_for_pickup'
        WHEN 'saiu_entrega' THEN 'out_for_delivery'
        WHEN 'entregue' THEN 'delivered'
        WHEN 'concluido' THEN 'delivered'
        WHEN 'cancelado' THEN 'canceled_by_business'
        WHEN 'cliente_nao_respondeu' THEN 'customer_not_responding'
        WHEN 'endereco_dificil' THEN 'difficult_address'
        WHEN 'precisa_referencia' THEN 'needs_more_reference'
        ELSE 'unknown'
    END
)::public.order_status_v2;

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'waiting_business_confirmation'::public.order_status_v2;

-- 3. Update order_status_history data
UPDATE public.order_status_history SET from_status = 
    CASE from_status
        WHEN 'enviado' THEN 'waiting_business_confirmation'
        WHEN 'aguardando_confirmacao' THEN 'waiting_business_confirmation'
        WHEN 'enviado_whatsapp' THEN 'waiting_business_confirmation'
        WHEN 'recebido' THEN 'waiting_business_confirmation'
        WHEN 'confirmado' THEN 'confirmed_by_business'
        WHEN 'confirmado_manual' THEN 'confirmed_by_business'
        WHEN 'em_preparo' THEN 'preparing'
        WHEN 'pronto' THEN 'ready_for_pickup'
        WHEN 'saiu_entrega' THEN 'out_for_delivery'
        WHEN 'entregue' THEN 'delivered'
        WHEN 'concluido' THEN 'delivered'
        WHEN 'cancelado' THEN 'canceled_by_business'
        WHEN 'cliente_nao_respondeu' THEN 'customer_not_responding'
        WHEN 'endereco_dificil' THEN 'difficult_address'
        WHEN 'precisa_referencia' THEN 'needs_more_reference'
        ELSE 'unknown'
    END;

UPDATE public.order_status_history SET to_status = 
    CASE to_status
        WHEN 'enviado' THEN 'waiting_business_confirmation'
        WHEN 'aguardando_confirmacao' THEN 'waiting_business_confirmation'
        WHEN 'enviado_whatsapp' THEN 'waiting_business_confirmation'
        WHEN 'recebido' THEN 'waiting_business_confirmation'
        WHEN 'confirmado' THEN 'confirmed_by_business'
        WHEN 'confirmado_manual' THEN 'confirmed_by_business'
        WHEN 'em_preparo' THEN 'preparing'
        WHEN 'pronto' THEN 'ready_for_pickup'
        WHEN 'saiu_entrega' THEN 'out_for_delivery'
        WHEN 'entregue' THEN 'delivered'
        WHEN 'concluido' THEN 'delivered'
        WHEN 'cancelado' THEN 'canceled_by_business'
        WHEN 'cliente_nao_respondeu' THEN 'customer_not_responding'
        WHEN 'endereco_dificil' THEN 'difficult_address'
        WHEN 'precisa_referencia' THEN 'needs_more_reference'
        ELSE 'unknown'
    END;

-- 4. Recreate trigger function with new status values
DROP TRIGGER IF EXISTS on_order_status_change_notify ON public.orders;
DROP FUNCTION IF EXISTS public.handle_order_status_change_notification();

CREATE OR REPLACE FUNCTION public.handle_order_status_change_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
    notification_title TEXT;
    notification_msg TEXT;
    status_label TEXT;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
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
            user_id,
            type,
            title,
            message,
            data
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
$$;

CREATE TRIGGER on_order_status_change_notify
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_status_change_notification();

-- 5. Final replacement: Swap types
ALTER TYPE public.order_status RENAME TO order_status_old;
ALTER TYPE public.order_status_v2 RENAME TO order_status;
DROP TYPE public.order_status_old;
