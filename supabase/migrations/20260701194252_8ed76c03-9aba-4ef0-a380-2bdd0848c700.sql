-- Server-side validation for product option groups
CREATE OR REPLACE FUNCTION public.validate_product_option_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NULL OR length(trim(NEW.name)) < 2 THEN
    RAISE EXCEPTION 'Nome do grupo de opcionais precisa ter no mínimo 2 caracteres. (field=name)'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(NEW.min_choices, 0) < 0 THEN
    RAISE EXCEPTION 'Mínimo de escolhas não pode ser negativo. (field=min_choices)'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(NEW.max_choices, 1) < 1 THEN
    RAISE EXCEPTION 'Máximo de escolhas deve ser pelo menos 1. (field=max_choices)'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(NEW.min_choices, 0) > COALESCE(NEW.max_choices, 1) THEN
    RAISE EXCEPTION 'Mínimo (%) não pode ser maior que máximo (%). (field=min_choices)',
      COALESCE(NEW.min_choices, 0), COALESCE(NEW.max_choices, 1)
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(NEW.is_required, false) AND COALESCE(NEW.min_choices, 0) < 1 THEN
    RAISE EXCEPTION 'Grupo obrigatório precisa ter mínimo de escolhas ≥ 1. (field=min_choices)'
      USING ERRCODE = '22023';
  END IF;

  IF NEW.type = 'radio' AND COALESCE(NEW.max_choices, 1) > 1 THEN
    RAISE EXCEPTION 'Grupo do tipo "escolha única" só permite máximo 1. (field=max_choices)'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_product_option_group ON public.product_option_groups;
CREATE TRIGGER trg_validate_product_option_group
  BEFORE INSERT OR UPDATE ON public.product_option_groups
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_option_group();

-- Server-side validation for individual product options
CREATE OR REPLACE FUNCTION public.validate_product_option()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS NULL OR length(trim(NEW.name)) < 1 THEN
    RAISE EXCEPTION 'Nome da opção não pode ser vazio. (field=name)'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(NEW.price, 0) < 0 THEN
    RAISE EXCEPTION 'Preço da opção não pode ser negativo. (field=price)'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_product_option ON public.product_options;
CREATE TRIGGER trg_validate_product_option
  BEFORE INSERT OR UPDATE ON public.product_options
  FOR EACH ROW EXECUTE FUNCTION public.validate_product_option();