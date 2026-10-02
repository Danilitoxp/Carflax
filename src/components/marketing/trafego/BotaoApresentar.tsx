import { useState } from "react";
import { Presentation } from "@phosphor-icons/react";
import { apiTrafegoFechamento, type TrafegoFechamento } from "@/lib/api";
import { FechamentoApresentacao } from "./FechamentoApresentacao";

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
  const [dados, setDados] = useState<{ atual: TrafegoFechamento; anterior: TrafegoFechamento | null } | null>(null);

  async function abrir() {
    setCarregando(true);
    try {
      const hoje = hojeSP();
      const mes = hoje.slice(0, 7);
      const impostos = lerPremissa("gt-impostos", 7.2);
      const taxas = lerPremissa("gt-taxas", 3);
      const [atual, anterior] = await Promise.all([
        apiTrafegoFechamento(mes, impostos, taxas),
        apiTrafegoFechamento(mesAnterior(mes), impostos, taxas, false, Number(hoje.slice(8, 10))).catch(() => null),
      ]);
      setDados({ atual, anterior });
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
      {dados && <FechamentoApresentacao dados={dados.atual} anterior={dados.anterior} soNovos apresentador={apresentador} onFechar={() => setDados(null)} />}
    </>
  );
}
