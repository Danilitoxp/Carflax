-- Subquadros da Esteira: quadros nomeados (ex: "Marketing") que aparecem como
-- item próprio no menu lateral, dentro de Esteira. Existem mesmo sem ninguém
-- dentro ainda — quem entra neles adiciona pessoas depois.
create table if not exists public.esteira_subquadros (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.usuarios(id),
  created_at timestamptz not null default now()
);
