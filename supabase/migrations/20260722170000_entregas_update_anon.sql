-- O motorista finaliza a entrega pela página pública (papel `anon`, link sem
-- login): faz UPDATE em public.entregas (status/image/time e rom_status) em
-- MotoristaView.tsx (handleFinish). A tabela `entregas` tinha policy de UPDATE só
-- para `authenticated` — funciona no desktop logado, mas no celular (anon) o RLS
-- bloqueava o UPDATE silenciosamente (0 linhas afetadas, sem erro), então a
-- entrega nunca era marcada como concluída.
--
-- Libera UPDATE para `anon` e `authenticated`. Segue o mesmo padrão das demais
-- tabelas de negócio do projeto (RLS aberto, using true; controle de acesso é no
-- app, não no Supabase Auth). Policy aditiva — não remove nada existente.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'entregas'
      and policyname = 'entregas_update_anon_authenticated'
  ) then
    create policy "entregas_update_anon_authenticated"
      on public.entregas
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;
end $$;
