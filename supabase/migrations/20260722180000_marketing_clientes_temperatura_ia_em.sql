-- Cooldown de classificação de temperatura por IA (server-side, no webhook).
-- Guarda o instante da última chamada de IA para um lead, evitando reprocessar
-- a IA em trocas rápidas de mensagens. A heurística (regras) roda sempre, de graça.
ALTER TABLE marketing_clientes
  ADD COLUMN IF NOT EXISTS temperatura_ia_em timestamptz;
