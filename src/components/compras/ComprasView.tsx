import { useEffect, useMemo, useRef, useState } from "react";
import { Truck, AlertTriangle, RefreshCw, Lightbulb, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import {
  apiComprasLeadTime,
  apiComprasVendasGrandes,
  type FornecedorLeadTime,
  type VendaGrande,
} from "@/lib/api";

import { ComprasHeader } from "./ComprasHeader";
import { LeadTimeTab } from "./LeadTimeTab";
import { RecompraTab } from "./RecompraTab";
import { ReposicaoTab } from "./ReposicaoTab";
import { FornecedorDetalhesModal } from "./FornecedorDetalhesModal";
import { SimuladorCompraModal } from "./SimuladorCompraModal";

type Tab = "leadtime" | "alertas" | "sugestoes";

export function ComprasView() {
  const [tab, setTab] = useState<Tab>("leadtime");
  const [lead, setLead] = useState<FornecedorLeadTime[]>([]);
  const [vendas, setVendas] = useState<VendaGrande[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Alertas controls
  const [dias, setDias] = useState(30);
  const [fator, setFator] = useState(5);

  // Modals
  const [selectedFornecedor, setSelectedFornecedor] = useState<FornecedorLeadTime | null>(null);
  const [simuladorOpen, setSimuladorOpen] = useState(false);
  const [simuladorItemAlert, setSimuladorItemAlert] = useState<VendaGrande | null>(null);
  const [simuladorFornecedor, setSimuladorFornecedor] = useState<FornecedorLeadTime | null>(null);

  // O Lead Time (fornecedores) NÃO depende de dias/fator — só de Recompra depende.
  // Por isso carregamos o lead time uma vez e refazemos apenas as vendas quando o
  // filtro muda, evitando um scan pesado desnecessário a cada ajuste.
  const carregar = async ({ lead = true }: { lead?: boolean } = {}) => {
    setLoading(true);
    setErro(null);
    try {
      const [lt, vg] = await Promise.all([
        lead ? apiComprasLeadTime(6) : Promise.resolve(null),
        apiComprasVendasGrandes({ dias, fator, piso: 10 }),
      ]);
      if (lt) setLead(lt.success ? lt.data : []);
      setVendas(vg.success ? vg.data : []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar dados de compras.");
    } finally {
      setLoading(false);
    }
  };

  const primeiraCarga = useRef(true);
  useEffect(() => {
    // Primeira montagem: carrega tudo. Mudança de dias/fator: só as vendas.
    carregar({ lead: primeiraCarga.current });
    primeiraCarga.current = false;
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [dias, fator]);

  // KPIs
  const kpis = useMemo(() => {
    const totalPedidos = lead.reduce((s, f) => s + f.pedidos, 0);
    const mediaGeral =
      totalPedidos > 0
        ? lead.reduce((s, f) => s + f.media_dias * f.pedidos, 0) / totalPedidos
        : 0;
    const lentos = lead.filter((f) => f.media_dias > 20).length;
    const estoqueCritico = vendas.filter(
      (v) => v.estoque_atual != null && v.estoque_atual <= 0
    ).length;

    return {
      totalPedidos,
      mediaGeral,
      lentos,
      estoqueCritico,
      totalAlertas: vendas.length,
      fornecedoresTotal: lead.length,
    };
  }, [lead, vendas]);

  const handleOpenDetalhesFornecedor = (fornecedor: FornecedorLeadTime) => {
    setSelectedFornecedor(fornecedor);
  };

  const handleOpenSimuladorFornecedor = (fornecedor: FornecedorLeadTime) => {
    setSimuladorFornecedor(fornecedor);
    setSimuladorItemAlert(null);
    setSimuladorOpen(true);
  };

  const handleOpenSimuladorItem = (item: VendaGrande) => {
    setSimuladorItemAlert(item);
    setSimuladorFornecedor(null);
    setSimuladorOpen(true);
  };

  const handleNovaCotacaoAvulsa = () => {
    setSimuladorItemAlert(null);
    setSimuladorFornecedor(null);
    setSimuladorOpen(true);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const leadTimeRows = lead.map((f) => ({
      Código: f.cod_fornecedor,
      Fornecedor: f.fornecedor,
      "Pedidos (6m)": f.pedidos,
      "Lead Time Médio (Dias)": Number(f.media_dias.toFixed(1)),
      "Min Dias": f.min_dias,
      "Max Dias": f.max_dias,
      "Última Entrada": f.ultima_entrada || "N/A",
      Status:
        f.media_dias <= 7
          ? "Rápido"
          : f.media_dias <= 20
          ? "Médio"
          : "Gargalo/Lento",
    }));
    const wsLead = XLSX.utils.json_to_sheet(leadTimeRows);
    XLSX.utils.book_append_sheet(wb, wsLead, "Lead Time Fornecedores");

    const alertasRows = vendas.map((v) => ({
      Pedido: v.documento,
      Data: v.data,
      "Cód Item": v.cod_item,
      Produto: v.item,
      Marca: v.marca || "",
      Cliente: v.cliente,
      "Qtd Vendida": v.qtd,
      "Média Histórica": Number(v.media_item.toFixed(1)),
      "Pico (x Média)": Number(v.ratio.toFixed(1)),
      "Estoque Atual": v.estoque_atual ?? 0,
      "Status Estoque":
        v.estoque_atual != null && v.estoque_atual <= 0
          ? "CRÍTICO RUPTURA"
          : "RECOMPRA",
      Valor: v.valor,
    }));
    const wsAlertas = XLSX.utils.json_to_sheet(alertasRows);
    XLSX.utils.book_append_sheet(wb, wsAlertas, "Alertas Recompra");

    const dataAtual = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Planejamento_Compras_${dataAtual}.xlsx`);
  };

  const TABS: { id: Tab; label: string; count?: number; icon: React.ElementType }[] = [
    { id: "leadtime", label: "Lead Time", count: lead.length, icon: Truck },
    { id: "alertas", label: "Recompra", count: vendas.length, icon: AlertTriangle },
    { id: "sugestoes", label: "Reposição", icon: Lightbulb },
  ];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="w-full flex flex-col min-h-0 flex-1 px-6 md:px-8 pt-6">
        {/* Header */}
        <ComprasHeader
          loading={loading}
          onRefresh={() => carregar({ lead: true })}
          onExport={handleExportExcel}
          onNovaCotacao={handleNovaCotacaoAvulsa}
          kpis={kpis}
        />

        {/* Minimal Tabs (Estilo Separação / Conferência) */}
        <div className="shrink-0 flex items-center gap-1 border-b border-border mt-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative px-4 py-3 text-[11px] font-black uppercase tracking-wider transition-colors flex items-center gap-2",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[9px] font-black",
                      isActive
                        ? t.id === "alertas"
                          ? "bg-rose-500 text-white"
                          : "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {t.count}
                  </span>
                )}
                {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-1 scrollbar-hide">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-primary">
                Carregando dados de compras...
              </span>
            </div>
          ) : erro ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center">
                <Hourglass className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-black uppercase tracking-tight text-foreground">{erro}</p>
              <button
                onClick={() => carregar({ lead: true })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" /> Tentar novamente
              </button>
            </div>
          ) : tab === "leadtime" ? (
            <LeadTimeTab
              leadTimeData={lead}
              onOpenDetalhes={handleOpenDetalhesFornecedor}
              onNovaCotacao={handleOpenSimuladorFornecedor}
            />
          ) : tab === "alertas" ? (
            <RecompraTab
              rows={vendas}
              dias={dias}
              setDias={setDias}
              fator={fator}
              setFator={setFator}
              onNovaCotacao={handleOpenSimuladorItem}
            />
          ) : (
            <ReposicaoTab />
          )}
        </div>
      </div>

      {/* Modals */}
      <FornecedorDetalhesModal
        fornecedor={selectedFornecedor}
        onClose={() => setSelectedFornecedor(null)}
        onNovaCotacao={handleOpenSimuladorFornecedor}
      />

      {simuladorOpen && (
        <SimuladorCompraModal
          itemAlert={simuladorItemAlert}
          fornecedorInitial={simuladorFornecedor}
          fornecedores={lead}
          onClose={() => setSimuladorOpen(false)}
        />
      )}
    </div>
  );
}
