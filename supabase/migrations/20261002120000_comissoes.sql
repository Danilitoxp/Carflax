-- Comissões do comercial (Comercial › Comissões).
--
-- Substitui a planilha "Comissão <mês>.xlsx", que tinha uma aba por vendedor e
-- era preenchida na mão. O cálculo em si sai todo de dado que o HUB já tem
-- (faturamento, margem e meta do painel Geral; conversão do mapa de perdidos);
-- o que não dá para derivar são os PARÂMETROS da regra, que ficam aqui.
--
-- Uma linha por vigência: o mês consultado usa a vigência mais recente com
-- vigencia_inicio <= aquele mês. Assim, mudar a faixa em novembro não reescreve
-- a comissão de setembro que já foi paga.
--
-- Regras que vieram da planilha (set/2026) e estão refletidas no cálculo:
--   índice  = faixa onde cai o faturamento do vendedor
--   comissão = faturamento × índice
--   os 5 bônus são EM CASCATA: cada um só vale se o anterior foi alcançado
--   (meta faturamento → margem individual → conversão → meta loja → margem loja)

create table if not exists public.comissao_parametros (
  id                    uuid primary key default gen_random_uuid(),
  -- Primeiro dia do mês em que esta regra passa a valer.
  vigencia_inicio       date not null unique,

  -- Meta de faturamento da loja. Null = usa a soma das metas dos vendedores.
  -- Meta de faturamento POR EQUIPE: { "<id do supervisor>": 585086.97 }.
  -- A "loja" dos bônus 4 e 5 é a EQUIPE do vendedor, não a empresa inteira: o
  -- balcão responde pela meta do balcão e o B2B pela dele. Equipe sem valor aqui
  -- cai na soma das metas dos próprios membros.
  metas_equipe          jsonb not null default '{}'::jsonb,
  meta_margem_bruta_pct numeric not null default 37,
  meta_conversao_pct    numeric not null default 60,
  meta_margem_loja_pct  numeric not null default 37,
  -- Valor de cada um dos 5 bônus da remuneração variável.
  bonus_valor           numeric not null default 150,

  -- [{ "min": 50000, "max": 99999.99, "pct": 0.6 }, ...] — pct em %, não em
  -- fração. `max` null = última faixa, sem teto.
  faixas                jsonb not null,

  observacao            text,
  atualizado_em         timestamptz not null default now(),
  atualizado_por        uuid,
  atualizado_por_nome   text
);

alter table public.comissao_parametros enable row level security;

-- Mesmo padrão das demais tabelas de configuração do HUB: quem está logado lê e
-- grava, e a tela é que restringe a edição à diretoria.
drop policy if exists "Autenticados gerenciam comissao_parametros" on public.comissao_parametros;
create policy "Autenticados gerenciam comissao_parametros" on public.comissao_parametros
  for all to authenticated using (true) with check (true);

-- Vigência inicial: os números da planilha de setembro/2026.
insert into public.comissao_parametros (
  vigencia_inicio, metas_equipe, meta_margem_bruta_pct, meta_conversao_pct,
  meta_margem_loja_pct, bonus_valor, faixas, observacao
)
values (
  '2026-09-01',
  -- Balcão = equipe do Alan Henrique (supervisor de vendas). É a "meta loja"
  -- de 585.086,97 da planilha. As demais equipes seguem na soma das metas dos
  -- membros até a diretoria cadastrar a meta própria em Comissões › Parâmetros.
  '{"342fb56e-1dfc-4644-8d16-d157a776b015": 585086.97}'::jsonb,
  37, 60, 37, 150,
  '[{"min": 0,      "max": 49999.99,  "pct": 0},
    {"min": 50000,  "max": 99999.99,  "pct": 0.6},
    {"min": 100000, "max": 149999.99, "pct": 0.7},
    {"min": 150000, "max": 199999.99, "pct": 0.8},
    {"min": 200000, "max": 249999.99, "pct": 0.9},
    {"min": 250000, "max": 299999.99, "pct": 1.0},
    {"min": 300000, "max": 349999.99, "pct": 1.1},
    {"min": 350000, "max": null,      "pct": 1.2}]'::jsonb,
  'Importado da planilha Comissão Setembro 2026.xlsx'
)
on conflict (vigencia_inicio) do nothing;
