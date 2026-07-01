-- Necessário pro postgres_changes do sidebar detectar novos subquadros em tempo real.
alter publication supabase_realtime add table public.esteira_subquadros;
