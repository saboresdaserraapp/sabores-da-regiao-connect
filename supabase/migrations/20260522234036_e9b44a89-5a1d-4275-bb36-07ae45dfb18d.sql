
-- First-signup-becomes-super-admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_is_first boolean;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));

  select not exists (select 1 from public.user_roles) into v_is_first;
  if v_is_first then
    insert into public.user_roles (user_id, role) values (new.id, 'super_admin');
  end if;

  return new;
end;
$$;

-- safe audit log writer
create or replace function public.log_action(
  _action text,
  _target_type text,
  _target_id uuid,
  _meta jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
declare v_role public.app_role;
begin
  if auth.uid() is null then return; end if;
  select role into v_role from public.user_roles where user_id = auth.uid() limit 1;
  insert into public.audit_log (actor_id, actor_role, action, target_type, target_id, meta)
  values (auth.uid(), v_role, _action, _target_type, _target_id, coalesce(_meta, '{}'::jsonb));
end;
$$;

revoke execute on function public.log_action(text, text, uuid, jsonb) from public, anon;
grant execute on function public.log_action(text, text, uuid, jsonb) to authenticated;
