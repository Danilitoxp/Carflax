-- Migration: Blog / Cards de Depoimentos para a Seção de Marketing do HUB
create table if not exists public.marketing_blog_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  designation text,
  quote text not null,
  src text not null,
  tags text[] default array[]::text[],
  active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Habilita RLS
alter table public.marketing_blog_cards enable row level security;

-- Política de leitura pública (para o site externo / cards.html poder carregar sem login)
create policy "Leitura publica de cards de blog"
  on public.marketing_blog_cards
  for select
  using (true);

-- Política de escrita para gestão no HUB
create policy "Gestao de cards de blog"
  on public.marketing_blog_cards
  for all
  using (true);

-- Dados iniciais (Seed)
insert into public.marketing_blog_cards (title, designation, quote, src, tags, order_index)
values
  (
    'Tamar Mendelson',
    'Crítica Gastronômica',
    'Fiquei muito impressionada com a qualidade e o sabor! Dá para perceber o cuidado com cada detalhe. O atendimento foi impecável e com certeza voltarei sempre!',
    'https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3',
    array['Destaque', 'Gastronomia', 'Avaliação 5★'],
    1
  ),
  (
    'Joe Charlescraft',
    'Cliente Frequente',
    'Este lugar superou todas as minhas expectativas! O ambiente é super acolhedor e a equipe realmente vai além para proporcionar a melhor experiência possível.',
    'https://images.unsplash.com/photo-1628749528992-f5702133b686?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3',
    array['Depoimento', 'Experiência'],
    2
  ),
  (
    'Martina Edelweist',
    'Cliente Satisfeita',
    'Um verdadeiro achado! O atendimento atencioso e a atenção minuciosa aos detalhes tornaram nosso momento inesquecível. Recomendo fortemente a todos!',
    'https://images.unsplash.com/photo-1524267213992-b76e8577d046?q=80&w=1368&auto=format&fit=crop&ixlib=rb-4.0.3',
    array['Recomendado', 'Clientes'],
    3
  )
on conflict (id) do nothing;
