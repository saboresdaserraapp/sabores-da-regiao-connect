
-- Strengthen WITH CHECK on owner update policy so owner can't reassign ownership
DROP POLICY IF EXISTS "Owner updates own establishment" ON public.establishments;
CREATE POLICY "Owner updates own establishment"
  ON public.establishments
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Defensive trigger: only owner or manager may flip is_public
CREATE OR REPLACE FUNCTION public.protect_establishment_is_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_public IS DISTINCT FROM OLD.is_public THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Acesso negado: autenticação obrigatória para alterar visibilidade.' USING ERRCODE='42501';
    END IF;
    IF NOT (public.can_manage(auth.uid()) OR OLD.owner_id = auth.uid()) THEN
      RAISE EXCEPTION 'Acesso negado: somente o dono da loja pode publicar ou despublicar.' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_establishment_is_public ON public.establishments;
CREATE TRIGGER trg_protect_establishment_is_public
BEFORE UPDATE OF is_public ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.protect_establishment_is_public();
