-- Automação de pedido de avaliação no Google via Evolution API.
-- Envio em fila (drip lento) pelo backend, com régua anti-ban.

-- Config + estado da campanha (linha única, id sempre = 1).
create table if not exists public.avaliacao_campanha (
  id int primary key default 1,
  status text not null default 'idle',                 -- idle | running | paused
  review_url text,
  templates jsonb not null default '[]'::jsonb,         -- variações de mensagem (evita texto idêntico)
  daily_cap int not null default 5,                     -- teto de envios por dia
  min_gap_seconds int not null default 70,              -- intervalo mínimo entre envios
  max_gap_seconds int not null default 160,             -- intervalo máximo entre envios
  hora_inicio int not null default 9,                   -- janela de envio (hora local BR)
  hora_fim int not null default 18,
  dias_semana jsonb not null default '[1,2,3,4,5,6]'::jsonb, -- 0=dom .. 6=sáb
  reask_days int not null default 90,                   -- não repedir ao mesmo cliente em N dias
  sent_today int not null default 0,
  last_sent_date text,                                  -- YYYY-MM-DD (reseta o contador diário)
  last_sent_at timestamptz,
  next_send_at timestamptz,                             -- pacing: próximo horário permitido
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint avaliacao_campanha_singleton check (id = 1)
);

-- Fila / registro de envios (1 linha por cliente).
create table if not exists public.avaliacao_fila (
  id uuid primary key default gen_random_uuid(),
  remote_jid text not null unique,
  nome text,
  status text not null default 'pending',               -- pending | sent | failed | opted_out
  attempts int not null default 0,
  error text,
  sent_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_avaliacao_fila_status on public.avaliacao_fila(status);

-- Controle anti-repetição e opt-out no próprio cliente.
alter table public.marketing_clientes
  add column if not exists avaliacao_optout boolean default false,
  add column if not exists avaliacao_last_sent timestamptz;

-- Seed da linha única de config (sem sobrescrever se já existir).
insert into public.avaliacao_campanha (id, status) values (1, 'idle')
on conflict (id) do nothing;

-- RLS liberado (mesmo padrão das outras tabelas de marketing do projeto).
alter table public.avaliacao_campanha enable row level security;
alter table public.avaliacao_fila enable row level security;
do $$ begin
  create policy "avaliacao_campanha_all" on public.avaliacao_campanha for all using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "avaliacao_fila_all" on public.avaliacao_fila for all using (true) with check (true);
exception when duplicate_object then null; end $$;
