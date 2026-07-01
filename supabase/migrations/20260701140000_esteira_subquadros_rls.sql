-- Esta tabela nasceu com RLS forçado pelo projeto (diferente de marketing_esteira,
-- que é mais antiga). O app não usa Supabase Auth — é liberado geral, igual ao
-- resto das tabelas da Esteira.
alter table public.esteira_subquadros enable row level security;

create policy "esteira_subquadros_select_all"
  on public.esteira_subquadros for select
  using (true);

create policy "esteira_subquadros_insert_all"
  on public.esteira_subquadros for insert
  with check (true);
