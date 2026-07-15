-- Adiciona telefone, whatsapp e ramal na tabela de usuários para que os dados
-- fiquem disponíveis para todos os módulos e para a assinatura de e-mail
-- (antes só ficavam no user_metadata do Auth).
alter table public.usuarios
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists ramal text;
