-- Cobertura em meses na reposição (Compras › Reposição).
--
-- A base de estoque era fixa em 3 meses. Agora quem gera as propostas escolhe
-- 1, 2 ou 3 — compra mais curta quando não se quer encher o estoque.
--
-- A coluna fica nos dois lugares porque respondem perguntas diferentes:
--   reposicao_agenda   → com quantos meses a agenda deve gerar daqui pra frente;
--   reposicao_propostas → com quantos meses AQUELA proposta foi calculada, que é
--                         o que explica a quantidade depois, quando o padrão já
--                         mudou.

alter table public.reposicao_agenda
  add column if not exists meses_estoque smallint not null default 3
  check (meses_estoque between 1 and 3);

alter table public.reposicao_propostas
  add column if not exists meses_estoque smallint;

comment on column public.reposicao_agenda.meses_estoque is
  'Meses de cobertura usados ao gerar as propostas desta agenda (1 a 3).';
comment on column public.reposicao_propostas.meses_estoque is
  'Meses de cobertura com que esta proposta foi calculada. Null = propostas antigas, geradas quando a base era fixa em 3 meses.';
