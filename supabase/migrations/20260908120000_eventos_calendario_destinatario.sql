-- Permite direcionar um evento do calendário a um setor específico ou a uma
-- pessoa específica, em vez de sempre aparecer para todo mundo. Sem nenhum
-- dos dois preenchidos, o evento continua público (comportamento atual).
alter table eventos_calendario
  add column if not exists setor_destino text,
  add column if not exists usuario_destino_id uuid references usuarios(id);
