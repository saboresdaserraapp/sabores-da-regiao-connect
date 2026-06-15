-- business_insights
create table public.business_insights (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null,
  insight_type text not null,
  title text not null,
  description text not null,
  recommendation text not null,
  severity text not null default 'info', -- info|warning|critical|opportunity
  status text not null default 'open',   -- open|in_progress|done|dismissed
  created_at timestamptz not null default now()
);
create index idx_business_insights_est on public.business_insights(establishment_id);

alter table public.business_insights enable row level security;

create policy "Managers manage insights"
  on public.business_insights for all
  using (public.can_manage(auth.uid()));

create policy "Owners read own insights"
  on public.business_insights for select
  using (
    public.can_manage(auth.uid())
    or exists (
      select 1 from public.establishments e
      where e.id = business_insights.establishment_id and e.owner_id = auth.uid()
    )
  );

-- benchmark_metrics (aggregated only - no individual data)
create table public.benchmark_metrics (
  id uuid primary key default gen_random_uuid(),
  city text,
  neighborhood text,
  category text not null,
  period_start date not null,
  period_end date not null,
  average_profile_views numeric not null default 0,
  average_whatsapp_clicks numeric not null default 0,
  average_conversion_rate numeric not null default 0,
  average_estimated_ticket numeric not null default 0,
  peak_hours jsonb not null default '[]'::jsonb,
  top_product_types jsonb not null default '[]'::jsonb,
  sample_size integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_benchmark_cat on public.benchmark_metrics(category);

alter table public.benchmark_metrics enable row level security;

create policy "Authenticated reads benchmarks"
  on public.benchmark_metrics for select
  using (auth.uid() is not null);

create policy "Managers manage benchmarks"
  on public.benchmark_metrics for all
  using (public.can_manage(auth.uid()));