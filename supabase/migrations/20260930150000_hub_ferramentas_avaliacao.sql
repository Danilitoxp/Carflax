-- Ferramentas (inventário de telas): impacto 0–10, se a equipe usa e
-- observação de cada ferramenta interna. Antes vivia numa página externa
-- (claude.ai/artifact/L7iKSt4bNQR9zoN3u72vxc); as marcações de lá entram
-- abaixo para ninguém precisar refazer.
create table if not exists public.hub_ferramentas_avaliacao (
  id text primary key,                -- slug "grupo-nome" (ex.: hub-dashboard-geral)
  impacto integer check (impacto between 0 and 10),
  uso text check (uso in ('sim', 'pouco', 'nao')),
  obs text not null default '',
  removido boolean not null default false,
  atualizado timestamptz not null default now(),
  atualizado_por uuid
);

alter table public.hub_ferramentas_avaliacao enable row level security;

drop policy if exists "Autenticados leem ferramentas" on public.hub_ferramentas_avaliacao;
create policy "Autenticados leem ferramentas" on public.hub_ferramentas_avaliacao
  for select to authenticated using (true);

drop policy if exists "Autenticados avaliam ferramentas" on public.hub_ferramentas_avaliacao;
create policy "Autenticados avaliam ferramentas" on public.hub_ferramentas_avaliacao
  for all to authenticated using (true) with check (true);

-- Tempo real: quem estiver com a tela aberta vê a marcação dos outros na hora.
do $$ begin
  alter publication supabase_realtime add table public.hub_ferramentas_avaliacao;
exception when duplicate_object then null; end $$;

-- Marcações feitas na página externa até 30/09/2026.
insert into public.hub_ferramentas_avaliacao (id, impacto, uso, obs, removido, atualizado) values
  ('coletor-app-armazenamento', 10, 'nao', '', false, '2026-09-29T18:38:39.328Z'::timestamptz),
  ('coletor-app-cadastro-de-codigo-de-barras', 7, 'sim', '', false, '2026-09-29T18:52:02.032Z'::timestamptz),
  ('coletor-app-comunicados-e-mensagens', 10, 'sim', '', false, '2026-09-29T18:58:15.517Z'::timestamptz),
  ('coletor-app-conferencia-de-entrada', 10, 'sim', '', false, '2026-09-29T18:38:55.916Z'::timestamptz),
  ('coletor-app-conferencia-de-saida', 10, 'sim', '', false, '2026-09-29T18:38:53.002Z'::timestamptz),
  ('coletor-app-consulta-de-estoque', 7, 'pouco', '', false, '2026-09-29T18:52:16.669Z'::timestamptz),
  ('coletor-app-faturamento', null, null, '', true, '2026-09-29T18:42:31.233Z'::timestamptz),
  ('coletor-app-furos', 10, 'nao', '', false, '2026-09-29T18:51:46.748Z'::timestamptz),
  ('coletor-app-impressao-de-etiqueta', 6, 'pouco', '', false, '2026-09-29T18:51:55.452Z'::timestamptz),
  ('coletor-app-inventario', 10, 'nao', '', false, '2026-09-29T18:38:48.008Z'::timestamptz),
  ('coletor-app-localizacao', 10, 'pouco', '', false, '2026-09-29T18:52:06.578Z'::timestamptz),
  ('coletor-app-painel-administrativo', 10, 'sim', '', true, '2026-09-29T18:51:32.868Z'::timestamptz),
  ('coletor-app-ranking', 10, 'sim', '', false, '2026-09-29T18:37:05.630Z'::timestamptz),
  ('coletor-app-separacao', 10, 'sim', '', false, '2026-09-29T18:38:59.147Z'::timestamptz),
  ('hub-comercial-alugueis', 8, 'pouco', '', false, '2026-09-29T18:32:10.864Z'::timestamptz),
  ('hub-comercial-campanhas', 10, 'sim', '', false, '2026-09-29T18:32:04.490Z'::timestamptz),
  ('hub-comercial-meus-pedidos', 10, 'sim', '', false, '2026-09-29T18:31:21.017Z'::timestamptz),
  ('hub-comercial-minha-carteira', 10, 'nao', '', false, '2026-09-29T18:31:03.391Z'::timestamptz),
  ('hub-comercial-orcamentos', 10, 'sim', '', false, '2026-09-29T18:29:57.023Z'::timestamptz),
  ('hub-comercial-pesquisa-do-cliente', 10, 'sim', '', false, '2026-09-29T18:33:02.295Z'::timestamptz),
  ('hub-comercial-pos-venda', 10, 'nao', '', false, '2026-09-29T18:32:16.209Z'::timestamptz),
  ('hub-comercial-prospeccoes', 10, 'nao', '', false, '2026-09-29T18:31:56.169Z'::timestamptz),
  ('hub-comercial-relatorios-comerciais', 6, 'nao', '', false, '2026-09-29T18:33:20.293Z'::timestamptz),
  ('hub-comercial-vendedor-no-celular-vendedor', 10, 'nao', 'ferramenta nova nao lançada!', false, '2026-09-29T18:53:38.826Z'::timestamptz),
  ('hub-compras-produtos-a-comprar', 10, 'nao', '', true, '2026-09-29T18:48:54.078Z'::timestamptz),
  ('hub-compras-relatorios-de-compras', 10, 'nao', '', true, '2026-09-29T18:48:55.228Z'::timestamptz),
  ('hub-dashboard-geral', 10, 'sim', '', false, '2026-09-29T18:46:09.944Z'::timestamptz),
  ('hub-dashboard-produtos', 7, 'pouco', '', false, '2026-09-29T18:29:07.563Z'::timestamptz),
  ('hub-dashboard-ranking-do-dia-tv', 10, 'sim', '', false, '2026-09-29T18:29:10.611Z'::timestamptz),
  ('hub-entregas-coletas', 10, 'sim', '', false, '2026-09-29T18:35:04.363Z'::timestamptz),
  ('hub-entregas-frota-custos', null, null, '', true, '2026-09-29T18:39:44.033Z'::timestamptz),
  ('hub-entregas-mapa-ao-vivo', 8, 'pouco', '', false, '2026-09-29T18:52:37.784Z'::timestamptz),
  ('hub-entregas-ocorrencias', 10, 'nao', '', false, '2026-09-29T18:35:10.349Z'::timestamptz),
  ('hub-entregas-relatorios-de-entregas', null, null, '', true, '2026-09-29T18:39:37.735Z'::timestamptz),
  ('hub-entregas-romaneios', 10, 'sim', '', false, '2026-09-29T18:35:06.119Z'::timestamptz),
  ('hub-entregas-tela-do-motorista', 10, 'sim', '', false, '2026-09-29T18:39:41.722Z'::timestamptz),
  ('hub-essencial-agenda', 10, 'pouco', '', false, '2026-09-29T18:54:40.947Z'::timestamptz),
  ('hub-essencial-chat-center', 10, 'sim', '', false, '2026-09-29T18:29:34.153Z'::timestamptz),
  ('hub-essencial-esteira', 7, 'pouco', '', false, '2026-09-29T18:54:34.516Z'::timestamptz),
  ('hub-essencial-ferias', 7, 'nao', '', false, '2026-09-29T18:29:30.071Z'::timestamptz),
  ('hub-essencial-organograma', 10, 'nao', '', true, '2026-09-29T18:58:44.744Z'::timestamptz),
  ('hub-essencial-sugestoes', 10, 'nao', '', false, '2026-09-29T18:29:41.375Z'::timestamptz),
  ('hub-estoque-cabos', 10, 'sim', '', false, '2026-09-29T18:34:33.654Z'::timestamptz),
  ('hub-estoque-conferencia', 10, 'nao', '', true, '2026-09-29T18:49:18.486Z'::timestamptz),
  ('hub-estoque-etiqueta-de-preco', 7, 'pouco', '', false, '2026-09-29T18:34:40.508Z'::timestamptz),
  ('hub-estoque-furos', 10, 'nao', '', false, '2026-09-29T18:34:28.554Z'::timestamptz),
  ('hub-estoque-relatorios-de-estoque', 10, 'nao', '', true, '2026-09-29T18:53:01.998Z'::timestamptz),
  ('hub-estoque-retirada', 10, 'nao', '', false, '2026-09-29T18:34:25.614Z'::timestamptz),
  ('hub-estoque-separacao', 10, 'nao', '', true, '2026-09-29T18:49:15.038Z'::timestamptz),
  ('hub-gestao-db-admin', null, null, '', true, '2026-09-29T18:39:20.275Z'::timestamptz),
  ('hub-gestao-painel-do-gestor-gestor', 10, 'sim', '', false, '2026-09-29T18:39:30.092Z'::timestamptz),
  ('hub-gestao-relatorios-scrum', null, null, '', true, '2026-09-29T18:39:24.755Z'::timestamptz),
  ('hub-gestao-scrum-board', 10, 'sim', '', false, '2026-09-29T18:42:27.268Z'::timestamptz),
  ('hub-gestao-usuarios-e-permissoes', null, null, '', true, '2026-09-29T18:39:21.795Z'::timestamptz),
  ('hub-marketing-avaliacoes', 10, 'nao', '', false, '2026-09-29T18:34:07.252Z'::timestamptz),
  ('hub-marketing-carlinhos-atendente-virtual', 10, 'pouco', '', false, '2026-09-29T18:33:51.022Z'::timestamptz),
  ('hub-marketing-eventos', 10, 'sim', '', false, '2026-09-29T18:34:03.070Z'::timestamptz),
  ('hub-marketing-gestao-de-trafego', 10, 'sim', '', false, '2026-09-29T18:33:58.370Z'::timestamptz),
  ('hub-marketing-leads', 10, 'sim', '', false, '2026-09-29T18:33:55.591Z'::timestamptz),
  ('hub-marketing-relatorios-de-marketing', 10, 'sim', '', false, '2026-09-29T18:34:10.102Z'::timestamptz),
  ('hub-marketing-whatsapp-api', 10, 'sim', '', false, '2026-09-29T18:33:44.885Z'::timestamptz),
  ('hub-paginas-externas-avaliar-atendimento', 10, 'nao', '', true, '2026-09-29T18:50:10.749Z'::timestamptz),
  ('hub-paginas-externas-convites-de-eventos', 10, 'sim', '', true, '2026-09-29T18:50:12.015Z'::timestamptz),
  ('hub-rh-triagem-de-curriculos', null, null, '', true, '2026-09-29T18:39:34.897Z'::timestamptz),
  ('outras-ferramentas-automacao-xml', 10, 'sim', '', false, '2026-09-29T18:27:51.981Z'::timestamptz),
  ('outras-ferramentas-carflax-display', 10, 'sim', '', false, '2026-09-29T18:27:26.368Z'::timestamptz),
  ('outras-ferramentas-carflax-treinamento', 10, 'nao', 'ferramenta nova ainda nao lançada!', false, '2026-09-29T18:40:09.906Z'::timestamptz),
  ('outras-ferramentas-e-commerce-pedidos', null, 'nao', '', true, '2026-09-29T18:40:45.949Z'::timestamptz),
  ('outras-ferramentas-e-commerce-preco-e-estoque', 10, 'sim', '', false, '2026-09-29T18:27:47.727Z'::timestamptz),
  ('outras-ferramentas-painel-de-pedidos', 10, 'sim', '', false, '2026-09-29T18:27:32.851Z'::timestamptz),
  ('outras-ferramentas-servidor-de-etiquetas', 7, 'pouco', '', true, '2026-09-29T18:40:27.714Z'::timestamptz)
on conflict (id) do nothing;
