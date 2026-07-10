-- Marca no lead que houve orçamento enviado pelo WhatsApp e guarda o valor total
-- (à vista/PIX), espelhando o funcionamento de valor_venda/data_venda.
alter table public.marketing_clientes
  add column if not exists valor_orcamento numeric,
  add column if not exists data_orcamento timestamptz;
