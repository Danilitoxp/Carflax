-- Guarda o mecanismo de entrada do lead informado pelo WhatsApp
-- (ex.: click_to_chat_link, phone_number_hyperlink, ctwa/anúncio Meta).
-- Capturado no webhook server-side, independente de ter o HUB aberto.
alter table public.marketing_clientes
  add column if not exists conversion_source text;
