-- Central de mensagens: "ocultar" conversa passa a ser POR USUÁRIO.
--
-- Antes, o botão "Limpar Todas as Conversas" gravava crm_conversas.fechada=true
-- por DOCUMENTO — o que escondia a conversa para TODOS os participantes daquele
-- orçamento (quando o supervisor limpava a central dele, sumia também da central
-- do vendedor). Agora cada usuário oculta na sua própria central sem afetar os
-- outros. A coluna crm_conversas.fechada deixa de ser usada para esconder na
-- central (fica como legado inofensivo).
--
-- Regra de reabertura preservada: uma conversa oculta reaparece na central assim
-- que chega uma mensagem NOVA — ou seja, quando há um diálogo com timestamp
-- posterior a `ocultado_em`. Isso é avaliado no app (App.tsx / carregarTodasConversas).
--
-- RLS aberto (using true), igual às demais tabelas de negócio: o app não usa
-- Supabase Auth para autorizar, o filtro por usuário é feito no código via user_id.

create table if not exists public.crm_central_ocultas (
  user_id     text        not null,
  documento   text        not null,
  ocultado_em timestamptz not null default now(),
  primary key (user_id, documento)
);

create index if not exists idx_crm_central_ocultas_user
  on public.crm_central_ocultas (user_id);

alter table public.crm_central_ocultas enable row level security;

create policy "crm_central_ocultas_select_all" on public.crm_central_ocultas
  for select using (true);
create policy "crm_central_ocultas_insert_all" on public.crm_central_ocultas
  for insert with check (true);
create policy "crm_central_ocultas_update_all" on public.crm_central_ocultas
  for update using (true) with check (true);
create policy "crm_central_ocultas_delete_all" on public.crm_central_ocultas
  for delete using (true);
