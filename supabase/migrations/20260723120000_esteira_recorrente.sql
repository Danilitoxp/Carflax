-- Recorrência por card na Esteira: um card marcado como recorrente, ao ser concluído,
-- volta sozinho para "A FAZER" no dia seguinte (com os subtasks desmarcados).
-- Substitui o antigo sistema de "demandas fixas" (marketing_demandas_recorrentes),
-- que gerava cards automaticamente a partir de rotinas globais.
alter table public.marketing_esteira
  add column if not exists recurring boolean not null default false,
  add column if not exists completed_at timestamptz;
