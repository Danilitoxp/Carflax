-- Agenda de reposição (Compras › Reposição).
--
-- Pedido do Danilo: "toda segunda-feira, ver o que precisa comprar da curva A de
-- fornecedores e criar o pedido de compra". A agenda guarda a regra; no dia, o
-- sistema monta uma PROPOSTA por fornecedor e avisa o comprador. Nada entra na
-- Citel sem alguém conferir e mandar (decisão do Danilo, 01/10).
--
-- Curva ABC do fornecedor é calculada pelo valor comprado nos últimos 12 meses
-- (A = 80% do valor, B = até 95%, C = o resto) e não fica gravada aqui: muda
-- sozinha conforme a compra.

create table if not exists public.reposicao_agenda (
  id               uuid primary key default gen_random_uuid(),
  criado_em        timestamptz not null default now(),
  criado_por       uuid,
  criado_por_nome  text,

  nome             text not null,
  -- 1 = segunda … 5 = sexta (a Carflax não compra no fim de semana).
  dia_semana       integer not null check (dia_semana between 1 and 5),
  hora             time not null default '08:00',
  curva            text not null check (curva in ('A', 'B', 'C')),
  ativo            boolean not null default true,

  ultima_execucao  timestamptz,
  ultimo_erro      text
);

create index if not exists reposicao_agenda_ativo_idx
  on public.reposicao_agenda (ativo, dia_semana);

-- Proposta montada pela agenda: um pedido por fornecedor, aguardando o envio.
create table if not exists public.reposicao_propostas (
  id               uuid primary key default gen_random_uuid(),
  criado_em        timestamptz not null default now(),
  agenda_id        uuid references public.reposicao_agenda (id) on delete set null,
  agenda_nome      text,
  curva            text,

  cod_fornecedor   text not null,
  fornecedor       text,
  -- [{ cod, descricao, unidade, media, saldo, em_pedido, sugestao }]
  itens            jsonb not null,
  total_itens      integer not null default 0,

  status           text not null default 'pendente'
                   check (status in ('pendente', 'enviada', 'descartada')),
  enviada_em       timestamptz,
  enviada_por      uuid,
  pedido_erp       text,          -- número do pedido criado na Citel
  erro             text,
  descartada_em    timestamptz,
  descartada_por   uuid
);

create index if not exists reposicao_propostas_status_idx
  on public.reposicao_propostas (status, criado_em desc);

alter table public.reposicao_agenda enable row level security;
alter table public.reposicao_propostas enable row level security;

drop policy if exists "Autenticados gerenciam reposicao_agenda" on public.reposicao_agenda;
create policy "Autenticados gerenciam reposicao_agenda" on public.reposicao_agenda
  for all to authenticated using (true) with check (true);

drop policy if exists "Autenticados gerenciam reposicao_propostas" on public.reposicao_propostas;
create policy "Autenticados gerenciam reposicao_propostas" on public.reposicao_propostas
  for all to authenticated using (true) with check (true);
