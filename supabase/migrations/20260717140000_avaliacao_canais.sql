-- Canais de avaliação avulsos: QRs que NÃO são de um vendedor específico
-- (ex.: o cupom colado na nota fiscal). Também levam ao Google; servem para
-- medir quantas avaliações vieram por aquela origem, separado dos vendedores.

create table if not exists public.avaliacao_canais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Um scan agora tem UMA origem: um vendedor OU um canal. Por isso vendedor_cod
-- deixa de ser obrigatório (scans de canal não têm vendedor).
alter table public.avaliacao_scans
  alter column vendedor_cod drop not null,
  add column if not exists canal_id uuid references public.avaliacao_canais(id) on delete set null;

create index if not exists avaliacao_scans_canal_idx on public.avaliacao_scans (canal_id);

alter table public.avaliacao_canais enable row level security;

create policy "avaliacao_canais_select_all" on public.avaliacao_canais for select using (true);
create policy "avaliacao_canais_insert_all" on public.avaliacao_canais for insert with check (true);
create policy "avaliacao_canais_update_all" on public.avaliacao_canais for update using (true) with check (true);
create policy "avaliacao_canais_delete_all" on public.avaliacao_canais for delete using (true);
