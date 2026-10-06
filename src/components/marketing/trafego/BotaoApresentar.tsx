import { useState } from "react";
import { Presentation } from "@phosphor-icons/react";
import { apiTrafegoFechamento, type TrafegoFechamento } from "@/lib/api";
import { marketingService, type ReportsAnalytics } from "@/lib/marketing-service";
import { FechamentoApresentacao } from "./FechamentoApresentacao";
import { nomeMes } from "./fechamento-formato";

const INICIO_REGISTRO = "2026-05";
type Evolucao ={ rotulo: string; investimento: number; faturamento: number; resultado: number };

const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
function mesAnterior(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function lerPremissa(chave: string, padrao: number) {
  try {
    const v = Number(localStorage.getItem(chave));
    return Number.isFinite(v) && v > 0 ? v : padrao;
  } catch {
    return padrao;
  }
}

/**
 * Abre a apresentação do fechamento do mês corrente (resultado depois de todos
 * os custos, com venda e custo reais do ERP), comparando com os mesmos dias do
 * mês anterior.
 */
export function BotaoApresentar({ onErro, apresentador }: { onErro: (msg: string) => void; apresentador?: { name: string; avatar?: string | null } | null }) {
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState<{ atual: TrafegoFechamento; anterior: TrafegoFechamento | null; marketing: ReportsAnalytics | null; evolucao: Evolucao[] } | null>(null);

  async function abrir() {
    setCarregando(true);
    try {
      const hoje = hojeSP();
      const mes = hoje.slice(0, 7);
      const impostos = lerPremissa("gt-impostos", 7.2);
      const taxas = lerPremissa("gt-taxas", 3);
      const [atual, anterior, marketing] = await Promise.all([
        apiTrafegoFechamento(mes, impostos, taxas),
        apiTrafegoFechamento(mesAnterior(mes), impostos, taxas, false, Number(hoje.slice(8, 10))).catch(() => null),
        // Já vem com os mesmos dias do mês anterior em `previous`.
        marketingService.getReportsAnalytics(new Date(`${mes}-01T00:00:00`), new Date(`${hoje}T23:59:59`)).catch(() => null),
      ]);
      // Evolução do ano: meses fechados vêm do cache do servidor; o atual já está em mãos.
      // Antes de maio/26 as vendas do tráfego não eram registradas no HUB: o gráfico começa ali.
      const anteriores = Array.from({ length: Number(mes.slice(5, 7)) - 1 }, (_, i) => `${mes.slice(0, 4)}-${String(i + 1).padStart(2, "0")}`)
        .filter((m) => m >= INICIO_REGISTRO);
      const fechados = await Promise.all(anteriores.map((m) => apiTrafegoFechamento(m, impostos, taxas).catch(() => null)));
      // Notas emitidas (todos os clientes do tráfego): mesma base do slide "O que sobrou".
      const evolucao = [...fechados, atual]
        .filter((f): f is TrafegoFechamento => !!f && (f.investimento.total > 0 || f.resultadoTodos.faturamento > 0))
        .map((f) => ({
          rotulo: nomeMes(f.mes).slice(0, 3),
          investimento: f.investimento.total,
          faturamento: f.resultadoTodos.faturamento,
          resultado: f.resultadoTodos.resultado,
        }));
      setDados({ atual, anterior, marketing, evolucao });
    } catch (e) {
      onErro(`Não foi possível montar a apresentação: ${(e as Error).message}`);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <button type="button" className="gt-btn ghost" onClick={abrir} disabled={carregando}>
        <Presentation size={15} weight="bold" /> {carregando ? "Calculando…" : "Apresentar"}
      </button>
      {dados && <FechamentoApresentacao dados={dados.atual} anterior={dados.anterior} marketing={dados.marketing} evolucao={dados.evolucao} soNovos={false} apresentador={apresentador} onFechar={() => setDados(null)} />}
    </>
  );
}
