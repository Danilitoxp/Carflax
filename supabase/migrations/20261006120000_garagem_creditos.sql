-- Garagem do ranking: créditos ganhos por mês fechado e peças compradas com eles.
-- Saldo = soma de garagem_creditos - soma do preço em garagem_compras.

create table if not exists public.garagem_creditos (
  vendedor_cod text not null,
  mes_ref text not null,           -- 'YYYY-MM' do mês que gerou o crédito
  creditos integer not null check (creditos >= 0),
  percentual numeric,              -- % da meta do mês (auditoria da conta)
  criado_em timestamptz not null default now(),
  primary key (vendedor_cod, mes_ref)
);

create table if not exists public.garagem_compras (
  id uuid primary key default gen_random_uuid(),
  vendedor_cod text not null,
  peca_id text not null,
  preco integer not null check (preco > 0),
  comprado_em timestamptz not null default now(),
  unique (vendedor_cod, peca_id)
);

-- Cor escolhida pelo vendedor (índice da paleta do modo corrida). Trocar é grátis.
create table if not exists public.garagem_visual (
  vendedor_cod text primary key,
  cor integer not null check (cor >= 0),
  atualizado_em timestamptz not null default now()
);

alter table public.garagem_visual enable row level security;
drop policy if exists "Autenticados usam garagem_visual" on public.garagem_visual;
create policy "Autenticados usam garagem_visual" on public.garagem_visual
  for all to authenticated using (true) with check (true);

-- Tempo real: a pista do ranking troca o visual do carro na hora da compra.
do $$
begin
  begin alter publication supabase_realtime add table public.garagem_compras; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.garagem_visual; exception when duplicate_object then null; end;
end $$;

alter table public.garagem_creditos enable row level security;
alter table public.garagem_compras enable row level security;

drop policy if exists "Autenticados usam garagem_creditos" on public.garagem_creditos;
create policy "Autenticados usam garagem_creditos" on public.garagem_creditos
  for all to authenticated using (true) with check (true);

drop policy if exists "Autenticados usam garagem_compras" on public.garagem_compras;
create policy "Autenticados usam garagem_compras" on public.garagem_compras
  for all to authenticated using (true) with check (true);
