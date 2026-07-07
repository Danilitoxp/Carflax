-- Adiciona colunas para suportar citação/resposta de mensagens (quotes)
alter table public.marketing_whatsapp
  add column if not exists quoted_text text,
  add column if not exists quoted_sender text;
