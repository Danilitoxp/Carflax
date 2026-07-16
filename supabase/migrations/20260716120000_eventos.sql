-- Eventos de Marketing (primeiro caso: Encontro do Instalador Carflax, 22/10/2026).
-- Estrutura genérica: a tela lista eventos e cada evento carrega seus próprios
-- fornecedores, convidados, fases e tarefas — para os próximos eventos não
-- precisarem de código novo.

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  subtitulo text,
  descricao text,
  data_evento date not null,
  hora_inicio time,
  hora_fim time,
  local text,
  -- Meta de presença é uma faixa (ex: 60 a 80), não um número só.
  publico_meta_min int,
  publico_meta_max int,
  -- Quantos convidar para atingir a faixa acima (absorve o no-show esperado).
  convidados_meta int,
  verba_meta numeric(12,2) not null default 0,
  status text not null default 'planejamento'
    check (status in ('planejamento', 'confirmado', 'realizado', 'cancelado')),
  created_by uuid references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.evento_fornecedores (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  marca text not null,
  segmento text check (segmento in ('hidraulico', 'eletrico')),
  contato_nome text,
  contato_telefone text,
  status text not null default 'nao_contatado'
    check (status in ('nao_contatado', 'media_kit_enviado', 'follow_up', 'confirmado', 'recusado')),
  cota_valor numeric(12,2) not null default 0,
  -- Cotas negociadas individualmente. Marca a linha como "não mostrar junto das
  -- outras" (caso Amanco). É um aviso de UI para evitar exposição acidental em
  -- relatório/print — NÃO é controle de acesso: qualquer um que abra a tela vê.
  cota_confidencial boolean not null default false,
  cota_paga boolean not null default false,
  data_confirmacao date,
  brindes_qtd int not null default 0,
  brindes_ok boolean not null default false,
  premio_descricao text,
  premio_valor numeric(12,2),
  promotor_nome text,
  promotor_confirmado boolean not null default false,
  estrutura_ok boolean not null default false,
  -- Destaque no material gráfico, sem citar valor (contrapartida da cota maior).
  apoio_master boolean not null default false,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (evento_id, marca)
);

create table if not exists public.evento_convidados (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  nome text not null,
  telefone text,
  -- Código do cliente no ERP, quando veio de uma carteira.
  cliente_id text,
  vendedor_cod text,
  vendedor_nome text,
  carteira text check (carteira in ('B2B', 'B2C', 'Perdido')),
  status text not null default 'pendente'
    check (status in ('pendente', 'confirmado', 'recusado')),
  -- Só quem confirma recebe voucher e número da sorte.
  voucher_numero text,
  numero_sorteio int,
  lembrete_d7 boolean not null default false,
  lembrete_d2 boolean not null default false,
  presente boolean not null default false,
  checkin_at timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Número da sorte não pode repetir dentro do mesmo evento.
create unique index if not exists evento_convidados_sorteio_uniq
  on public.evento_convidados (evento_id, numero_sorteio)
  where numero_sorteio is not null;

create index if not exists evento_convidados_evento_idx
  on public.evento_convidados (evento_id);

create table if not exists public.evento_fases (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  ordem int not null,
  periodo text not null,
  fase text not null,
  entregas text,
  data_inicio date,
  data_fim date,
  status text not null default 'pendente'
    check (status in ('pendente', 'em_andamento', 'concluida')),
  created_at timestamptz not null default now()
);

create table if not exists public.evento_tarefas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos(id) on delete cascade,
  -- Agrupador da lista (ex: "Julho", "Dia do evento", "Pós-evento").
  grupo text not null,
  ordem int not null default 0,
  titulo text not null,
  responsavel_id uuid references public.usuarios(id),
  feito boolean not null default false,
  feito_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists evento_tarefas_evento_idx
  on public.evento_tarefas (evento_id);
