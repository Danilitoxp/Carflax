-- O app não usa Supabase Auth para autorizar as tabelas de negócio — o acesso é
-- liberado geral e o controle de quem vê o quê fica no menu (menu-config.ts),
-- igual às tabelas da Esteira. Mesmo padrão aqui.
--
-- ATENÇÃO: por causa disso, evento_fornecedores.cota_confidencial NÃO esconde a
-- cota de ninguém no banco — qualquer chave anon lê o valor. A flag serve só
-- para a tela avisar e não expor a cota em relatório/print para fornecedor.

alter table public.eventos enable row level security;
alter table public.evento_fornecedores enable row level security;
alter table public.evento_convidados enable row level security;
alter table public.evento_fases enable row level security;
alter table public.evento_tarefas enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'eventos', 'evento_fornecedores', 'evento_convidados', 'evento_fases', 'evento_tarefas'
  ] loop
    execute format('create policy "%1$s_select_all" on public.%1$I for select using (true)', t);
    execute format('create policy "%1$s_insert_all" on public.%1$I for insert with check (true)', t);
    execute format('create policy "%1$s_update_all" on public.%1$I for update using (true) with check (true)', t);
    execute format('create policy "%1$s_delete_all" on public.%1$I for delete using (true)', t);
  end loop;
end $$;
