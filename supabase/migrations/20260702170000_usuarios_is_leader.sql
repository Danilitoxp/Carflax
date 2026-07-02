-- Marca explicitamente quem pode ser "responsável" (líder) de outros usuários,
-- em vez de inferir isso pelo texto do cargo. Começa já classificando quem
-- hoje tem cargo de gerência/supervisão/diretoria, para não perder o que já
-- existe; o admin pode ajustar manualmente depois pelo toggle "Líder".
alter table public.usuarios
  add column if not exists is_leader boolean not null default false;

update public.usuarios
set is_leader = true
where is_leader = false
  and (
    role ilike '%gerente%'
    or role ilike '%supervisor%'
    or role ilike '%diretor%'
  );
