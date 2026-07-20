-- Campanha de avaliações Google: cada vendedor tem um QR que leva a uma página
-- pública (/avaliar?vendedor=COD). O scan registra a intenção aqui; a avaliação
-- em si só existe do lado do Google.
--
-- IMPORTANTE (limite do Google): a avaliação do Google NÃO carrega de qual QR
-- veio, nem identifica o cliente de forma confiável. Por isso o ponto do
-- vendedor NÃO sai do scan — sai de uma avaliação do Google *confirmada* como
-- sendo daquele scan (feito na Camada 2, por reconciliação + confirmação humana).

-- Cada leitura de QR / abertura da página de avaliação.
create table if not exists public.avaliacao_scans (
  id uuid primary key default gen_random_uuid(),
  vendedor_cod text not null,
  vendedor_nome text,
  -- Cliente é opcional: nem todo mundo se identifica antes de ir ao Google.
  cliente_nome text,
  cliente_telefone text,
  user_agent text,
  created_at timestamptz not null default now(),
  -- Preenchidos na Camada 2 quando este scan é casado com uma avaliação real.
  review_id text,
  matched_at timestamptz
);

create index if not exists avaliacao_scans_vendedor_idx on public.avaliacao_scans (vendedor_cod);
create index if not exists avaliacao_scans_created_idx  on public.avaliacao_scans (created_at);

-- Avaliações puxadas do Google (Camada 2). Fica vazia até a sincronização estar
-- ligada. `review_id` é o id do Google — chave natural, garante idempotência do
-- sync (upsert não duplica).
create table if not exists public.avaliacao_reviews (
  review_id text primary key,
  star_rating int,
  reviewer_name text,
  comment text,
  review_create_date date,
  review_reply_comment text,
  location_id text,
  synced_at timestamptz not null default now(),
  -- Atribuição ao vendedor: só depois de confirmada. Sem isso, a avaliação
  -- existe mas não pontua ninguém.
  scan_id uuid references public.avaliacao_scans(id) on delete set null,
  vendedor_cod text,
  matched_at timestamptz,
  matched_by uuid references public.usuarios(id)
);

create index if not exists avaliacao_reviews_vendedor_idx on public.avaliacao_reviews (vendedor_cod);
create index if not exists avaliacao_reviews_matched_idx  on public.avaliacao_reviews (matched_at);

-- RLS liberado geral, igual ao resto do projeto. A página pública insere scans
-- com a chave anon, então insert precisa ser aberto.
alter table public.avaliacao_scans   enable row level security;
alter table public.avaliacao_reviews enable row level security;

do $$
declare t text;
begin
  foreach t in array array['avaliacao_scans', 'avaliacao_reviews'] loop
    execute format('create policy "%1$s_select_all" on public.%1$I for select using (true)', t);
    execute format('create policy "%1$s_insert_all" on public.%1$I for insert with check (true)', t);
    execute format('create policy "%1$s_update_all" on public.%1$I for update using (true) with check (true)', t);
    execute format('create policy "%1$s_delete_all" on public.%1$I for delete using (true)', t);
  end loop;
end $$;
