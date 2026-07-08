-- Idempotência da notificação de "PERDA DE ORÇAMENTO" via WhatsApp.
-- Marca quando o alerta de perda já foi disparado para os responsáveis, evitando
-- reenvios do mesmo orçamento (ex.: remarcar como PERDIDO, recarregar a página,
-- ou disparos concorrentes em sessões diferentes).
alter table public.crm_status
  add column if not exists perda_notificada_em timestamptz;
