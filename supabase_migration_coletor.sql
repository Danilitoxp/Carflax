-- 1. Criar tabela de Armazenamento
CREATE TABLE IF NOT EXISTS coletor_armazenamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conferencia_id TEXT NOT NULL,
  fornecedor TEXT,
  status TEXT DEFAULT 'PENDENTE',
  empresa_id TEXT,
  operador TEXT,
  operador_nome TEXT,
  itens JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar tabela de Conferência (Sessões Realtime)
CREATE TABLE IF NOT EXISTS coletor_conferencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conferencia_id TEXT NOT NULL,
  produto_codigo TEXT NOT NULL,
  operador TEXT,
  operador_nome TEXT,
  empresa TEXT,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  qtde_conferida INTEGER DEFAULT 0,
  qtde_total INTEGER DEFAULT 0
);

-- 3. Criar tabela de Separação (Picking)
CREATE TABLE IF NOT EXISTS coletor_separacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id TEXT NOT NULL,
  operador TEXT,
  operador_nome TEXT,
  empresa TEXT,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  qtde_separada INTEGER DEFAULT 0,
  qtde_total INTEGER DEFAULT 0
);

-- 4. Adicionar coluna de permissões do coletor na tabela de usuários
-- Usaremos JSONB para ser flexível (pode guardar {can_inventario: true, can_separacao: false, ...})
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS coletor_permissions JSONB DEFAULT '{}'::jsonb;

-- 5. Habilitar Realtime para as novas tabelas (Idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'coletor_armazenamento') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE coletor_armazenamento;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'coletor_conferencia') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE coletor_conferencia;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'coletor_separacao') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE coletor_separacao;
  END IF;
END $$;

-- Comentários para ajudar no gerenciamento
COMMENT ON TABLE coletor_armazenamento IS 'Tabela migrada do projeto Coletor - Controla NFs aguardando armazenamento';
COMMENT ON TABLE coletor_conferencia IS 'Tabela migrada do projeto Coletor - Controla sessões de conferência em tempo real';
COMMENT ON TABLE coletor_separacao IS 'Tabela migrada do projeto Coletor - Controla sessões de picking/separação em tempo real';
