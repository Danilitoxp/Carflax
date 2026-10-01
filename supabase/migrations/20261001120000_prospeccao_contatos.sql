-- Registro das prospecções feitas na tela Comercial › Prospecções.
--
-- Antes o botão "Prospectar" só agendava um follow-up no calendário, e o que
-- aconteceu na ligação se perdia. Aqui fica o resultado do contato: se falou com
-- o cliente, por que ele parou de comprar, se tem interesse e quando retornar.

create table if not exists public.prospeccao_contatos (
  id               uuid primary key default gen_random_uuid(),
  criado_em        timestamptz not null default now(),
  criado_por       uuid,
  criado_por_nome  text,
  cod_vendedor     text,

  cliente_id       text not null,
  nome_cliente     text not null,
  recencia_dias    integer,
  valor_total      numeric(14,2),

  -- Como terminou a tentativa de contato.
  contato          text not null
                   check (contato in ('falou', 'nao_atendeu', 'retornar_depois', 'contato_errado')),
  -- Por que parou de comprar (só quando conseguiu falar).
  motivo           text
                   check (motivo in ('preco', 'prazo_entrega', 'falta_estoque', 'atendimento',
                                     'concorrente', 'sem_demanda', 'financeiro', 'fechou', 'outro')),
  motivo_detalhe   text,
  interesse        text check (interesse in ('sim', 'talvez', 'nao')),
  proximo_contato  date,
  observacao       text
);

create index if not exists prospeccao_contatos_cliente_idx
  on public.prospeccao_contatos (cliente_id, criado_em desc);
create index if not exists prospeccao_contatos_proximo_idx
  on public.prospeccao_contatos (proximo_contato)
  where proximo_contato is not null;

alter table public.prospeccao_contatos enable row level security;

drop policy if exists "Autenticados gerenciam prospeccao_contatos" on public.prospeccao_contatos;
create policy "Autenticados gerenciam prospeccao_contatos" on public.prospeccao_contatos
  for all to authenticated using (true) with check (true);
