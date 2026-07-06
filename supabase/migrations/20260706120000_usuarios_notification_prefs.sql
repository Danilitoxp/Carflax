-- Preferências de notificação por usuário: define o que cada pessoa quer ver
-- no HUB (comunicados no geral, alteração de preço, produtos que chegaram,
-- eventos, alertas etc.). Guardado como JSON para evoluir sem novas migrações
-- a cada tipo novo de aviso. A tela de Configurações > Notificações grava aqui.
alter table public.usuarios
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
