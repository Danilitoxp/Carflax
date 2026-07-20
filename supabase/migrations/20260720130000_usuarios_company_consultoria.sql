-- A coluna company da tabela usuarios usa o tipo ENUM 'empresa'.
-- Adiciona 'Consultoria' como valor válido ao enum.
ALTER TYPE empresa ADD VALUE IF NOT EXISTS 'Consultoria';
