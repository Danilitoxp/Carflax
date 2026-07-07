-- Quadro Scrum/Kanban de Ocorrências dos setores. Cada líder registra ocorrências
-- (problema + solução proposta) do seu setor; na reunião de segunda-feira os
-- diretores analisam, atribuem responsável, decidem e movem até "Resolvido".
-- Segue o padrão do app: RLS liberado (o controle de quem faz o quê é na interface)
-- e realtime habilitado para a reunião ficar ao vivo.
create table if not exists public.scrum_ocorrencias (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null,
  setor             text not null,
  descricao         text not null,            -- o problema / ocorrência
  solucao_proposta  text,                     -- solução proposta pelo líder
  prioridade        text not null default 'media',   -- baixa | media | alta | critica
  status            text not null default 'aberto',  -- aberto | analise | andamento | resolvido
  autor_id          uuid,
  autor_nome        text,
  responsavel_id    uuid,
  responsavel_nome  text,
  decisao           text,                     -- decisão / observação dos diretores
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

create index if not exists scrum_ocorrencias_status_idx on public.scrum_ocorrencias (status);
create index if not exists scrum_ocorrencias_setor_idx  on public.scrum_ocorrencias (setor);

alter table public.scrum_ocorrencias enable row level security;

create policy "scrum_ocorrencias_select_all" on public.scrum_ocorrencias for select using (true);
create policy "scrum_ocorrencias_insert_all" on public.scrum_ocorrencias for insert with check (true);
create policy "scrum_ocorrencias_update_all" on public.scrum_ocorrencias for update using (true) with check (true);
create policy "scrum_ocorrencias_delete_all" on public.scrum_ocorrencias for delete using (true);

alter publication supabase_realtime add table public.scrum_ocorrencias;
