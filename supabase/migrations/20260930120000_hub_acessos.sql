-- Registro de acessos às telas do HUB.
--
-- Cada vez que alguém abre uma tela (troca de seção no menu, ou entra direto em
-- /gestor ou /vendedor), o HUB grava uma linha aqui. A tela "Ferramentas > Uso
-- do HUB" lê esta tabela para mostrar o que a equipe mais usa, e assina o
-- Realtime para atualizar sozinha. Quem está online agora vem do canal de
-- presença "hub-presenca" (não passa por esta tabela).
--
-- Sem FK para usuarios: o registro não pode falhar só porque o perfil ainda não
-- carregou o id certo, e o histórico precisa sobreviver se o usuário for apagado.
create table if not exists public.hub_acessos (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_nome text,
  departamento text,
  secao text not null,
  origem text not null default 'hub',
  created_at timestamptz not null default now()
);

create index if not exists idx_hub_acessos_created on public.hub_acessos (created_at desc);
create index if not exists idx_hub_acessos_secao on public.hub_acessos (secao, created_at desc);

alter table public.hub_acessos enable row level security;

drop policy if exists "Autenticados leem acessos" on public.hub_acessos;
create policy "Autenticados leem acessos" on public.hub_acessos
  for select to authenticated using (true);

drop policy if exists "Autenticados registram acessos" on public.hub_acessos;
create policy "Autenticados registram acessos" on public.hub_acessos
  for insert to authenticated with check (true);

-- Realtime: a tela Uso do HUB recebe cada novo acesso na hora.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'hub_acessos'
  ) then
    alter publication supabase_realtime add table public.hub_acessos;
  end if;
end
$$;
