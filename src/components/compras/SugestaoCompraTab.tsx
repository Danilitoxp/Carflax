import { useState, useMemo } from "react";
import { ShoppingCart, Search, Lightbulb } from "lucide-react";
import type { VendaGrande } from "@/lib/api";

interface SugestaoCompraTabProps {
  vendasGrandes: VendaGrande[];
  onNovaCotacao: (item: VendaGrande) => void;
}

export function SugestaoCompraTab({
  vendasGrandes,
  onNovaCotacao,
}: SugestaoCompraTabProps) {
  const [busca, setBusca] = useState("");
  const [bufferPercent, setBufferPercent] = useState<number>(20); // 20% margem de segurança

  const brNum = (n: number, dec = 0) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  const sugestoes = useMemo(() => {
    const q = busca.trim().toLowerCase();

    return vendasGrandes
      .filter((v) => !q || v.item.toLowerCase().includes(q) || v.cod_item.includes(q))
      .map((v) => {
        const consumoDiario = Math.max(0.5, (v.qtd || v.media_item) / 30);
        const leadTimeDias = 12;
        const estoqueSeguranca = Math.ceil(consumoDiario * leadTimeDias);
        const pontoPedido = Math.ceil(estoqueSeguranca * (1 + bufferPercent / 100));
        const estoqueAtual = v.estoque_atual ?? 0;
        const qtdRecomendada = Math.max(
          10,
          Math.ceil(pontoPedido - (estoqueAtual > 0 ? estoqueAtual : 0))
        );

        const statusUrgencia =
          estoqueAtual <= 0
            ? "CRITICO"
            : estoqueAtual < estoqueSeguranca
            ? "ALERTA"
            : "OK";

        return {
          ...v,
          consumoDiario,
          leadTimeDias,
          estoqueSeguranca,
          pontoPedido,
          qtdRecomendada,
          statusUrgencia,
        };
      });
  }, [vendasGrandes, busca, bufferPercent]);

  return (
    <div className="space-y-4">
      {/* Minimal Header Banner */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black uppercase tracking-tight text-foreground flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Sugestão de Reposição & Estoque de Segurança
            </h2>
            <p className="text-xs text-muted-foreground">
              Cálculo automatizado do Ponto de Pedido (ROP) baseado no consumo histórico e estoque atual.
            </p>
          </div>

          {/* Buffer Select */}
          <div className="flex items-center gap-2 bg-secondary/50 border border-border/60 rounded-xl px-3 h-10 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Margem ROP
            </span>
            <select
              value={bufferPercent}
              onChange={(e) => setBufferPercent(Number(e.target.value))}
              className="bg-transparent outline-none text-xs font-bold text-primary cursor-pointer"
            >
              <option value={10}>+ 10% (Normal)</option>
              <option value={20}>+ 20% (Recomendado)</option>
              <option value={30}>+ 30% (Conservador)</option>
              <option value={50}>+ 50% (Segurança Alta)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por produto..."
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="text-xs font-bold text-muted-foreground">
          <span className="text-foreground font-black">{sugestoes.length}</span> sugestões
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[850px]">
            <thead>
              <tr className="border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-secondary/30">
                <th className="py-3 px-4 text-left">Produto / Cód</th>
                <th className="py-3 px-4 text-center">Consumo Diário</th>
                <th className="py-3 px-4 text-center">Estoque Atual</th>
                <th className="py-3 px-4 text-center">Est. Segurança</th>
                <th className="py-3 px-4 text-center">Ponto Pedido (ROP)</th>
                <th className="py-3 px-4 text-center">Compra Sugerida</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {sugestoes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    Nenhum item pendente de reposição
                  </td>
                </tr>
              ) : (
                sugestoes.map((s, idx) => (
                  <tr key={`${s.cod_item}-${idx}`} className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors">
                    {/* Produto */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-foreground leading-tight">{s.item}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">
                        #{s.cod_item} {s.marca ? `· ${s.marca}` : ""}
                      </p>
                    </td>

                    {/* Consumo Diário */}
                    <td className="py-3 px-4 text-center tabular-nums text-xs">
                      {brNum(s.consumoDiario, 1)} un/dia
                    </td>

                    {/* Estoque Atual */}
                    <td className="py-3 px-4 text-center font-black text-xs">
                      <span
                        className={
                          s.statusUrgencia === "CRITICO"
                            ? "text-rose-500"
                            : s.statusUrgencia === "ALERTA"
                            ? "text-amber-500"
                            : "text-emerald-500"
                        }
                      >
                        {s.estoque_atual == null ? "0" : brNum(s.estoque_atual)} un
                      </span>
                    </td>

                    {/* Est. Segurança */}
                    <td className="py-3 px-4 text-center text-muted-foreground text-xs tabular-nums">
                      {brNum(s.estoqueSeguranca)} un
                    </td>

                    {/* ROP */}
                    <td className="py-3 px-4 text-center font-bold text-primary text-xs tabular-nums">
                      {brNum(s.pontoPedido)} un
                    </td>

                    {/* Qtd Recomendada */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary font-black text-xs border border-primary/20">
                        {brNum(s.qtdRecomendada)} un
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNovaCotacao(s)}
                        className="px-3 py-1 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Cotar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
