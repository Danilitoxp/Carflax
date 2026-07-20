-- Adiciona coluna ramal à tabela usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ramal TEXT DEFAULT NULL;
