-- Armazena o preview de link (Open Graph) que o WhatsApp já envia no payload das
-- mensagens recebidas (título, descrição e miniatura), para renderizar o card
-- rico no chat do HUB — inclusive após recarregar a página.
alter table public.marketing_whatsapp
  add column if not exists link_preview jsonb;
