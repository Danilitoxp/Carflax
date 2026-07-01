-- Esteira pessoal: cada card agora tem um dono (owner_id) e um criador (created_by).
-- owner_id define de quem é a esteira onde o card aparece; created_by_name (legado)
-- é mantido apenas para histórico/rollback, mas deixa de ser usado pela aplicação.

alter table public.marketing_esteira
  add column if not exists owner_id uuid references public.usuarios(id),
  add column if not exists created_by uuid references public.usuarios(id);

create index if not exists idx_marketing_esteira_owner_id on public.marketing_esteira(owner_id);

-- Backfill: formato "Criador | Responsável"
update public.marketing_esteira m
set owner_id = u.id
from public.usuarios u
where m.owner_id is null
  and m.created_by_name is not null
  and trim(split_part(m.created_by_name, '|', 2)) <> ''
  and lower(trim(split_part(m.created_by_name, '|', 2))) = lower(trim(u.name));

-- Backfill: formato legado sem separador (só um nome = criador e responsável são a mesma pessoa)
update public.marketing_esteira m
set owner_id = u.id
from public.usuarios u
where m.owner_id is null
  and m.created_by_name is not null
  and position('|' in m.created_by_name) = 0
  and lower(trim(m.created_by_name)) = lower(trim(u.name));

-- Backfill do criador (primeira parte, ou string inteira quando não há separador)
update public.marketing_esteira m
set created_by = u.id
from public.usuarios u
where m.created_by is null
  and m.created_by_name is not null
  and lower(trim(split_part(m.created_by_name, '|', 1))) = lower(trim(u.name));
