-- Remover a restrição antiga que permitia apenas uma referência por usuário no total
ALTER TABLE public.house_references DROP CONSTRAINT IF EXISTS house_references_user_id_key;

-- Criar um novo índice único para o par user_id e address_id
-- NULLS NOT DISTINCT permite que (user_id, NULL) também seja tratado como único
CREATE UNIQUE INDEX IF NOT EXISTS house_references_user_id_address_id_key ON public.house_references (user_id, address_id) NULLS NOT DISTINCT;

-- Garantir permissões para os papéis necessários
GRANT SELECT, INSERT, UPDATE, DELETE ON public.house_references TO authenticated;
GRANT ALL ON public.house_references TO service_role;
