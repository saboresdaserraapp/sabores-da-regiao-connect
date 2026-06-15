-- Adicionar coluna de bairro de atuação para motoboys
ALTER TABLE public.delivery_drivers ADD COLUMN IF NOT EXISTS neighborhood_coverage TEXT;

-- Criar tabela de configuração de expiração (opcional, ou podemos usar metadados no establishment)
-- Por simplicidade e flexibilidade, vamos adicionar à tabela de estabelecimentos
ALTER TABLE public.establishments ADD COLUMN IF NOT EXISTS ref_link_expiration_hours INTEGER DEFAULT 24;

-- Grant permissions (standard practice)
GRANT SELECT, UPDATE ON public.establishments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.delivery_drivers TO authenticated;
