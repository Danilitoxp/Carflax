-- O Coletor usa a chave anon (login próprio, sem Supabase Auth). Libera só o
-- INSERT de acessos marcados como origem 'coletor' — leitura continua só no HUB.
drop policy if exists "Coletor registra acessos" on public.hub_acessos;
create policy "Coletor registra acessos" on public.hub_acessos
  for insert to anon with check (origem = 'coletor' and user_id is null);
