import { useState, useMemo } from "react";
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
  Download
} from "lucide-react";
import { ChatModal } from "@/components/ui/ChatModal";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import {
  User as UserIcon,
  FileCheck,
  AlertCircle,
} from "lucide-react";

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
}

export function OrcamentosView() {
  const [orçamentosData, setOrçamentosData] = useState<Orcamento[]>([]);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'id', direction: 'desc' });
  const [filterStatus, setFilterStatus] = useState("Todos os Status");
  const [filterSeller, setFilterSeller] = useState("Todos os Vendedores");
  const [filterReason, setFilterReason] = useState("Todos os Motivos");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusStep, setStatusStep] = useState<'selection' | 'enviado' | 'negociacao' | 'perdido'>('selection');
  const [selectedItem, setSelectedItem] = useState<Orcamento | null>(null);

  const handleUpdateStatus = (newStatus: string) => {
    if (!selectedItem) return;
    setOrçamentosData(prev => prev.map(item =>
      item.id === selectedItem.id ? { ...item, status: newStatus.toUpperCase() } : item
    ));
    setIsStatusModalOpen(false);
  };

  // Date selection logic
  const [startDate, setStartDate] = useState<Date | null>(new Date(2026, 3, 1));
  const [endDate, setEndDate] = useState<Date | null>(new Date(2026, 3, 16));

  const handleRangeSelect = (start: Date, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    if (start && end) {
      setIsDateModalOpen(false);
    }
  };

  const handleDateMask = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);

    if (value.length >= 5) {
      value = value.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    } else if (value.length >= 3) {
      value = value.replace(/(\d{2})(\d{1,2})/, "$1/$2");
    }

    e.target.value = value;
  };

  const handleOpenStatus = (item: Orcamento) => {
    setSelectedItem(item);
    setStatusStep('selection');
    setIsStatusModalOpen(true);
  };

  const uniqueSellers = useMemo(() => {
    const sellers = new Set(orçamentosData.map(item => item.seller));
    return ["Todos os Vendedores", ...Array.from(sellers)];
  }, [orçamentosData]);

  const lossReasons = [
    "Todos os Motivos",
    "Preço Alto",
    "Falta de Estoque",
    "Desistiu",
    "Prazo de Entrega",
    "Mão de Obra e Material",
    "Comparativo de Linhas"
  ];

  const filteredAndSortedItems = useMemo(() => {
    let result = [...orçamentosData];

    // Search Filter
    if (searchTerm) {
      result = result.filter(item =>
        item.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.includes(searchTerm)
      );
    }

    // Status Filter
    if (filterStatus !== "Todos os Status") {
      const statusMap: Record<string, string> = {
        "Em Aberto": "EM ABERTO", "Emitido": "EMITIDO", "Enviado": "ENVIADO",
        "Negociação": "NEGOCIAÇÃO", "Lib. Crédito": "LIB. CRÉDITO",
        "Aguard. Pedido": "AGUARD. PEDIDO", "Venda": "VENDA", "Perdido": "PERDIDO"
      };
      const mappedStatus = statusMap[filterStatus];
      if (mappedStatus) {
        result = result.filter(item => item.status === mappedStatus);
      }
    }

    // Seller Filter
    if (filterSeller !== "Todos os Vendedores") {
      result = result.filter(item => item.seller === filterSeller);
    }

    // Reason Filter
    if (filterReason !== "Todos os Motivos") {
      result = result.filter(item => item.lossReason === filterReason);
    }

    // Date Range Filter
    if (startDate !== null && endDate !== null) {
      result = result.filter(item => {
        const [d, m, y] = item.date.split('/').map(Number);
        const itemDate = new Date(y, m - 1, d);
        return itemDate >= startDate && itemDate <= endDate;
      });
    }

    // Sort
    if (sortConfig.key !== null && sortConfig.direction !== null) {
      result.sort((a, b) => {
        let aValue: string | number = a[sortConfig.key as keyof Orcamento] as string | number;
        let bValue: string | number = b[sortConfig.key as keyof Orcamento] as string | number;
        if (sortConfig.key === 'total') { aValue = a.totalValue; bValue = b.totalValue; }
        if (sortConfig.key === 'markup') { aValue = a.markupValue; bValue = b.markupValue; }
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [orçamentosData, searchTerm, filterStatus, filterSeller, filterReason, startDate, endDate, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-3 h-3 opacity-20" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Vendedor", "Cliente", "Data", "Hora", "Total", "Markup", "Status", "Motivo"];
    const rows = filteredAndSortedItems.map(item => [
      item.id,
      item.seller,
      item.client,
      item.date,
      item.time,
      item.total.replace('R$ ', ''),
      item.markup,
      item.status,
      item.lossReason || ""
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `orcamentos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dateLabel = endDate !== null
    ? `${startDate?.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' })} até ${endDate.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    : startDate ? `${startDate.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric' })}...` : "Selecione o período...";

  return (
    <div className="h-full flex flex-col pt-4 px-6 pb-2 overflow-y-auto scrollbar-hide">
      {/* Header & Filters (Tiny Style) */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0 mb-4 px-1">
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full lg:w-auto flex-1 flex-wrap">
          {/* 1. Search Bar */}
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

          {/* 2. Date Filter Button */}
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
                  <MiniCalendar
                    mode="range"
                    onSelectRange={handleRangeSelect}
                    initialStartDate={startDate}
                    initialEndDate={endDate}
                  />
                </div>
              </>
            )}
          </div>

          {/* 3. Status Filter */}
          <TinyDropdown
            value={filterStatus}
            options={["Todos os Status", "Em Aberto", "Emitido", "Enviado", "Negociação", "Lib. Crédito", "Aguard. Pedido", "Venda", "Perdido"]}
            onChange={setFilterStatus}
            icon={FileCheck}
            variant="blue"
            placeholder="Todos os Status"
          />

          {/* 4. Seller Filter */}
          <TinyDropdown
            value={filterSeller}
            options={uniqueSellers}
            onChange={setFilterSeller}
            icon={UserIcon}
            variant="slate"
            placeholder="Todos os Vendedores"
          />

          {/* 5. Loss Reason Filter */}
          <TinyDropdown
            value={filterReason}
            options={lossReasons}
            onChange={setFilterReason}
            icon={AlertCircle}
            variant="amber"
            placeholder="Todos os Motivos"
          />
        </div>

        <button
          onClick={handleExportCSV}
          className="h-10 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shrink-0 flex items-center gap-2"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar CSV
        </button>
      </div>

      {/* INSIGHTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4 shrink-0">
        {/* Card 1: Distribuição por Status */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Distribuição por Status</h3>
          <div className="space-y-3">
            {[
              { label: "Emitido", val: 51, total: 100, color: "bg-blue-400" },
              { label: "Enviado", val: 32, total: 100, color: "bg-indigo-500" },
              { label: "Negociação", val: 45, total: 100, color: "bg-amber-400" },
              { label: "Aguard. Pedido", val: 12, total: 100, color: "bg-orange-500" },
              { label: "Venda", val: 88, total: 100, color: "bg-emerald-500" },
              { label: "Perdido", val: 24, total: 100, color: "bg-rose-500" },
            ].map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                  <span className="uppercase tracking-tight truncate pr-2">{s.label}</span>
                  <span className="text-slate-900">{s.val}</span>
                </div>
                <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", s.color)} style={{ width: `${s.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Motivos de Perda */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Motivos de Perda</h3>
          <div className="space-y-3.5">
            {[
              { label: "Mão de Obra e Material", val: 85, color: "bg-rose-500" },
              { label: "Preço Alto", val: 65, color: "bg-orange-500" },
              { label: "Falta de Estoque", val: 45, color: "bg-orange-500" },
              { label: "Desistiu", val: 35, color: "bg-amber-500" },
              { label: "Postergou", val: 25, color: "bg-amber-500" },
            ].map((m, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                  <span className="uppercase tracking-tight truncate pr-2">{m.label}</span>
                  <span className="text-slate-900">{Math.floor(m.val / 10)}</span>
                </div>
                <div className="h-2.5 bg-slate-50 rounded-sm overflow-hidden border border-slate-100/50">
                  <div className={cn("h-full rounded-r-sm transition-all duration-700", m.color)} style={{ width: `${m.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Resumo Geral */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Resumo Geral</h3>
          <div className="space-y-4">
            {[
              { label: "Valor em Pipeline", value: "R$ 35.528,49", color: "text-emerald-600" },
              { label: "Qtde. Orçamentos", value: "62", color: "text-slate-900" },
              { label: "Vendas Fechadas", value: "32", color: "text-slate-900" },
              { label: "Conv. por Qtde.", value: "76.2%", color: "text-emerald-600", trend: "up" },
              { label: "Conv. por Valor", value: "61.5%", color: "text-blue-600", trend: "up" },
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
            ))}
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col min-h-0">
        <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50/50 border-b border-slate-100 backdrop-blur-md">
                {[
                  { id: 'id', label: 'Orçamento' },
                  { id: 'seller', label: 'Vendedor' },
                  { id: 'client', label: 'Cliente' },
                  { id: 'date', label: 'Data/Hora' },
                  { id: 'total', label: 'Total' },
                  { id: 'markup', label: 'Markup' },
                  { id: 'status', label: 'Status' },
                ].map((col) => (
                  <th
                    key={col.id}
                    onClick={() => requestSort(col.id)}
                    className={cn(
                      "px-6 py-3 text-[9px] font-black uppercase tracking-[0.1em] cursor-pointer hover:bg-slate-100/50 transition-colors text-slate-400 group/th",
                      col.id === 'status' && "text-center"
                    )}
                  >
                    <div className={cn("flex items-center gap-2", col.id === 'status' && "justify-center")}>
                      <span className={cn(sortConfig.key === col.id ? "text-blue-600" : "text-slate-400 group-hover/th:text-slate-600")}>{col.label}</span>
                      {getSortIcon(col.id)}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {item.id.replace('-OR', '')}
                      <span className="text-[9px] opacity-40 ml-0.5 font-medium">-OR</span>
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
                          if (item.status !== "VENDA" && item.status !== "PERDIDO") {
                            handleOpenStatus(item);
                          }
                        }}
                        className={cn(
                          "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-bold tracking-tight transition-all",
                          (item.status !== "VENDA" && item.status !== "PERDIDO") ? "cursor-pointer hover:brightness-110 active:scale-95" : "cursor-default opacity-80",
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
                      {item.status === 'PERDIDO' && (
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                          {item.lossReason || "Não Informado"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setIsItemsModalOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all"
                        title="Ver Itens"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setIsChatModalOpen(true);
                        }}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all"
                        title="Enviar Mensagem"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CHAT MODAL (Reusable UI Component) */}
      <ChatModal
        isOpen={isChatModalOpen && selectedItem !== null}
        onClose={() => setIsChatModalOpen(false)}
        id={selectedItem?.id.replace('-OR', '') || ""}
        title={selectedItem?.seller || ""}
        subtitle={selectedItem?.seller || ""}
        avatarText={selectedItem?.seller.split(' ').map(n => n[0]).join('')}
      />

      {/* ITEMS MODAL (Tiny Redesign) */}
      {isItemsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsItemsModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
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
                        #{selectedItem.id.replace('-OR', '')}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-[200px]">
                        {selectedItem.client}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setIsItemsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Table */}
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
                    <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Cód.</th>
                    <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider">Descrição</th>
                    <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Qtd</th>
                    <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Un</th>
                    <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Val. Unit</th>
                    <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Custo</th>
                    <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-wider text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { cod: "11400", desc: "DISJ TRIP 32A CURVA C (SDD63C32) STECK", qtd: "1.00", un: "02", unit: "R$ 70,03", custo: "R$ 50,05", total: "R$ 70,03" },
                    { cod: "19614", desc: "CABO PP 1KV 3X4,00MM CORFIO (POR METRO)", qtd: "30.00", un: "03", unit: "R$ 13,04", custo: "R$ 298,80", total: "R$ 391,20" },
                  ].map((row, i) => (
                    <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 text-[11px] font-bold text-slate-500 tracking-tight">{row.cod}</td>
                      <td className="py-3 px-6 text-[11px] font-black text-slate-800 tracking-tight">{row.desc}</td>
                      <td className="py-3 px-6 text-[11px] font-bold text-slate-600 text-right tracking-tight">{row.qtd}</td>
                      <td className="py-3 px-6 text-[11px] font-bold text-slate-600 text-right tracking-tight">{row.un}</td>
                      <td className="py-3 px-6 text-[11px] font-bold text-slate-600 text-right tracking-tight">{row.unit}</td>
                      <td className="py-3 px-6 text-[11px] font-bold text-rose-500 text-right tracking-tight">{row.custo}</td>
                      <td className="py-3 px-6 text-[11px] font-black text-emerald-600 text-right tracking-tight">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              <button
                onClick={() => setIsItemsModalOpen(false)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* STATUS CHANGE MODAL (Tiny Redesign) */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsStatusModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl p-8 shadow-2xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              {statusStep === 'selection' ? (
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
                      <p className="text-sm font-black text-slate-900 tracking-tighter">
                        {selectedItem.id.replace('-OR', '')} — {selectedItem.client}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Emitido", color: "text-slate-600", dot: "bg-slate-600", next: null },
                      { label: "Enviado", color: "text-blue-600", dot: "bg-blue-600", next: 'enviado' },
                      { label: "Negociação", color: "text-amber-600", dot: "bg-amber-600", next: 'negociacao' },
                      { label: "Lib. Crédito", color: "text-orange-600", dot: "bg-orange-600", next: null },
                      { label: "Aguard. Pedido", color: "text-indigo-600", dot: "bg-indigo-600", next: null },
                      { label: "Perdido", color: "text-rose-600", dot: "bg-rose-600", next: 'perdido' },
                    ].map((btn, i) => (
                      <button
                        key={i}
                        onClick={() => btn.next ? setStatusStep(btn.next as 'enviado' | 'negociacao' | 'perdido') : handleUpdateStatus(btn.label)}
                        className="flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 transition-all text-left group"
                      >
                        <div className={cn("w-2 h-2 rounded-full", btn.dot)} />
                        <span className={cn("text-[11px] font-bold uppercase tracking-tight", btn.color)}>{btn.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : statusStep === 'enviado' ? (
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
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Data de Contato</label>
                      <input type="text" placeholder="dd/mm/aaaa" onChange={handleDateMask} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Observação</label>
                      <textarea placeholder="Ex: Cliente solicitou retorno na segunda..." rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all resize-none" />
                    </div>
                    <button
                      onClick={() => handleUpdateStatus('ENVIADO')}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/10 active:scale-[0.98] transition-all"
                    >
                      Confirmar Envio
                    </button>
                  </div>
                </div>
              ) : statusStep === 'negociacao' ? (
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
                      <input type="text" placeholder="Logradouro, número, bairro..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-amber-600/50 focus:ring-4 focus:ring-amber-600/5 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Prev. Fechamento *</label>
                        <input type="text" placeholder="dd/mm/aaaa" onChange={handleDateMask} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-amber-600/50" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Prev. Entrega *</label>
                        <input type="text" placeholder="dd/mm/aaaa" onChange={handleDateMask} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-amber-600/50" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Observações</label>
                      <textarea placeholder="Detalhes da negociação..." rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none resize-none" />
                    </div>
                    <button
                      onClick={() => handleUpdateStatus('NEGOCIAÇÃO')}
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
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none appearance-none cursor-pointer">
                        <option value="">Selecione o motivo...</option>
                        {["Preço Alto", "Estoque", "Prazo", "Desistiu"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Observação Adicional</label>
                      <textarea placeholder="Explique por que o negócio não avançou..." rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none resize-none" />
                    </div>
                    <button
                      onClick={() => handleUpdateStatus('PERDIDO')}
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
