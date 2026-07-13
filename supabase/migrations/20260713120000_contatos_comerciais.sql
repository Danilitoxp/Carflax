-- Log de contatos/ações comerciais dos vendedores com clientes. É a base do
-- módulo "Performance de Recuperação": registra cada contato feito a partir da
-- Agenda/Raio-X (ligação, visita, whatsapp...) e depois cruza a data do contato
-- com a última compra do cliente (vinda do ERP) para medir quem foi recuperado.
-- Segue o padrão do app: RLS liberado (o controle de quem faz o quê é na interface).
create table if not exists public.contatos_comerciais (
  id               uuid primary key default gen_random_uuid(),
  cliente_id       text not null,             -- COD_CLIENTE no ERP
  cliente_nome     text,
  vendedor_cod     text,                      -- código do vendedor responsável (ERP)
  vendedor_nome    text,
  tipo             text not null default 'ligacao',  -- ligacao | visita | whatsapp | email | outro
  resultado        text not null default 'realizado', -- realizado | agendado | negociando | sem_interesse | sem_contato
  observacao       text,
  valor_potencial  numeric,                   -- potencial de recuperação estimado (R$)
  score_no_contato integer,                   -- snapshot do score de oportunidade no momento
  autor_id         uuid,                      -- quem registrou (usuarios.id)
  autor_nome       text,
  created_at       timestamptz not null default now()
);

create index if not exists contatos_comerciais_cliente_idx  on public.contatos_comerciais (cliente_id);
create index if not exists contatos_comerciais_vendedor_idx on public.contatos_comerciais (vendedor_cod);
create index if not exists contatos_comerciais_created_idx  on public.contatos_comerciais (created_at);

alter table public.contatos_comerciais enable row level security;

create policy "contatos_comerciais_select_all" on public.contatos_comerciais for select using (true);
create policy "contatos_comerciais_insert_all" on public.contatos_comerciais for insert with check (true);
create policy "contatos_comerciais_update_all" on public.contatos_comerciais for update using (true) with check (true);
create policy "contatos_comerciais_delete_all" on public.contatos_comerciais for delete using (true);
