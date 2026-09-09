-- A marcação de verba utilizada ficava sem RLS habilitado. O projeto ativa RLS
-- por padrão em toda tabela nova (controle de acesso é feito na aplicação, não
-- no banco) — sem isso o anon key bloqueia até o SELECT/UPSERT vindo do front,
-- e o checkbox "Utilizado" nunca gravava (violava RLS em silêncio).
alter table public.marketing_verbas_uso enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='marketing_verbas_uso' and policyname='marketing_verbas_uso_all'
  ) then
    create policy "marketing_verbas_uso_all"
      on public.marketing_verbas_uso for all using (true) with check (true);
  end if;
end $$;
