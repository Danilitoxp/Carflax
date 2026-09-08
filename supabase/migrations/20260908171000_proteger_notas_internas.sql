-- Impede que notas internas (prefixo note_ ou tipo internal_note) sejam
-- sobrescritas acidentalmente por webhooks, ecos de WebSocket ou upserts com tipo 'text'.

create or replace function public.proteger_nota_interna()
returns trigger as $$
begin
  if new.message_id like 'note_%' or (old is not null and old.tipo = 'internal_note') then
    new.tipo := 'internal_note';
    new.status := 'read';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_proteger_nota_interna on public.marketing_whatsapp;

create trigger trg_proteger_nota_interna
before insert or update on public.marketing_whatsapp
for each row
execute function public.proteger_nota_interna();
