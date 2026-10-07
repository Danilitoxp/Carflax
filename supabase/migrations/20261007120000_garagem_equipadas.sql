-- NULL mantém o visual das compras antigas; array vazio permite carro base.
alter table public.garagem_visual
  add column if not exists pecas_equipadas text[];
