-- Brindes deixam de ser controlados por fornecedor (planilha) e passam a ser um
-- campo único do evento: o Kit Instalador é montado uma vez, não marca a marca.

alter table public.eventos
  add column if not exists brindes_meta int not null default 0,
  add column if not exists brindes_recebidos int not null default 0;

alter table public.evento_fornecedores
  drop column if exists brindes_qtd,
  drop column if exists brindes_ok;
