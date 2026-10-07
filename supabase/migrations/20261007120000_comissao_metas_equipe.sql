-- comissao_parametros no remoto foi criada com a versão antiga (meta_loja,
-- um número só). O app grava a meta por equipe — e a meta de conversão do
-- balcão — em metas_equipe, que não existia: salvar dava "Could not find the
-- 'metas_equipe' column ... in the schema cache".
alter table public.comissao_parametros
  add column if not exists metas_equipe jsonb not null default '{}'::jsonb;

-- A meta_loja antiga era a do balcão (equipe do Alan na planilha de set/2026).
update public.comissao_parametros
   set metas_equipe = jsonb_build_object('342fb56e-1dfc-4644-8d16-d157a776b015', meta_loja)
 where metas_equipe = '{}'::jsonb and meta_loja is not null;

-- Faz a API (PostgREST) enxergar a coluna nova na hora.
notify pgrst, 'reload schema';
