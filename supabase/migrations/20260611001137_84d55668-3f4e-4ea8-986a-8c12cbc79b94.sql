-- 1. Create a temporary type with all necessary values
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'order_status_new') THEN
        CREATE TYPE public.order_status_new AS ENUM (
            'enviado',
            'recebido',
            'confirmado',
            'em_preparo',
            'pronto',
            'saiu_entrega',
            'entregue',
            'concluido',
            'cancelado',
            'aguardando_confirmacao',
            'confirmado_manual',
            'cliente_nao_respondeu',
            'endereco_dificil',
            'precisa_referencia'
        );
    END IF;
END $$;

-- 2. Update existing data to use valid values for the new type
UPDATE public.orders SET status = 'enviado' WHERE status::text = 'enviado_whatsapp';

-- 3. Change the column type (requires dropping and recreating the default)
ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.orders ALTER COLUMN status TYPE public.order_status_new USING status::text::public.order_status_new;
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'enviado'::public.order_status_new;

-- 4. Drop the old type and rename the new one
DROP TYPE public.order_status;
ALTER TYPE public.order_status_new RENAME TO order_status;

-- 5. Grant permissions
GRANT USAGE ON TYPE public.order_status TO anon, authenticated, service_role;
