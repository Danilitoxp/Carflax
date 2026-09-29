-- Projeto "Você de Casa Nova 2026": escolha do prêmio trimestral.
--
-- Quem bate a meta acumulada do trimestre (≥ 97%, a mesma tolerância do
-- sorteio mensal) não depende de sorteio: escolhe 1 dos 3 prêmios mensais do
-- trimestre. Uma escolha por vendedor por trimestre; todo mundo vê.
create table if not exists public.premio_trimestre_escolha (
  id uuid primary key default gen_random_uuid(),
  ano integer not null,
  trimestre integer not null check (trimestre between 1 and 4),
  vendedor_codigo text not null,
  vendedor_nome text,
  -- id do prêmio em premio_mes (texto: guarda o id sem depender do tipo da
  -- coluna de lá); o nome fica gravado junto para a escolha sobreviver se o
  -- prêmio for editado ou apagado.
  premio_id text,
  premio_nome text not null,
  percentual numeric(6,2),
  escolhido_por uuid,
  escolhido_por_nome text,
  escolhido_em timestamptz not null default now(),
  unique (ano, trimestre, vendedor_codigo)
);

alter table public.premio_trimestre_escolha enable row level security;

drop policy if exists "Autenticados leem escolhas" on public.premio_trimestre_escolha;
create policy "Autenticados leem escolhas" on public.premio_trimestre_escolha
  for select to authenticated using (true);

drop policy if exists "Autenticados gravam escolhas" on public.premio_trimestre_escolha;
create policy "Autenticados gravam escolhas" on public.premio_trimestre_escolha
  for all to authenticated using (true) with check (true);
