-- Adiciona policy de DELETE para esteira_notificacoes.
-- Sem essa policy o RLS bloqueia silenciosamente o delete,
-- impedindo a exclusão de usuários (FK esteira_notificacoes_destino_fkey).
create policy "esteira_notificacoes_delete_all"
  on public.esteira_notificacoes for delete
  using (true);
