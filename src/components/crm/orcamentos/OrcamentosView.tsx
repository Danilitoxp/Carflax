import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Package,
  MessageSquare,
  X,
  Send,
  Handshake,
  XCircle,
  Download,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import {
  User as UserIcon,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { apiCrmOrcamentos, type CrmOrcamento, type CrmItem } from "@/lib/api";
import {
  getCrmStatusMap,
  upsertCrmStatus,
  addConversa,
  type CrmStatus,
} from "@/lib/crm-service";

export interface Orcamento {
  id: string;
  seller: string;
  client: string;
  date: string;
  time: string;
  total: string;
  markup: string;
  status: string;
  totalValue: number;
  markupValue: number;
  lossReason?: string;
  lembreteData?: string;
  empresa?: string;
  items: CrmItem[];
}


interface UserProfile {
  id?: string;
  name: string;
  role: string;
  avatar?: string;
}

function parseName(raw: string): string {
  // Remove apenas o código inicial (tudo antes do primeiro dash)
  const clean = raw.includes("-") 
    ? raw.slice(raw.indexOf("-") + 1).trim() 
    : raw.trim();
  
  // Se o resultado for apenas uma letra (ex: "G" de GERAL), retorna o original limpo
  // mas vamos garantir que pegamos as palavras corretamente
  const parts = clean.split(/\s+/).filter(p => p.length > 0);
  if (parts.length <= 2) return clean;
  return `${parts[0]} ${parts[1]}`;
}

function parseOrcamentos(raw: CrmOrcamento[]): Orcamento[] {
  return raw.map((r) => {
    const id = r.ORCAMENTO;
    const total = parseFloat(r.VALOR_TOTAL_ORCAMENTO) || 0;
    
    // Calcular markup médio do orçamento baseado nos produtos
    const products = r.PRODUTOS || [];
    const avgMarkup = products.length > 0 
      ? products.reduce((acc, p) => acc + (parseFloat(String(p.MARKUP_PERCENTUAL)) || 0), 0) / products.length
      : 0;

    const dateObj = r.DATA_ORCAMENTO ? new Date(r.DATA_ORCAMENTO) : null;
    const dateBR = dateObj
      ? dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const hora = String(r.HORA_ORCAMENTO || "00:00:00").slice(0, 5);

    let defaultStatus = "EMITIDO";
    if (r.MOTIVO_CANCELAMENTO !== "SEM MOTIVO") defaultStatus = "PERDIDO";
    else if (r.PEDIDO === "Sim" || r.NOTA_FISCAL || (r.DATA_BAIXA && r.DATA_BAIXA !== "SEM DATA")) defaultStatus = "VENDA";

    return {
      id,
      seller: parseName(r.VENDEDOR),
      client: parseName(r.CLIENTE),
      date: dateBR,
      time: hora,
      total: total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      markup: `${avgMarkup.toFixed(1)}%`,
      status: defaultStatus,
      totalValue: total,
      markupValue: avgMarkup,
      lossReason: r.MOTIVO_CANCELAMENTO !== "SEM MOTIVO" ? r.MOTIVO_CANCELAMENTO : undefined,
      empresa: r.EMPRESA,
      items: products
    };
  });
}

function isGerente(role?: string) {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes("gerente") || r.includes("diretor") || r.includes("marketing") || r.includes("admin");
}

interface RowProps {
  item: Orcamento;
  onOpenItems: (o: Orcamento) => void;
  onOpenStatus: (o: Orcamento) => void;
  onOpenChat: (o: Orcamento) => void;
}

const OrcamentoRow = memo(({ item, onOpenItems, onOpenStatus, onOpenChat }: RowProps) => {
  return (
    <tr className="hover:bg-slate-50/50 transition-colors group">
      <td className="px-6 py-4">
        <span className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">
          {item.id.replace("-OR", "")}
        </span>
      </td>
      <td className="px-6 py-4"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{item.seller}</span></td>
      <td className="px-6 py-4"><span className="text-[11px] font-black text-slate-800 uppercase tracking-tighter transition-colors group-hover:text-blue-600">{item.client}</span></td>
      <td className="px-6 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold text-slate-600 whitespace-nowrap">{item.date}</span>
          <span className="text-[9px] font-medium text-slate-400">{item.time}</span>
        </div>
      </td>
      <td className="px-6 py-4"><span className="text-[11px] font-black text-emerald-600 whitespace-nowrap">{item.total}</span></td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-[11px] font-black text-slate-700">{item.markup}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col items-center gap-1">
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (item.status !== "VENDA" && item.status !== "PERDIDO") onOpenStatus(item);
            }}
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-tight transition-all",
              item.status !== "VENDA" && item.status !== "PERDIDO" ? "cursor-pointer hover:brightness-110 active:scale-95" : "cursor-default opacity-80",
              item.status === "VENDA" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
              item.status === "EMITIDO" ? "bg-slate-50 text-slate-600 border border-slate-100" :
              item.status === "ENVIADO" ? "bg-blue-50 text-blue-600 border border-blue-100" :
              item.status === "NEGOCIAÇÃO" ? "bg-amber-50 text-amber-600 border border-amber-100" :
              item.status === "LIB. CRÉDITO" ? "bg-orange-50 text-orange-600 border border-orange-100" :
              item.status === "AGUARD. PEDIDO" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" :
              item.status === "PERDIDO" ? "bg-rose-50 text-rose-600 border border-rose-100" :
              "bg-slate-50 text-slate-500 border border-slate-100"
            )}
          >
            {item.status}
          </div>
          {item.status === "PERDIDO" && (
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{item.lossReason || "Não Informado"}</span>
          )}
          {(item.status === "ENVIADO" || item.status === "NEGOCIAÇÃO") && item.lembreteData && (() => {
            const raw = item.lembreteData!;
            const display = /^\d{2}\/\d{2}\/\d{4}$/.test(raw)
              ? raw
              : /^\d{4}-\d{2}-\d{2}/.test(raw)
              ? raw.slice(8, 10) + "/" + raw.slice(5, 7) + "/" + raw.slice(0, 4)
              : (() => { const d = new Date(raw); return isNaN(d.getTime()) ? raw : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); })();
            const color = item.status === "NEGOCIAÇÃO" ? "text-amber-400" : "text-blue-400";
            return (
              <div className={`flex items-center gap-0.5 text-[8px] font-bold ${color}`}>
                <Calendar className="w-2.5 h-2.5" />
                <span>{display}</span>
              </div>
            );
          })()}
        </div>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onOpenItems(item)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all"
            title="Ver Itens"
          >
            <Package className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onOpenChat(item)}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all"
            title="Conversas / Observações"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

export function OrcamentosView({ userProfile }: { userProfile?: UserProfile }) {
  const [orçamentosData, setOrçamentosData] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(false);
  const visibleCount = 50;

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({ key: "id", direction: "desc" });
  const [filterStatus, setFilterStatus] = useState("Todos os Status");
  const [filterSeller, setFilterSeller] = useState("Todos os Vendedores");
  const [filterReason, setFilterReason] = useState("Todos os Motivos");
  const [searchTerm, setSearchTerm] = useState("");

  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [itens, setItens] = useState<CrmItem[]>([]);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusStep, setStatusStep] = useState<"selection" | "enviado" | "negociacao" | "perdido">("selection");
  const [selectedItem, setSelectedItem] = useState<Orcamento | null>(null);

  // Status modal form state
  const [statusObs, setStatusObs] = useState("");
  const [statusData, setStatusData] = useState("");
  const [statusEnderecoObra, setStatusEnderecoObra] = useState("");
  const [statusFechamento, setStatusFechamento] = useState("");
  const [statusEntrega, setStatusEntrega] = useState("");
  const [statusMotivoPerdido, setStatusMotivoPerdido] = useState("");

  const [startDate, setStartDate] = useState<Date | null>(new Date(2026, 3, 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date(2026, 3, 30));

  // ── Fetch data ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.inicio = startDate.toISOString().slice(0, 10);
      if (endDate) params.fim = endDate.toISOString().slice(0, 10);

      const raw = await apiCrmOrcamentos(params);
      let orcamentos = parseOrcamentos(raw);

      // Vendedor só vê seus próprios orçamentos
      if (userProfile && !isGerente(userProfile.role)) {
        const nomeUser = (userProfile.name || "").toUpperCase();
        const palavras = nomeUser.split(" ").filter((p: string) => p.length > 2);
        orcamentos = orcamentos.filter((o) => {
          const vend = o.seller.toUpperCase();
          return palavras.some((p: string) => vend.includes(p));
        });
      }

      // Overlay with Supabase CRM status
      const docs = orcamentos.map((o) => o.id.trim());
      const statusMap = await getCrmStatusMap(docs);

      const merged = orcamentos.map((o) => {
        const crm = statusMap.get(o.id.trim());

        // Prioridade ABSOLUTA para o ERP se for VENDA ou PERDIDO
        if (o.status === "VENDA" || o.status === "PERDIDO") {
          if (!crm) return o;
          return {
            ...o,
            lossReason: crm.motivo_perda ?? o.lossReason,
            lembreteData: crm.lembrete_data ?? undefined,
          };
        }

        if (!crm) return o;

        // Para orçamentos em aberto (EMITIDO), o controle manual do CRM tem precedência
        return {
          ...o,
          status: crm.status_crm.toUpperCase(),
          lossReason: crm.motivo_perda ?? o.lossReason,
          lembreteData: crm.lembrete_data ?? undefined,
        };
      });

      setOrçamentosData(merged);
    } catch (e) {
      console.error("CRM fetch:", e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, userProfile]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Status update ────────────────────────────────────────────────────────



  // ── Status update ────────────────────────────────────────────────────────
  const handleUpdateStatus = async (newStatus: string, extra?: Partial<CrmStatus>) => {
    if (!selectedItem) return;
    
    // 1. Salvar Status
    await upsertCrmStatus({
      documento: selectedItem.id,
      empresa: selectedItem.empresa ?? "001",
      status_crm: newStatus,
      motivo_perda: extra?.motivo_perda ?? null,
      endereco_obra: extra?.endereco_obra ?? null,
      fechamento_previsto: extra?.fechamento_previsto ?? null,
      entrega_prevista: extra?.entrega_prevista ?? null,
      vendedor: selectedItem.seller,
    });

    // 2. Notificação Automática para o Centralizador
    const triggerStatuses = ["ENVIADO", "NEGOCIAÇÃO", "LIB. CRÉDITO", "AGUARD. PEDIDO", "PERDIDO"];
    if (triggerStatuses.includes(newStatus.toUpperCase())) {
      try {
        const { data: config } = await supabase
          .from("crm_config")
          .select("value")
          .eq("key", "centralizer_user_id")
          .maybeSingle();

        if (config?.value) {
          const statusEmblema: Record<string, string> = {
            "ENVIADO": "🔵 ENVIADO",
            "NEGOCIAÇÃO": "🤝 NEGOCIAÇÃO",
            "LIB. CRÉDITO": "💳 LIB. CRÉDITO",
            "AGUARD. PEDIDO": "⏳ AGUARD. PEDIDO",
            "PERDIDO": "❌ PERDIDO"
          };
          
          const msgFormatada = [
            `🔄 *STATUS ATUALIZADO*`,
            `📑 *Orçamento:* #${selectedItem.id.replace("-OR", "")}`,
            `🏢 *Cliente:* ${selectedItem.client}`,
            `👤 *Vendedor:* ${selectedItem.seller}`,
            ``,
            `📢 *Novo Status:* ${statusEmblema[newStatus.toUpperCase()] || newStatus.toUpperCase()}`,
            extra?.motivo_perda ? `📉 *Motivo da Perda:* ${extra.motivo_perda}` : "",
            statusObs ? `\n💬 *Obs:* ${statusObs}` : "",
          ].filter(Boolean).join("\n");

          await addConversa({
            documento: selectedItem.id,
            empresa: selectedItem.empresa ?? "001",
            obs: msgFormatada,
            enviado_por_nome: "SISTEMA",
            destino: config.value,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.error("Erro ao enviar notificação automática:", err);
      }
    }

    setOrçamentosData((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? { ...item, status: newStatus.toUpperCase(), lossReason: extra?.motivo_perda ?? item.lossReason }
          : item
      )
    );
    setIsStatusModalOpen(false);
    setStatusObs(""); // Resetar obs após envio
  };

  const handleRangeSelect = (start: Date, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    if (start && end) setIsDateModalOpen(false);
  };

  const handleDateMask = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length >= 5) value = value.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    else if (value.length >= 3) value = value.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    e.target.value = value;
  };


  const uniqueSellers = useMemo(() => {
    const sellers = new Set(orçamentosData.map((item) => item.seller));
    return ["Todos os Vendedores", ...Array.from(sellers)];
  }, [orçamentosData]);

  const lossReasons = [
    "Todos os Motivos",
    "Preço Alto",
    "Falta de Estoque",
    "Desistiu",
    "Prazo de Entrega",
    "Mão de Obra e Material",
    "Comparativo de Linhas",
  ];

  const filteredAndSortedItems = useMemo(() => {
    let result = [...orçamentosData];

    if (searchTerm) {
      result = result.filter(
        (item) =>
          item.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.id.includes(searchTerm)
      );
    }

    if (filterStatus !== "Todos os Status") {
      const statusMap: Record<string, string> = {
        "Em Aberto": "EM ABERTO",
        Emitido: "EMITIDO",
        Enviado: "ENVIADO",
        Negociação: "NEGOCIAÇÃO",
        "Lib. Crédito": "LIB. CRÉDITO",
        "Aguard. Pedido": "AGUARD. PEDIDO",
        Venda: "VENDA",
        Perdido: "PERDIDO",
      };
      const mapped = statusMap[filterStatus];
      if (mapped) result = result.filter((item) => item.status === mapped);
    }

    if (filterSeller !== "Todos os Vendedores")
      result = result.filter((item) => item.seller === filterSeller);

    if (filterReason !== "Todos os Motivos")
      result = result.filter((item) => item.lossReason === filterReason);

    if (startDate !== null && endDate !== null) {
      result = result.filter((item) => {
        const [d, m, y] = item.date.split("/").map(Number);
        const itemDate = new Date(y, m - 1, d);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    if (sortConfig.key !== null && sortConfig.direction !== null) {
      result.sort((a, b) => {
        let aValue: string | number = a[sortConfig.key as keyof Orcamento] as string | number;
        let bValue: string | number = b[sortConfig.key as keyof Orcamento] as string | number;
        if (sortConfig.key === "total") { aValue = a.totalValue; bValue = b.totalValue; }
        if (sortConfig.key === "markup") { aValue = a.markupValue; bValue = b.markupValue; }
        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [orçamentosData, searchTerm, filterStatus, filterSeller, filterReason, startDate, endDate, sortConfig]);

  // ── Insights (calculados dos dados reais) ───────────────────────────────
  const visibleProducts = useMemo(() => {
    return filteredAndSortedItems.slice(0, visibleCount);
  }, [filteredAndSortedItems, visibleCount]);

  const insights = useMemo(() => {
    const total = filteredAndSortedItems.length;
    const statusCounts = filteredAndSortedItems.reduce<Record<string, number>>((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});
    const vendas = statusCounts["VENDA"] || 0;
    const perdidos = statusCounts["PERDIDO"] || 0;
    const pipeline = filteredAndSortedItems
      .filter((o) => !["VENDA", "PERDIDO"].includes(o.status))
      .reduce((s, o) => s + o.totalValue, 0);
    const convQtd = total > 0 ? ((vendas / total) * 100).toFixed(1) : "0.0";

    const reasonCounts = filteredAndSortedItems
      .filter((o) => o.status === "PERDIDO" && o.lossReason)
      .reduce<Record<string, number>>((acc, o) => {
        const r = o.lossReason!;
        acc[r] = (acc[r] || 0) + 1;
        return acc;
      }, {});

    return { statusCounts, vendas, perdidos, pipeline, convQtd, total, reasonCounts };
  }, [filteredAndSortedItems]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-3 h-3 opacity-20" />;
    return sortConfig.direction === "asc"
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Vendedor", "Cliente", "Data", "Hora", "Total", "Markup", "Status", "Motivo"];
    const rows = filteredAndSortedItems.map((item) => [
      item.id,
      item.seller,
      item.client,
      item.date,
      item.time,
      item.total.replace("R$ ", ""),
      item.markup,
      item.status,
      item.lossReason || "",
    ]);
    const csvContent = [headers, ...rows].map((e) => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `orcamentos_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dateLabel =
    endDate !== null
      ? `${startDate?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} até ${endDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`
      : startDate
      ? `${startDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}...`
      : "Selecione o período...";

  const statusBarData = [
    { label: "Emitido", key: "EMITIDO", color: "bg-slate-400" },
    { label: "Enviado", key: "ENVIADO", color: "bg-blue-500" },
    { label: "Negociação", key: "NEGOCIAÇÃO", color: "bg-amber-400" },
    { label: "Aguard. Pedido", key: "AGUARD. PEDIDO", color: "bg-orange-500" },
    { label: "Venda", key: "VENDA", color: "bg-emerald-500" },
    { label: "Perdido", key: "PERDIDO", color: "bg-rose-500" },
  ];
  const maxStatusCount = Math.max(...statusBarData.map((s) => insights.statusCounts[s.key] || 0), 1);

  const reasonEntries = Object.entries(insights.reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxReasonCount = Math.max(...reasonEntries.map((e) => e[1]), 1);

  return (
    <div className="h-full flex flex-col pt-4 px-6 pb-2 overflow-y-auto scrollbar-hide">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0 mb-4 px-1">
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full lg:w-auto flex-1 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>

          {/* Date */}
          <div className="relative">
            <button
              onClick={() => setIsDateModalOpen(!isDateModalOpen)}
              className={cn(
                "h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-tight flex items-center gap-2 transition-all outline-none",
                startDate ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 shadow-sm",
                isDateModalOpen && "ring-4 ring-slate-900/5 border-slate-300"
              )}
            >
              <Calendar className="w-3.5 h-3.5 opacity-40" />
              <span>{dateLabel}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform duration-300 opacity-40", isDateModalOpen && "rotate-180")} />
            </button>
            {isDateModalOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDateModalOpen(false)} />
                <div className="absolute top-full left-0 mt-2 z-50">
                  <MiniCalendar mode="range" onSelectRange={handleRangeSelect} initialStartDate={startDate} initialEndDate={endDate} />
                </div>
              </>
            )}
          </div>

          <TinyDropdown value={filterStatus} options={["Todos os Status", "Em Aberto", "Emitido", "Enviado", "Negociação", "Lib. Crédito", "Aguard. Pedido", "Venda", "Perdido"]} onChange={setFilterStatus} icon={FileCheck} variant="blue" placeholder="Todos os Status" />
          <TinyDropdown value={filterSeller} options={uniqueSellers} onChange={setFilterSeller} icon={UserIcon} variant="slate" placeholder="Todos os Vendedores" />
          <TinyDropdown value={filterReason} options={lossReasons} onChange={setFilterReason} icon={AlertCircle} variant="amber" placeholder="Todos os Motivos" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="w-10 h-10 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center"
            title="Exportar CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>



      {/* INSIGHTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 shrink-0">
        {/* Distribuição por Status */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Distribuição por Status</h3>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-2 w-16 bg-slate-100 rounded" />
                    <div className="h-2 w-4 bg-slate-50 rounded" />
                  </div>
                  <div className="h-1 w-full bg-slate-50 rounded-full" />
                </div>
              ))
            ) : (
              statusBarData.map((s, i) => {
                const val = insights.statusCounts[s.key] || 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                      <span className="uppercase tracking-tight truncate pr-2">{s.label}</span>
                      <span className="text-slate-900">{val}</span>
                    </div>
                    <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", s.color)} style={{ width: `${(val / maxStatusCount) * 100}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Motivos de Perda */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Motivos de Perda</h3>
          <div className="space-y-3.5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-2 w-24 bg-slate-100 rounded" />
                    <div className="h-2 w-4 bg-slate-50 rounded" />
                  </div>
                  <div className="h-2.5 w-full bg-slate-50 rounded-sm" />
                </div>
              ))
            ) : reasonEntries.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">Nenhum registro ainda</p>
            ) : (
              reasonEntries.map(([label, count], i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                    <span className="uppercase tracking-tight truncate pr-2">{label}</span>
                    <span className="text-slate-900">{count}</span>
                  </div>
                  <div className="h-2.5 bg-slate-50 rounded-sm overflow-hidden border border-slate-100/50">
                    <div className="h-full rounded-r-sm bg-rose-500 transition-all duration-700" style={{ width: `${(count / maxReasonCount) * 100}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resumo Geral</h3>
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex justify-between items-center border-b border-slate-50 pb-2 animate-pulse">
                  <div className="h-2 w-20 bg-slate-100 rounded" />
                  <div className="h-3 w-24 bg-slate-50 rounded" />
                </div>
              ))
            ) : (
              [
                { label: "Valor em Pipeline", value: insights.pipeline.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }), color: "text-emerald-600" },
                { label: "Qtde. Orçamentos", value: String(insights.total), color: "text-slate-900" },
                { label: "Vendas Fechadas", value: String(insights.vendas), color: "text-slate-900" },
                { label: "Perdidos", value: String(insights.perdidos), color: "text-rose-500" },
                { label: "Conv. por Qtde.", value: `${insights.convQtd}%`, color: "text-emerald-600", trend: "up" },
              ].map((r, i) => (
                <div key={i} className="flex flex-col border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{r.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[12px] font-black", r.color)}>{r.value}</span>
                      {r.trend === "up" && <span className="text-[10px] text-emerald-500 animate-pulse">↗</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="sticky top-0 z-20">
                <tr className="bg-slate-50/50 border-b border-slate-100 backdrop-blur-md">
                  {[
                    { id: "id", label: "Orçamento" },
                    { id: "seller", label: "Vendedor" },
                    { id: "client", label: "Cliente" },
                    { id: "date", label: "Data/Hora" },
                    { id: "total", label: "Total" },
                    { id: "markup", label: "Markup" },
                    { id: "status", label: "Status" },
                  ].map((col) => (
                    <th
                      key={col.id}
                      onClick={() => !loading && requestSort(col.id)}
                      className={cn("px-6 py-3 text-[9px] font-black uppercase tracking-[0.1em] transition-colors text-slate-400 group/th", col.id === "status" && "text-center", !loading && "cursor-pointer hover:bg-slate-100/50")}
                    >
                      <div className={cn("flex items-center gap-2", col.id === "status" && "justify-center")}>
                        <span className={cn(sortConfig.key === col.id ? "text-blue-600" : "text-slate-400 group-hover/th:text-slate-600")}>{col.label}</span>
                        {!loading && getSortIcon(col.id)}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-3 w-12 bg-slate-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-24 bg-slate-50 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-48 bg-slate-100 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-20 bg-slate-50 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-24 bg-emerald-50 rounded" /></td>
                      <td className="px-6 py-4"><div className="h-3 w-12 bg-slate-50 rounded" /></td>
                      <td className="px-6 py-4"><div className="flex justify-center"><div className="h-5 w-16 bg-slate-100 rounded-full" /></div></td>
                      <td className="px-6 py-4"><div className="flex justify-end gap-2"><div className="h-6 w-6 bg-slate-50 rounded" /><div className="h-6 w-6 bg-slate-50 rounded" /></div></td>
                    </tr>
                  ))
                ) : filteredAndSortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-[11px] text-slate-400 font-bold">
                      Nenhum orçamento encontrado para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  visibleProducts.map((item) => (
                    <OrcamentoRow 
                      key={item.id} 
                      item={item} 
                      onOpenItems={(o) => {
                        setSelectedItem(o);
                        setIsItemsModalOpen(true);
                        setItens(o.items);
                      }}
                      onOpenStatus={(o) => {
                        setSelectedItem(o);
                        setIsStatusModalOpen(true);
                        setStatusStep("selection");
                      }}
                      onOpenChat={(o) => {
                        window.dispatchEvent(new CustomEvent('open-crm-chat', { 
                          detail: { doc: o.id, title: o.client } 
                        }));
                      }}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
      </div>



      {/* ITEMS MODAL */}
      {isItemsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsItemsModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center border border-amber-100">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Itens do Orçamento</h2>
                  {selectedItem && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                        #{selectedItem.id.replace("-OR", "")}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[200px]">
                        {selectedItem.client}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => setIsItemsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {itens.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-[11px] text-slate-400 font-bold">Nenhum item encontrado</div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider w-16">Cód.</th>
                      <th className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-wider">Descrição</th>
                      <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-wider w-16">Qtd</th>
                      <th className="px-4 py-3 text-center font-black text-slate-400 uppercase tracking-wider w-12">UN</th>
                      <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-wider w-28">Val. Unit</th>
                      <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-wider w-28">Margem</th>
                      <th className="px-4 py-3 text-right font-black text-slate-400 uppercase tracking-wider w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {itens.map((it, i) => {
                      const qtd = parseFloat(String(it.QUANTIDADE)) || 0;
                      const valuni = parseFloat(String(it.PRECO_UNITARIO)) || 0;
                      const mkp = parseFloat(String(it.MARKUP_PERCENTUAL)) || 0;
                      const total = qtd * valuni;
                      const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-mono">{it.COD_PRODUTO}</td>
                          <td className="px-4 py-3 text-slate-700 font-semibold" title={it.PRODUTO}>{it.PRODUTO}</td>
                          <td className="px-4 py-3 text-right text-slate-600 font-bold">{qtd.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center text-slate-400 font-bold">{it.UN || "UN"}</td>
                          <td className="px-4 py-3 text-right text-slate-600 font-bold">{fmt(valuni)}</td>
                          <td className={cn("px-4 py-3 text-right font-bold", mkp >= 30 ? "text-emerald-500" : "text-amber-500")}>
                            {mkp.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right font-black text-emerald-600">{fmt(total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={6} className="px-4 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-wider">Total do Orçamento</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-600">
                        {itens.reduce((acc, it) => acc + (parseFloat(String(it.QUANTIDADE)) || 0) * (parseFloat(String(it.PRECO_UNITARIO)) || 0), 0)
                          .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              <button onClick={() => setIsItemsModalOpen(false)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsStatusModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-8 shadow-2xl border border-slate-200 overflow-hidden">
            <button onClick={() => setIsStatusModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              {statusStep === "selection" ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                      <ChevronsUpDown className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Alterar Status</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Fluxo de Vendas</p>
                    </div>
                  </div>
                  {selectedItem && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Orçamento Selecionado</p>
                      <p className="text-sm font-black text-slate-900 tracking-tighter">{selectedItem.id.replace("-OR", "")} — {selectedItem.client}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Emitido", color: "text-slate-600", dot: "bg-slate-600", next: null },
                      { label: "Enviado", color: "text-blue-600", dot: "bg-blue-600", next: "enviado" },
                      { label: "Negociação", color: "text-amber-600", dot: "bg-amber-600", next: "negociacao" },
                      { label: "Lib. Crédito", color: "text-orange-600", dot: "bg-orange-600", next: null },
                      { label: "Aguard. Pedido", color: "text-indigo-600", dot: "bg-indigo-600", next: null },
                      { label: "Perdido", color: "text-rose-600", dot: "bg-rose-600", next: "perdido" },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        onClick={() => btn.next ? setStatusStep(btn.next as "enviado" | "negociacao" | "perdido") : handleUpdateStatus(btn.label.toUpperCase())}
                        className="flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 transition-all text-left"
                      >
                        <div className={cn("w-2 h-2 rounded-full", btn.dot)} />
                        <span className={cn("text-[11px] font-bold uppercase tracking-tight", btn.color)}>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : statusStep === "enviado" ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                      <Send className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Status: Enviado</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Registro de Contato</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Data de Retorno</label>
                      <input type="text" placeholder="dd/mm/aaaa" value={statusData} onChange={(e) => { handleDateMask(e); setStatusData(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Observação</label>
                      <textarea placeholder="Ex: Cliente solicitou retorno na segunda..." rows={4} value={statusObs} onChange={(e) => setStatusObs(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all resize-none" />
                    </div>
                    <button onClick={() => {
                      // Converte dd/mm/aaaa → ISO para salvar no banco
                      let iso: string | null = null;
                      if (statusData && statusData.length === 10) {
                        const [d, m, y] = statusData.split("/");
                        iso = `${y}-${m}-${d}`;
                      }
                      handleUpdateStatus("ENVIADO", { lembrete_data: iso });
                    }} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/10 active:scale-[0.98] transition-all">
                      Confirmar Envio
                    </button>
                  </div>
                </div>
              ) : statusStep === "negociacao" ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                      <Handshake className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Negociação</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Dados da Proposta</p>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Endereço da Obra *</label>
                      <input type="text" placeholder="Logradouro, número, bairro..." value={statusEnderecoObra} onChange={(e) => setStatusEnderecoObra(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-amber-600/50 focus:ring-4 focus:ring-amber-600/5 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Prev. Fechamento *</label>
                        <input type="text" placeholder="dd/mm/aaaa" value={statusFechamento} onChange={(e) => { handleDateMask(e); setStatusFechamento(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-amber-600/50" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Prev. Entrega *</label>
                        <input type="text" placeholder="dd/mm/aaaa" value={statusEntrega} onChange={(e) => { handleDateMask(e); setStatusEntrega(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-amber-600/50" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Observações</label>
                      <textarea placeholder="Detalhes da negociação..." rows={3} value={statusObs} onChange={(e) => setStatusObs(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none resize-none" />
                    </div>
                    <button
                      onClick={() => handleUpdateStatus("NEGOCIAÇÃO", { endereco_obra: statusEnderecoObra, fechamento_previsto: statusFechamento, entrega_prevista: statusEntrega })}
                      className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/10 active:scale-[0.98] transition-all"
                    >
                      Salvar Negociação
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100">
                      <XCircle className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Status: Perdido</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Motivo da Perda</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Selecione o Motivo *</label>
                      <select value={statusMotivoPerdido} onChange={(e) => setStatusMotivoPerdido(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none appearance-none cursor-pointer">
                        <option value="">Selecione o motivo...</option>
                        {["Preço Alto", "Falta de Estoque", "Desistiu", "Prazo de Entrega", "Mão de Obra e Material", "Comparativo de Linhas"].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Observação Adicional</label>
                      <textarea placeholder="Explique por que o negócio não avançou..." rows={4} value={statusObs} onChange={(e) => setStatusObs(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none resize-none" />
                    </div>
                    <button
                      onClick={() => handleUpdateStatus("PERDIDO", { motivo_perda: statusMotivoPerdido })}
                      className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-600/10 active:scale-[0.98] transition-all"
                    >
                      Confirmar Perda
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
