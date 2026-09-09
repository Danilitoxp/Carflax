-- Marca manual de "já utilizei essa verba" por fornecedor/período de apuração.
-- A verba em si é calculada em tempo real (% sobre compras no ERP), não existe
-- como linha no banco — só a marcação de uso precisa persistir. Presença da
-- linha = utilizado; sem linha = ainda disponível.
create table if not exists marketing_verbas_uso (
  id uuid primary key default gen_random_uuid(),
  fornecedor text not null,
  trimestre text not null,
  usado_em timestamptz not null default now(),
  usado_por uuid references usuarios(id),
  unique (fornecedor, trimestre)
);
