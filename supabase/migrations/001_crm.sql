CREATE TABLE IF NOT EXISTS crm_orcamentos (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  documento           TEXT        NOT NULL,
  empresa             TEXT        NOT NULL DEFAULT '001',
  status_crm          TEXT        NOT NULL DEFAULT 'Emitido',
  motivo_perda        TEXT,
  concorrente         TEXT,
  lembrete_data       TEXT,
  vendedor            TEXT,
  vendedor_codigo     TEXT,
  endereco_obra       TEXT,
  fechamento_previsto TEXT,
  entrega_prevista    TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (documento, empresa)
);

CREATE TABLE IF NOT EXISTS crm_conversas (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  documento        TEXT        NOT NULL,
  empresa          TEXT        NOT NULL DEFAULT '001',
  obs              TEXT        NOT NULL,
  enviado_por      TEXT,
  enviado_por_nome TEXT        NOT NULL DEFAULT 'Sistema',
  enviado_por_foto TEXT,
  timestamp        TIMESTAMPTZ DEFAULT NOW(),
  lida             BOOLEAN     DEFAULT FALSE,
  fechada          BOOLEAN     DEFAULT FALSE,
  destino          TEXT        DEFAULT 'todos'
);

CREATE INDEX IF NOT EXISTS idx_crm_orcamentos_documento ON crm_orcamentos (documento);
CREATE INDEX IF NOT EXISTS idx_crm_conversas_documento  ON crm_conversas  (documento);
