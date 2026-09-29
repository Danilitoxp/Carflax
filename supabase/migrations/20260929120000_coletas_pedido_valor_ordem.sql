-- Coletas no romaneio: nº do pedido de compra, valor de compra e posição na rota.
--
-- pedido_compra / pedido_empresa: o pedido de compra de origem (antes só
--   existia dentro do texto de `referencia`, "Pedido 1005964 (emp. 001)").
-- valor_compra: valor dos itens pendentes do pedido (custo unitário do pedido
--   × quantidade pendente), mostrado no lugar do "valor" das entregas.
-- sort_order: posição da coleta na mesma sequência das entregas do romaneio
--   (entregas.sort_order), para as duas se ordenarem juntas.
alter table public.coletas
  add column if not exists pedido_compra text,
  add column if not exists pedido_empresa text,
  add column if not exists valor_compra numeric(14,2),
  add column if not exists sort_order integer;

-- Coletas antigas: tira o pedido do texto da referência.
update public.coletas
   set pedido_compra = (regexp_match(referencia, '^Pedido (\d+) \(emp\. (\w+)\)'))[1],
       pedido_empresa = (regexp_match(referencia, '^Pedido (\d+) \(emp\. (\w+)\)'))[2]
 where pedido_compra is null
   and referencia ~ '^Pedido \d+ \(emp\. \w+\)';

-- ── Tela do motorista (/motorista?v=COD, sem login) ─────────────────────────
-- O link do motorista usa a chave anônima, como já acontece com `entregas`.
-- Ele precisa VER as coletas encaixadas no romaneio e MARCAR como coletada,
-- com a foto do comprovante. Nada além disso: a leitura só alcança coletas que
-- estão num romaneio, e a escrita só as colunas de baixa.
alter table public.coletas add column if not exists coletada_foto text;

drop policy if exists "Motorista vê coletas do romaneio" on public.coletas;
create policy "Motorista vê coletas do romaneio" on public.coletas
  for select to anon using (rom_code is not null);

drop policy if exists "Motorista baixa coleta do romaneio" on public.coletas;
create policy "Motorista baixa coleta do romaneio" on public.coletas
  for update to anon
  using (rom_code is not null and status in ('programada', 'coletada'))
  with check (rom_code is not null and status = 'coletada');

revoke update on public.coletas from anon;
grant update (status, coletada_em, coletada_foto) on public.coletas to anon;
grant select on public.coletas to anon;
