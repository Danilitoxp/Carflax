-- Agora existe mais de um supervisor de vendas: cada vendedor precisa apontar
-- para o líder do setor responsável por ele, para que o app possa filtrar
-- os vendedores que aparecem para cada supervisor.
alter table public.usuarios
  add column if not exists responsavel_id uuid references public.usuarios(id) on delete set null;

create index if not exists idx_usuarios_responsavel_id on public.usuarios(responsavel_id);
