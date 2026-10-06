// Formatadores do Fechamento do tráfego (relatório da tela e modo apresentação).

export const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const brl0 = (v: number) => (v < 0 ? "−" : "") + "R$ " + Math.round(Math.abs(v)).toLocaleString("pt-BR");
export const int = (v: number) => Math.round(v).toLocaleString("pt-BR");
export const x1 = (v: number | null) => (v == null ? "—" : v.toFixed(1).replace(".", ",") + "×");
export const pct = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
export const dataBR = (iso: string) => iso.split("-").reverse().join("/");
export const nomeMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return t.charAt(0).toUpperCase() + t.slice(1); // "Agosto de 2026", não "Agosto De 2026"
};
export const CANAL: Record<string, string> = { google: "Google Ads", meta: "Meta Ads", outro: "Anúncio", sem_origem: "WhatsApp" };

/** Contra o que o mês é comparado: mês parcial = os mesmos dias do mês anterior. */
export function rotuloComparacao(anterior: { mes: string; periodo: { inicio: string; fim: string; parcial: boolean } } | null) {
  if (!anterior) return "mês anterior";
  if (!anterior.periodo.parcial) return "mês anterior";
  const [a, m] = anterior.mes.split("-").map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "long" });
  const ate = Number(anterior.periodo.fim.slice(8));
  return ate === 1 ? `1º de ${nome}` : `1º a ${ate} de ${nome}`;
}
