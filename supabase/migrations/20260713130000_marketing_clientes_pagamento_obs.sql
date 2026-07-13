-- Adiciona colunas para Forma de Pagamento e Observação ao finalizar a conversa
alter table public.marketing_clientes
  add column if not exists forma_pagamento text,
  add column if not exists observacao text;
