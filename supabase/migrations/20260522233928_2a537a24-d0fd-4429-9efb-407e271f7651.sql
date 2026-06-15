
-- ============================================================
-- ENUMS
-- ============================================================
create type public.app_role as enum (
  'super_admin',
  'admin_operacional',
  'analista_comercial',
  'suporte',
  'establishment_owner'
);

create type public.establishment_status as enum ('pendente', 'ativo', 'suspenso', 'inativo');
create type public.menu_type as enum ('essencial', 'exclusivo');
create type public.review_status as enum ('pendente', 'aprovado', 'reprovado');
create type public.report_status as enum ('pendente', 'resolvido', 'descartado');
create type public.event_type as enum (
  'pageview',
  'establishment_view',
  'product_view',
  'cart_add',
  'whatsapp_send',
  'review_submit'
);

-- ============================================================
-- PROFILES + ROLES
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- security definer helpers
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('super_admin', 'admin_operacional', 'analista_comercial', 'suporte')
  );
$$;

create or replace function public.can_manage(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id
      and role in ('super_admin', 'admin_operacional')
  );
$$;

-- trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- PLANS
-- ============================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price_cents integer not null default 0,
  benefits text[] not null default '{}',
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;

-- ============================================================
-- ESTABLISHMENTS
-- ============================================================
create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  story text,
  category text not null,
  category_label text not null,
  cover text,
  logo text,
  gallery text[] not null default '{}',
  address text,
  neighborhood text,
  city text,
  distance_km numeric,
  status public.establishment_status not null default 'pendente',
  open_now boolean not null default false,
  hours text,
  eta_min integer,
  rating numeric not null default 0,
  reviews_count integer not null default 0,
  whatsapp text,
  services text[] not null default '{}',
  payments text[] not null default '{}',
  delivery_fee numeric,
  badges text[] not null default '{}',
  menu_type public.menu_type not null default 'essencial',
  brand_color text,
  plan_id uuid references public.plans(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  suspended_reason text,
  last_menu_update_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.establishments enable row level security;
create index idx_establishments_status on public.establishments(status);
create index idx_establishments_category on public.establishments(category);

-- ============================================================
-- MENU CATEGORIES + PRODUCTS
-- ============================================================
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.menu_categories enable row level security;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  menu_category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  description text,
  price numeric not null default 0,
  image text,
  featured boolean not null default false,
  promo boolean not null default false,
  popular boolean not null default false,
  options jsonb not null default '[]',
  removable text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create index idx_products_establishment on public.products(establishment_id);

-- ============================================================
-- REVIEWS
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  author text not null,
  rating integer not null,
  text text,
  photo text,
  reply text,
  status public.review_status not null default 'aprovado',
  reported_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create index idx_reviews_establishment on public.reviews(establishment_id);

-- ============================================================
-- SITE CATEGORIES + SETTINGS + BANNERS
-- ============================================================
create table public.site_categories (
  key text primary key,
  label text not null,
  emoji text,
  position integer not null default 0,
  visible boolean not null default true
);
alter table public.site_categories enable row level security;

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  image text not null,
  link text,
  position integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.banners enable row level security;

create table public.site_settings (
  id integer primary key default 1,
  hero_title text,
  hero_subtitle text,
  terms text,
  privacy text,
  faq jsonb not null default '[]',
  cities text[] not null default '{}',
  neighborhoods text[] not null default '{}',
  featured_ids uuid[] not null default '{}',
  promo_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);
alter table public.site_settings enable row level security;
insert into public.site_settings (id) values (1) on conflict do nothing;

-- ============================================================
-- REPORTS
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'pendente',
  created_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience text not null default 'all',
  audience_filter jsonb not null default '{}',
  send_email boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

create table public.announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  read_at timestamptz,
  unique (announcement_id, establishment_id)
);
alter table public.announcement_recipients enable row level security;

-- ============================================================
-- AUDIT LOG
-- ============================================================
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role public.app_role,
  action text not null,
  target_type text,
  target_id uuid,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create index idx_audit_log_created_at on public.audit_log(created_at desc);

-- ============================================================
-- EVENTS (tracking)
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  type public.event_type not null,
  establishment_id uuid references public.establishments(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  session_id text,
  neighborhood text,
  hour smallint,
  weekday smallint,
  value_cents integer,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
create index idx_events_created_at on public.events(created_at desc);
create index idx_events_establishment on public.events(establishment_id);
create index idx_events_type on public.events(type);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Super admin manages profiles" on public.profiles
  for all using (public.has_role(auth.uid(), 'super_admin'));

-- user_roles
create policy "Users can view own roles" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "Super admin manages roles" on public.user_roles
  for all using (public.has_role(auth.uid(), 'super_admin'));

-- plans (public read of active)
create policy "Public reads active plans" on public.plans
  for select using (is_active or public.is_admin(auth.uid()));
create policy "Super admin manages plans" on public.plans
  for all using (public.has_role(auth.uid(), 'super_admin'));

-- establishments
create policy "Public reads active establishments" on public.establishments
  for select using (
    status = 'ativo'
    or public.is_admin(auth.uid())
    or owner_id = auth.uid()
  );
create policy "Owner updates own establishment" on public.establishments
  for update using (owner_id = auth.uid());
create policy "Managers manage establishments" on public.establishments
  for all using (public.can_manage(auth.uid()));

-- menu_categories
create policy "Public reads menu categories" on public.menu_categories
  for select using (true);
create policy "Owner manages own menu categories" on public.menu_categories
  for all using (
    exists (select 1 from public.establishments e
      where e.id = menu_categories.establishment_id and e.owner_id = auth.uid())
  );
create policy "Managers manage menu categories" on public.menu_categories
  for all using (public.can_manage(auth.uid()));

-- products
create policy "Public reads products" on public.products
  for select using (true);
create policy "Owner manages own products" on public.products
  for all using (
    exists (select 1 from public.establishments e
      where e.id = products.establishment_id and e.owner_id = auth.uid())
  );
create policy "Managers manage products" on public.products
  for all using (public.can_manage(auth.uid()));

-- reviews
create policy "Public reads approved reviews" on public.reviews
  for select using (status = 'aprovado' or public.is_admin(auth.uid()));
create policy "Anyone can submit reviews" on public.reviews
  for insert with check (true);
create policy "Owner can reply own reviews" on public.reviews
  for update using (
    exists (select 1 from public.establishments e
      where e.id = reviews.establishment_id and e.owner_id = auth.uid())
  );
create policy "Managers moderate reviews" on public.reviews
  for all using (public.can_manage(auth.uid()));

-- site_categories
create policy "Public reads visible site categories" on public.site_categories
  for select using (visible or public.is_admin(auth.uid()));
create policy "Super admin manages site categories" on public.site_categories
  for all using (public.has_role(auth.uid(), 'super_admin'));

-- banners
create policy "Public reads active banners" on public.banners
  for select using (active or public.is_admin(auth.uid()));
create policy "Managers manage banners" on public.banners
  for all using (public.can_manage(auth.uid()));

-- site_settings
create policy "Public reads site settings" on public.site_settings
  for select using (true);
create policy "Super admin manages site settings" on public.site_settings
  for all using (public.has_role(auth.uid(), 'super_admin'));

-- reports
create policy "Anyone can submit reports" on public.reports
  for insert with check (true);
create policy "Managers view and manage reports" on public.reports
  for all using (public.can_manage(auth.uid()));

-- announcements
create policy "Managers manage announcements" on public.announcements
  for all using (public.can_manage(auth.uid()));
create policy "Owners view their announcements" on public.announcements
  for select using (
    public.can_manage(auth.uid())
    or exists (
      select 1 from public.announcement_recipients ar
      join public.establishments e on e.id = ar.establishment_id
      where ar.announcement_id = announcements.id and e.owner_id = auth.uid()
    )
  );

-- announcement_recipients
create policy "Managers manage recipients" on public.announcement_recipients
  for all using (public.can_manage(auth.uid()));
create policy "Owners read & mark own recipients" on public.announcement_recipients
  for select using (
    public.can_manage(auth.uid())
    or exists (select 1 from public.establishments e
      where e.id = announcement_recipients.establishment_id and e.owner_id = auth.uid())
  );
create policy "Owners mark own recipients read" on public.announcement_recipients
  for update using (
    exists (select 1 from public.establishments e
      where e.id = announcement_recipients.establishment_id and e.owner_id = auth.uid())
  );

-- audit_log
create policy "Admins view audit log" on public.audit_log
  for select using (public.is_admin(auth.uid()));
create policy "System inserts audit log" on public.audit_log
  for insert with check (true);

-- events
create policy "Anyone can insert events" on public.events
  for insert with check (true);
create policy "Admins read events" on public.events
  for select using (public.is_admin(auth.uid()));

-- ============================================================
-- SEED FUNCTION (idempotent)
-- ============================================================
create or replace function public.seed_initial_data()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_plan_essencial uuid;
  v_plan_exclusivo uuid;
  v_eid uuid;
  v_cid uuid;
begin
  -- plans
  insert into public.plans (name, price_cents, benefits, position) values
    ('Básico',      0,     array['Cadastro no app','Cardápio essencial'], 1),
    ('Essencial',   4900,  array['Cardápio essencial','Selo verificado','Estatísticas básicas'], 2),
    ('Exclusivo',   9900,  array['Cardápio exclusivo','Destaque em buscas','Métricas completas','Suporte prioritário'], 3),
    ('Pro',         19900, array['Tudo do Exclusivo','Banner no topo','Campanhas regionais','Consultoria mensal'], 4)
  on conflict (name) do nothing;

  select id into v_plan_essencial from public.plans where name = 'Essencial';
  select id into v_plan_exclusivo from public.plans where name = 'Exclusivo';

  -- site categories
  insert into public.site_categories (key, label, emoji, position) values
    ('pizzarias',    'Pizzarias',       '🍕', 1),
    ('lanches',      'Lanches',         '🍔', 2),
    ('restaurantes', 'Restaurantes',    '🍽️', 3),
    ('marmitas',     'Marmitas',        '🍱', 4),
    ('acai',         'Açaí',            '🍇', 5),
    ('cafes',        'Cafés',           '☕', 6),
    ('bares',        'Bares',           '🍻', 7),
    ('doces',        'Doces',           '🧁', 8),
    ('sorvetes',     'Sorvetes',        '🍦', 9),
    ('caseira',      'Comida caseira',  '🥘', 10),
    ('japonesa',     'Japonesa',        '🍣', 11),
    ('petiscos',     'Petiscos',        '🍤', 12)
  on conflict (key) do nothing;

  -- establishments (only if empty)
  if not exists (select 1 from public.establishments) then
    -- Forno da Vila
    insert into public.establishments (slug, name, tagline, description, category, category_label,
      cover, logo, address, neighborhood, city, distance_km, status, open_now, hours, eta_min,
      rating, reviews_count, whatsapp, services, payments, delivery_fee, badges, menu_type,
      brand_color, plan_id, last_menu_update_at)
    values ('forno-da-vila', 'Forno da Vila', 'Pizza de forno a lenha, do jeito da nonna',
      'Pizzaria artesanal com massa de fermentação natural.',
      'pizzarias', 'Pizzaria',
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=70',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=200&q=70',
      'Rua das Palmeiras, 240 - Centro','Centro','São João das Águas',1.2,
      'ativo', true, 'Ter-Dom 18h-23h', 45, 4.8, 312, '5511999990001',
      array['entrega','retirada','local'], array['Pix','Crédito','Débito','Dinheiro'],
      8, array['verificado','recomendado','promocao'], 'exclusivo', '20 85% 45%',
      v_plan_exclusivo, now() - interval '5 days')
    returning id into v_eid;

    insert into public.menu_categories (establishment_id, name, position) values
      (v_eid, 'Pizzas Salgadas', 1), (v_eid, 'Pizzas Doces', 2), (v_eid, 'Bebidas', 3);

    select id into v_cid from public.menu_categories where establishment_id = v_eid and name = 'Pizzas Salgadas';
    insert into public.products (establishment_id, menu_category_id, name, description, price, image, popular, featured)
    values
      (v_eid, v_cid, 'Pizza Margherita', 'Tomate, muçarela de búfala, manjericão.', 58,
        'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=70', true, true),
      (v_eid, v_cid, 'Pizza Calabresa Artesanal', 'Calabresa defumada, cebola roxa.', 62,
        'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?auto=format&fit=crop&w=800&q=70', true, false);

    -- Burger da Esquina
    insert into public.establishments (slug, name, tagline, description, category, category_label,
      cover, logo, address, neighborhood, city, distance_km, status, open_now, hours, eta_min,
      rating, reviews_count, whatsapp, services, payments, delivery_fee, badges, menu_type,
      plan_id, last_menu_update_at)
    values ('burger-da-esquina', 'Burger da Esquina', 'Smash burgers e batatas crocantes',
      'Hamburgueria artesanal com carne 100% angus.',
      'lanches', 'Hamburgueria',
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=70',
      'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=200&q=70',
      'Av. Brasil, 1200','Vila Nova','São João das Águas',3.5,
      'ativo', false, 'Qua-Dom 18h-00h', 40, 4.6, 257, '5511999990004',
      array['entrega','retirada','local'], array['Pix','Crédito','Débito'],
      10, array['verificado','promocao'], 'exclusivo',
      v_plan_exclusivo, now() - interval '12 days')
    returning id into v_eid;

    insert into public.menu_categories (establishment_id, name, position) values
      (v_eid, 'Burgers', 1), (v_eid, 'Acompanhamentos', 2);

    -- Açaí da Praça (pendente para demo)
    insert into public.establishments (slug, name, tagline, description, category, category_label,
      cover, logo, address, neighborhood, city, distance_km, status, open_now, hours, eta_min,
      rating, reviews_count, whatsapp, services, payments, delivery_fee, badges, menu_type,
      plan_id, last_menu_update_at)
    values ('acai-da-praca', 'Açaí da Praça', 'Açaí cremoso direto do Norte',
      'Açaí 100% natural batido na hora.',
      'acai', 'Açaiteria',
      'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=800&q=70',
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=200&q=70',
      'Praça Central, 15','Centro','São João das Águas',0.4,
      'pendente', true, 'Todos os dias 12h-22h', 25, 4.7, 188, '5511999990002',
      array['entrega','retirada','local'], array['Pix','Crédito','Débito','Dinheiro'],
      5, array['verificado','turistas'], 'essencial',
      v_plan_essencial, now() - interval '2 days')
    returning id into v_eid;

    -- Cantina da Vovó
    insert into public.establishments (slug, name, tagline, description, category, category_label,
      cover, logo, address, neighborhood, city, distance_km, status, open_now, hours, eta_min,
      rating, reviews_count, whatsapp, services, payments, delivery_fee, badges, menu_type,
      plan_id, last_menu_update_at)
    values ('cantina-da-vovo', 'Cantina da Vovó', 'Comida caseira como a da sua avó',
      'Marmitas e pratos feitos com ingredientes frescos.',
      'caseira', 'Comida caseira',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=70',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=200&q=70',
      'Rua da Saudade, 88','Jardim','São João das Águas',2.1,
      'ativo', true, 'Seg-Sex 11h-15h', 30, 4.9, 421, '5511999990003',
      array['entrega','retirada'], array['Pix','Dinheiro'],
      6, array['verificado','recomendado'], 'essencial',
      v_plan_essencial, now() - interval '30 days');

    -- Café do Largo
    insert into public.establishments (slug, name, tagline, description, category, category_label,
      cover, logo, address, neighborhood, city, distance_km, status, open_now, hours, eta_min,
      rating, reviews_count, whatsapp, services, payments, badges, menu_type,
      plan_id, last_menu_update_at)
    values ('cafe-do-largo', 'Café do Largo', 'O melhor café da região',
      'Cafeteria de especialidade com grãos torrados na cidade.',
      'cafes', 'Cafeteria',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=70',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=200&q=70',
      'Largo São Pedro, 30','Centro Histórico','São João das Águas',0.8,
      'ativo', true, 'Todos os dias 7h-20h', 20, 4.9, 540, '5511999990005',
      array['retirada','local'], array['Pix','Crédito','Débito'],
      array['verificado','turistas','recomendado'], 'essencial',
      v_plan_essencial, now() - interval '7 days');

    -- Bar do Zeca
    insert into public.establishments (slug, name, tagline, description, category, category_label,
      cover, logo, address, neighborhood, city, distance_km, status, open_now, hours, eta_min,
      rating, reviews_count, whatsapp, services, payments, delivery_fee, badges, menu_type,
      plan_id, last_menu_update_at)
    values ('bar-do-zeca', 'Bar do Zeca', 'Petiscos e cerveja gelada',
      'Bar tradicional com porções fartas.',
      'bares', 'Bar e petiscos',
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=70',
      'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=200&q=70',
      'Rua do Comércio, 502','Centro','São João das Águas',1.0,
      'ativo', true, 'Ter-Dom 17h-01h', 35, 4.5, 198, '5511999990006',
      array['entrega','local'], array['Pix','Crédito','Débito','Dinheiro'],
      7, array['recomendado','turistas'], 'essencial',
      v_plan_essencial, now() - interval '15 days');
  end if;
end;
$$;

select public.seed_initial_data();

-- ============================================================
-- Synthetic events (so dashboard has data right after install)
-- ============================================================
do $$
declare
  v_eid uuid;
  i integer;
  v_type public.event_type;
  v_types public.event_type[] := array['pageview','establishment_view','product_view','cart_add','whatsapp_send']::public.event_type[];
  v_neighborhoods text[] := array['Centro','Vila Nova','Jardim','Centro Histórico'];
begin
  if (select count(*) from public.events) = 0 then
    for v_eid in select id from public.establishments where status = 'ativo' loop
      for i in 1..120 loop
        v_type := v_types[1 + (i % array_length(v_types,1))];
        insert into public.events (type, establishment_id, neighborhood, hour, weekday, value_cents, created_at)
        values (
          v_type,
          v_eid,
          v_neighborhoods[1 + (i % array_length(v_neighborhoods,1))],
          (i * 7) % 24,
          (i * 3) % 7,
          case when v_type = 'whatsapp_send' then 3500 + (i % 8) * 800 else null end,
          now() - ((i || ' hours')::interval)
        );
      end loop;
    end loop;
  end if;
end;
$$;
