-- Adiciona os novos valores ao tipo ENUM event_type da tabela eventos_calendario.
-- No frontend (EventModal / EventsView), as categorias Reunião Geral, Pagamento / Financeiro,
-- Urgente / Importante, Lançamento / Novidade e Feriado já estão implementadas, mas
-- ao tentar salvar no banco o Postgres retornava erro:
-- "invalid input value for enum event_type: <meeting|finance|important|launch|holiday>"

alter type event_type add value if not exists 'meeting';
alter type event_type add value if not exists 'finance';
alter type event_type add value if not exists 'important';
alter type event_type add value if not exists 'launch';
alter type event_type add value if not exists 'holiday';
