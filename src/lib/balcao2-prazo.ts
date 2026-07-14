/**
 * Regras de prazo dos pedidos de BALCÃO 2 (retirada B2).
 * O cliente tem 72h (3 dias) a partir da criação do pedido; faltando 1 dia (24h)
 * o vendedor e quem tiver a notificação de Retirada devem ser avisados.
 */

export const B2_PRAZO_MS = 72 * 60 * 60 * 1000; // 72 horas
export const B2_AVISO_MS = 24 * 60 * 60 * 1000; // faltando 1 dia

/** Um pedido é BALCÃO 2 quando movimentação = Retirada (R) e local = B2. */
export function isBalcao2(tipoMov?: string, localRet?: string): boolean {
  return (tipoMov || "").toUpperCase() === "R" && (localRet || "").toUpperCase() === "B2";
}

/** Converte data (yyyy-mm-dd...) + hora (HH:MM:SS) do ERP em timestamp de criação. */
export function parseOrderCreated(dtaent?: string, horent?: string): number | null {
  const dataPart = String(dtaent || "").substring(0, 10);
  if (!dataPart || dataPart.length < 10) return null;
  let horaPart = String(horent || "").substring(0, 8);
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(horaPart)) horaPart = "00:00:00";
  if (horaPart.length === 5) horaPart += ":00";
  const t = new Date(`${dataPart}T${horaPart}`).getTime();
  return isNaN(t) ? null : t;
}

/** Milissegundos restantes até o fim das 72h (negativo = atrasado). */
export function b2RemainingMs(createdMs: number, now: number = Date.now()): number {
  return createdMs + B2_PRAZO_MS - now;
}

/** Formata o tempo restante/atraso de forma curta (ex: "2d 4h", "18h 20min", "45min"). */
export function formatB2Remaining(ms: number): string {
  const overdue = ms < 0;
  const abs = Math.abs(ms);
  const totalMin = Math.floor(abs / 60000);
  const d = Math.floor(totalMin / (60 * 24));
  const h = Math.floor((totalMin % (60 * 24)) / 60);
  const m = totalMin % 60;

  let label: string;
  if (d > 0) label = `${d}d ${h}h`;
  else if (h > 0) label = `${h}h ${m}min`;
  else label = `${m}min`;

  return overdue ? `Atrasado ${label}` : label;
}
