-- Bucket `entregas`: recebe a foto de comprovante de entrega. O upload é INSERT
-- puro (uploadImage.ts, upsert:false). A policy de INSERT existente cobria apenas
-- o papel `anon` (link público do motorista, aberto sem login). Quando um usuário
-- LOGADO no HUB (papel `authenticated`) sobe a foto, a request usa o JWT dele e
-- batia em RLS: "new row violates row-level security policy".
--
-- Correção aditiva: garante INSERT liberado para `anon` e `authenticated` no bucket
-- `entregas`. Não remove a policy anterior — RLS concede se QUALQUER policy passar,
-- então o upload anônimo do motorista continua funcionando.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'entregas_insert_anon_authenticated'
  ) then
    create policy "entregas_insert_anon_authenticated"
      on storage.objects
      for insert
      to anon, authenticated
      with check (bucket_id = 'entregas');
  end if;
end $$;
