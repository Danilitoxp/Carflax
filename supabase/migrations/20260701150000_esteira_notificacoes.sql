-- Notificações da Esteira: avisa quando alguém vira responsável por um card
-- (type='assigned') ou quando um card criado pela pessoa é concluído (type='completed').
create table if not exists public.esteira_notificacoes (
  id uuid primary key default gen_random_uuid(),
  destino uuid not null references public.usuarios(id),
  actor_id uuid references public.usuarios(id),
  card_id uuid references public.marketing_esteira(id) on delete cascade,
  card_title text not null,
  type text not null check (type in ('assigned', 'completed')),
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_esteira_notificacoes_destino on public.esteira_notificacoes(destino, lida);

alter table public.esteira_notificacoes enable row level security;

create policy "esteira_notificacoes_select_all"
  on public.esteira_notificacoes for select
  using (true);

create policy "esteira_notificacoes_insert_all"
  on public.esteira_notificacoes for insert
  with check (true);

create policy "esteira_notificacoes_update_all"
  on public.esteira_notificacoes for update
  using (true);

alter publication supabase_realtime add table public.esteira_notificacoes;
