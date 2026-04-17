import { useState, useMemo } from "react";
import { 
  ArrowUpRight, 
  Search,
  Package,
  MessageSquare,
  X,
  Send,
  Handshake,
  XCircle,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Calendar,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProdutosView } from "@/components/dashboard/products/ProdutosView";

/* ─────────────────────────────────────────────
   ANALYTICS VIEW (INSIGHTS)
───────────────────────────────────────────── */
function AnalyticsView() {
  const statusDist = [
    { label: "Emitido", value: 10, color: "from-blue-600 to-blue-400", shadow: "shadow-blue-500/20" },
    { label: "Enviado", value: 3, color: "from-[#9C6ADE] to-[#B68DED]", shadow: "shadow-purple-500/20" },
    { label: "Negociação", value: 2, color: "from-[#F5C71A] to-[#FFD94D]", shadow: "shadow-yellow-500/20" },
    { label: "Aguard. Pedido", value: 1, color: "from-[#D35400] to-[#E67E22]", shadow: "shadow-orange-500/20" },
    { label: "Venda", value: 28, color: "from-emerald-600 to-emerald-400", shadow: "shadow-emerald-500/20" },
    { label: "Perdido", value: 14, color: "from-[#C0392B] to-[#E74C3C]", shadow: "shadow-rose-500/20" },
  ];

  const lossReasons = [
    { label: "PREÇO ALTO", value: 4, color: "from-rose-600 to-rose-400" },
    { label: "FALTA DE ESTOQUE", value: 2, color: "from-orange-600 to-orange-400" },
    { label: "DESISTIU", value: 2, color: "from-amber-600 to-amber-400" },
    { label: "PRAZO DE ENTREGA", value: 1, color: "from-orange-500/80 to-orange-300/80" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Distribution */}
        <div className="lg:col-span-5 bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Distribuição por Status
          </h3>
          <div className="space-y-6">
            {statusDist.map((s, i) => (
              <div key={i} className="flex items-center gap-5 group/item">
                <span className="w-24 text-[11px] font-black text-muted-foreground uppercase tracking-tighter text-right shrink-0 group-hover/item:text-foreground transition-colors">{s.label}</span>
                <div className="flex-1 h-4 bg-secondary/20 rounded-full overflow-hidden relative shadow-inner">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000 delay-300 bg-gradient-to-r shadow-lg", s.color, s.shadow)} 
                    style={{ width: `${(s.value / 30) * 100}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                </div>
                <span className="w-8 text-[11px] font-black text-foreground/40 text-center">{s.value}</span>
              </div>
            ))}
            <div className="flex justify-between pl-28 pr-10 pt-4 border-t border-border/10">
              {[0, 10, 20, 30].map(v => (
                <span key={v} className="text-[9px] font-black text-muted-foreground/20">{v}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Loss Reasons */}
        <div className="lg:col-span-4 bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-rose-500/10 transition-colors" />
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Principais Motivos de Perda
          </h3>
          <div className="space-y-6">
            {lossReasons.map((r, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center pr-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">{r.label}</span>
                  <span className="text-[10px] font-black text-rose-500/60">{r.value} ocorrências</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-4 bg-secondary/20 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000 delay-500 bg-gradient-to-r", r.color)} 
                      style={{ width: `${(r.value / 4) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Summary */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm h-full relative overflow-hidden group">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-8">Performance Geral</h3>
            <div className="space-y-7">
              {[
                { label: "Pipeline", value: "R$ 34.248", icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Conversão", value: "73.7%", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "Ticket Médio", value: "R$ 4.850", icon: ArrowUpRight, color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "Vendas", value: "28", icon: Send, color: "text-primary", bg: "bg-primary/10" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between group/row">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover/row:scale-110", item.bg)}>
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">{item.label}</span>
                  </div>
                  <span className="text-sm font-black text-foreground tracking-tighter">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Crescimento Mensal</p>
              <p className="text-xl font-black text-emerald-500">+17.3%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div className="h-[400px] bg-card border border-border/50 rounded-[2.5rem] p-10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-12 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
              Fluxo de Propostas
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] tracking-widest">REAL TIME</span>
            </h3>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Volume diário de orçamentos emitidos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-secondary/30 p-1.5 rounded-2xl border border-border/40">
              {['DIA', 'SEM', 'MÊS'].map(m => (
                <button key={m} className={cn("px-5 py-2 text-[9px] font-black rounded-xl transition-all", m === 'DIA' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{m}</button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="absolute inset-x-10 bottom-12 flex items-end gap-3 h-56 relative z-10">
          {[32, 45, 28, 65, 52, 38, 72, 58, 42, 68, 55, 82, 63, 75, 48, 54, 38, 62, 45, 78].map((v, i) => (
            <div key={i} className="flex-1 group/bar relative h-full flex flex-col justify-end">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border/50 px-3 py-1.5 rounded-xl text-[10px] font-black text-primary opacity-0 group-hover/bar:opacity-100 transition-all -translate-y-2 group-hover/bar:translate-y-0 shadow-xl z-20">
                {v}
              </div>
              <div
                className={cn(
                  "w-full rounded-t-2xl transition-all duration-700 bg-gradient-to-t relative overflow-hidden",
                  i === 11 ? "from-primary to-blue-300 shadow-[0_0_30px_rgba(0,129,255,0.4)]" : "from-primary/10 to-primary/40 group-hover/bar:from-primary/30 group-hover/bar:to-primary"
                )}
                style={{ height: `${v}%` }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row - New Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Top Vendedores (Conversão)</h3>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <div className="space-y-5">
            {[
              { name: "GUILHERME SANTANA", rate: "84%", sales: 12 },
              { name: "TATIANE MARIA", rate: "79%", sales: 18 },
              { name: "MATEUS RONALD", rate: "72%", sales: 9 },
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/20 group hover:bg-secondary/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">{i+1}</div>
                  <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{v.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-emerald-500">{v.rate}</span>
                  <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40">{v.sales} vendas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0081FF] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-4">Meta Mensal da Equipe</h3>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-black text-white tracking-tighter">78%</span>
              <span className="text-sm font-black text-white/60 uppercase tracking-widest">Concluída</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-white rounded-full w-[78%] shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
            </div>
            <p className="text-[11px] font-bold text-white/80 leading-relaxed italic">
              "Faltam apenas R$ 12.400 para atingirmos o recorde histórico de faturamento."
            </p>
          </div>
          <Zap className="absolute bottom-[-20%] right-[-5%] w-48 h-48 text-white/5 rotate-12 transition-transform group-hover:scale-110" />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ORÇAMENTOS VIEW (TABLE)
───────────────────────────────────────────── */
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
}

function OrçamentosView() {
  const [orçamentosData, setOrçamentosData] = useState<Orcamento[]>([
    { id: "000001026785-OR", seller: "TATIANE MARIA", client: "CLEITO BARROS", date: "16/04/2026", time: "16:56", total: "R$ 48,05", markup: "71.18%", status: "VENDA", totalValue: 48.05, markupValue: 71.18 },
    { id: "000001026784-OR", seller: "GUSTAVO ALVES", client: "CREAM COLOR", date: "16/04/2026", time: "16:50", total: "R$ 139,90", markup: "125.28%", status: "VENDA", totalValue: 139.90, markupValue: 125.28 },
    { id: "000001026783-OR", seller: "GUILHERME SANTANA", client: "TRANS KOTHE", date: "16/04/2026", time: "16:47", total: "R$ 380,00", markup: "85.00%", status: "EMITIDO", totalValue: 380.00, markupValue: 85.00 },
    { id: "000001026782-OR", seller: "GUILHERME SANTANA", client: "TRANS KOTHE", date: "16/04/2026", time: "18:45", total: "R$ 33.468,36", markup: "140.08%", status: "EMITIDO", totalValue: 33468.36, markupValue: 140.08 },
    { id: "000001026781-OR", seller: "TATIANE MARIA", client: "ITM LATIN", date: "16/04/2026", time: "16:43", total: "R$ 2.847,30", markup: "73.41%", status: "EMITIDO", totalValue: 2847.30, markupValue: 73.41 },
    { id: "000001026780-OR", seller: "MATEUS RONALD", client: "RODRIGO SOARES", date: "16/04/2026", time: "16:43", total: "R$ 2.611,60", markup: "75.97%", status: "VENDA", totalValue: 2611.60, markupValue: 75.97 },
    { id: "000000000822-OR", seller: "GUILHERME SANTANA", client: "JMJ LOCACOES", date: "16/04/2026", time: "16:42", total: "R$ 599,74", markup: "77.78%", status: "VENDA", totalValue: 599.74, markupValue: 77.78 },
    { id: "000001026779-OR", seller: "TATIANE MARIA", client: "MEDIATRIZ ENGENHARIA", date: "16/04/2026", time: "16:23", total: "R$ 126,40", markup: "114.09%", status: "VENDA", totalValue: 126.40, markupValue: 114.09 },
    { id: "000001026778-OR", seller: "GUSTAVO ALVES", client: "LOGISTICA EXPRESS", date: "16/04/2026", time: "15:10", total: "R$ 1.540,00", markup: "92.50%", status: "EMITIDO", totalValue: 1540.00, markupValue: 92.50 },
    { id: "000001026777-OR", seller: "MATEUS RONALD", client: "AUTO PECAS SUL", date: "16/04/2026", time: "14:45", total: "R$ 890,25", markup: "65.20%", status: "VENDA", totalValue: 890.25, markupValue: 65.20 },
    { id: "000001026776-OR", seller: "TATIANE MARIA", client: "CONSTRUTORA ALPHA", date: "16/04/2026", time: "14:20", total: "R$ 12.850,00", markup: "105.15%", status: "EMITIDO", totalValue: 12850.00, markupValue: 105.15 },
    { id: "000001026775-OR", seller: "GUILHERME SANTANA", client: "METALURGICA REAL", date: "16/04/2026", time: "13:55", total: "R$ 4.320,00", markup: "88.40%", status: "VENDA", totalValue: 4320.00, markupValue: 88.40 },
  ]);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: 'id', direction: 'desc' });
  const [filterStatus, setFilterStatus] = useState("Todos os Status");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
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
  const [startDate, setStartDate] = useState<number | null>(1);
  const [endDate, setEndDate] = useState<number | null>(16);
  const [isSelectingStart, setIsSelectingStart] = useState(true);

  const handleOpenStatus = (item: Orcamento) => {
    setSelectedItem(item);
    setStatusStep('selection');
    setIsStatusModalOpen(true);
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

  const handleDateClick = (day: number) => {
    if (isSelectingStart) {
      setStartDate(day);
      setEndDate(null);
      setIsSelectingStart(false);
    } else {
      if (day < (startDate || 0)) {
        setStartDate(day);
        setEndDate(null);
      } else {
        setEndDate(day);
        setIsSelectingStart(true);
        setIsDateModalOpen(false);
      }
    }
  };

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

    // Date Range Filter (Mock logic based on day of month)
    if (startDate !== null && endDate !== null) {
      result = result.filter(item => {
        const itemDay = parseInt(item.date.split('/')[0], 10);
        return itemDay >= Math.min(startDate, endDate) && itemDay <= Math.max(startDate, endDate);
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
  }, [orçamentosData, searchTerm, filterStatus, startDate, endDate, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ChevronsUpDown className="w-3 h-3 opacity-20" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-3 h-3 text-primary animate-in zoom-in-50 duration-300" />
      : <ChevronDown className="w-3 h-3 text-primary animate-in zoom-in-50 duration-300" />;
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "VENDA": return "bg-emerald-500 text-white border-transparent";
      case "EMITIDO": return "bg-[#343A40] text-white border-transparent";
      case "ENVIADO": return "bg-[#9C6ADE] text-white border-transparent";
      case "NEGOCIAÇÃO": return "bg-[#F5C71A] text-black border-transparent";
      case "LIB. CRÉDITO": return "bg-[#E68A2E] text-white border-transparent";
      case "AGUARD. PEDIDO": return "bg-[#D35400] text-white border-transparent";
      case "PERDIDO": return "bg-[#C0392B] text-white border-transparent";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  const dateLabel = endDate !== null 
    ? `${startDate?.toString().padStart(2, '0')}/04/2026 até ${endDate.toString().padStart(2, '0')}/04/2026`
    : `Selecione a data final...`;

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 mb-2">
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto flex-1">
          {/* 1. Search Bar (Now first) */}
          <div className="relative w-full sm:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, vendedor ou ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/20 border border-border/40 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-semibold outline-none focus:border-primary/50 focus:bg-background/50 focus:ring-4 focus:ring-primary/5 transition-all duration-300 placeholder:text-muted-foreground/40" 
            />
          </div>

          {/* 2. Date Filter Button */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => {
                setIsDateModalOpen(!isDateModalOpen);
                if (!isDateModalOpen) setIsSelectingStart(true);
              }}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-3 border rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all duration-300 shrink-0 outline-none",
                isDateModalOpen 
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 ring-4 ring-primary/10" 
                  : "bg-secondary/20 border-border/40 text-foreground/80 hover:bg-secondary/40 hover:border-border/60"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateLabel}</span>
            </button>

            {isDateModalOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDateModalOpen(false)} />
                <div className="absolute top-16 left-0 z-50 w-80 bg-card/95 backdrop-blur-xl border border-border/50 pb-6 rounded-[2.5rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-200">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                      <button className="p-2 hover:bg-secondary rounded-xl transition-all"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black uppercase tracking-tighter">Abril</span>
                        <span className="text-sm font-black text-primary">2026</span>
                      </div>
                      <button className="p-2 hover:bg-secondary rounded-xl transition-all"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center mb-4">
                      {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => (
                        <span key={d} className="text-[9px] font-black text-muted-foreground/50 py-2">{d}</span>
                      ))}
                      {Array.from({ length: 30 }).map((_, i) => {
                        const day = i + 1;
                        const isStart = day === startDate;
                        const isEnd = day === endDate;
                        const isInRange = endDate !== null && day > (startDate || 0) && day < endDate;
                        return (
                          <button key={i} onClick={() => handleDateClick(day)} className={cn("aspect-square text-[11px] font-black rounded-xl transition-all flex items-center justify-center relative", (isStart || isEnd) ? "bg-primary text-white shadow-lg shadow-primary/30 z-10" : isInRange ? "bg-primary/10 text-primary rounded-none" : "hover:bg-secondary text-foreground/80")}>
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* 3. Status Filter Dropdown */}
          <div className="relative w-full sm:w-56 group shrink-0">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)} 
              className="w-full bg-secondary/20 border border-border/40 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none appearance-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 cursor-pointer transition-all duration-300 text-foreground/80 hover:bg-secondary/40"
            >
              {["Todos os Status", "Em Aberto", "Emitido", "Enviado", "Negociação", "Lib. Crédito", "Aguard. Pedido", "Venda", "Perdido"].map(opt => (
                <option key={opt} value={opt} className="bg-card text-foreground">{opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border/50 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col mb-4">
        <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide py-1">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card border-b border-border/50 backdrop-blur-md">
                {[
                  { id: 'id', label: 'Orçamento' },
                  { id: 'seller', label: 'Vendedor' },
                  { id: 'client', label: 'Cliente' },
                  { id: 'date', label: 'Data/Hora' },
                  { id: 'total', label: 'Total' },
                  { id: 'markup', label: 'Markup' },
                  { id: 'status', label: 'Status' },
                ].map((col) => (
                  <th key={col.id} onClick={() => requestSort(col.id)} className={cn("px-4 md:px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] cursor-pointer hover:bg-secondary/10 transition-colors group/th", col.id === 'status' && "text-center")}>
                    <div className={cn("flex items-center gap-2", col.id === 'status' && "justify-center")}>
                      <span className={cn(sortConfig.key === col.id ? "text-primary" : "text-muted-foreground/60")}>{col.label}</span>
                      {getSortIcon(col.id)}
                    </div>
                  </th>
                ))}
                <th className="px-4 md:px-6 py-4 text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.25em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {filteredAndSortedItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-primary/[0.01] transition-colors group">
                  <td className="px-4 md:px-6 py-3.5"><span className="text-[11px] font-black text-[#0053FC] hover:underline cursor-pointer">{item.id}</span></td>
                  <td className="px-4 md:px-6 py-3.5"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{item.seller}</span></td>
                  <td className="px-4 md:px-6 py-3.5"><span className="text-[11px] font-black text-foreground/90 uppercase tracking-tighter transition-colors group-hover:text-foreground">{item.client}</span></td>
                  <td className="px-4 md:px-6 py-3.5"><div className="flex items-baseline gap-2"><span className="text-[10px] font-black text-foreground whitespace-nowrap">{item.date}</span><span className="text-[9px] font-black text-muted-foreground/40">{item.time}</span></div></td>
                  <td className="px-4 md:px-6 py-3.5"><span className="text-[11px] font-black text-emerald-500 whitespace-nowrap">{item.total}</span></td>
                  <td className="px-4 md:px-6 py-3.5"><span className="text-[11px] font-black text-amber-500">{item.markup}</span></td>
                  <td className="px-4 md:px-6 py-3.5 text-center">
                    <div 
                      onClick={() => (item.status !== "VENDA" && item.status !== "PERDIDO") && handleOpenStatus(item)}
                      className={cn(
                        "inline-flex items-center px-5 py-1.5 rounded-full text-[9px] font-black tracking-[0.1em] transition-all", 
                        (item.status !== "VENDA" && item.status !== "PERDIDO") ? "cursor-pointer hover:brightness-110 active:scale-95" : "cursor-default opacity-80",
                        getStatusStyle(item.status)
                      )}
                    >
                      {item.status}
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 transition-all duration-300">
                      <button 
                         onClick={() => {
                          setSelectedItem(item);
                          setIsItemsModalOpen(true);
                        }}
                        className="p-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white transition-all shadow-sm border border-orange-500/20"
                      >
                        <Package className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-2.5 rounded-xl bg-[#0053FC]/10 hover:bg-[#0053FC] text-[#0053FC] hover:text-white transition-all shadow-sm border border-[#0053FC]/20"><MessageSquare className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ITEMS MODAL */}
      {isItemsModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsItemsModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-card border border-border/50 rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-10 pb-6 flex items-center gap-5">
              <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.2)] border border-amber-400/20">
                <Package className="w-6 h-6 text-black" />
              </div>
              <h2 className="text-2xl font-black text-[#0081FF] uppercase tracking-tighter">Itens do Orçamento</h2>
              {selectedItem && (
                <span className="text-[10px] font-black text-muted-foreground/40 bg-secondary/50 px-4 py-1.5 rounded-xl border border-border/50">
                  #{selectedItem.id}
                </span>
              )}
            </div>

            {/* Modal Content - Table */}
            <div className="px-10 py-2">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Cód.</th>
                      <th className="py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] pl-6">Descrição</th>
                      <th className="py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-right">Qtd</th>
                      <th className="py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-right">Un</th>
                      <th className="py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-right">Val. Unit</th>
                      <th className="py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-right">Custo</th>
                      <th className="py-5 text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {[
                      { cod: "11400", desc: "DISJ TRIP 32A CURVA C (SDD63C32) STECK", qtd: "1.00", un: "02", unit: "R$ 70,03", custo: "R$ 50,05", total: "R$ 70,03" },
                      { cod: "19614", desc: "CABO PP 1KV 3X4,00MM CORFIO (POR METRO)", qtd: "30.00", un: "03", unit: "R$ 13,04", custo: "R$ 298,80", total: "R$ 391,20" },
                    ].map((row, i) => (
                      <tr key={i} className="group hover:bg-primary/[0.02] transition-colors">
                        <td className="py-6 text-[12px] font-black text-foreground/80 tracking-tight">{row.cod}</td>
                        <td className="py-6 text-[12px] font-black text-foreground/80 pl-6 tracking-tight">{row.desc}</td>
                        <td className="py-6 text-[12px] font-black text-foreground/80 text-right tracking-tight">{row.qtd}</td>
                        <td className="py-6 text-[12px] font-black text-foreground/80 text-right tracking-tight">{row.un}</td>
                        <td className="py-6 text-[12px] font-black text-foreground/80 text-right tracking-tight">{row.unit}</td>
                        <td className="py-6 text-[12px] font-black text-rose-500 text-right tracking-tight opacity-90">{row.custo}</td>
                        <td className="py-6 text-[12px] font-black text-emerald-500 text-right tracking-tight">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-10 pt-6">
              <button 
                onClick={() => setIsItemsModalOpen(false)}
                className="w-full py-5 bg-[#0053FC] hover:bg-[#0042CC] text-white rounded-[1.5rem] font-black text-base uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS CHANGE MODAL */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsStatusModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-card/95 backdrop-blur-2xl border border-white/10 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] p-10 animate-in zoom-in-95 duration-300 overflow-hidden">
            <button 
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute top-8 right-8 p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-2xl transition-all duration-300"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-8">
              {statusStep === 'selection' ? (
                <>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-black text-foreground tracking-tight leading-tight">Alterar Status</h3>
                    {selectedItem && (
                      <div className="p-4 rounded-2xl bg-secondary/30 border border-border/50">
                        <p className="text-xs font-black text-foreground uppercase tracking-tighter">#{selectedItem.id} — {selectedItem.client}</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Emitido", bg: "bg-[#343A40]", next: null },
                      { label: "Enviado", bg: "bg-[#9C6ADE]", next: 'enviado' },
                      { label: "Negociação", bg: "bg-[#F5C71A]", next: 'negociacao' },
                      { label: "Lib. Crédito", bg: "bg-[#E68A2E]", next: null },
                      { label: "Aguard. Pedido", bg: "bg-[#D35400]", next: null },
                      { label: "Perdido", bg: "bg-[#C0392B]", next: 'perdido' },
                    ].map((btn, i) => (
                      <button 
                        key={i}
                        onClick={() => btn.next ? setStatusStep(btn.next as 'enviado' | 'negociacao' | 'perdido') : handleUpdateStatus(btn.label)}
                        className={cn("py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-tighter transition-all hover:-translate-y-1 active:scale-[0.97] text-white shadow-lg", btn.bg)}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : statusStep === 'enviado' ? (
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-[#0081FF] uppercase tracking-tighter flex items-center gap-4">
                    <Send className="w-5 h-5" /> Status: Enviado
                  </h3>
                  <div className="space-y-5">
                    <input type="text" placeholder="Data de contato (dd/mm/aaaa)" onChange={handleDateMask} className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:border-[#0081FF]/50" />
                    <textarea placeholder="Observação..." rows={4} className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-5 py-4 text-sm font-semibold outline-none resize-none" />
                    <button onClick={() => handleUpdateStatus('ENVIADO')} className="w-full py-5 bg-[#0081FF] text-white rounded-[1.5rem] font-black uppercase tracking-widest">Confirmar</button>
                  </div>
                </div>
              ) : statusStep === 'negociacao' ? (
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-[#F5C71A] uppercase tracking-tighter flex items-center gap-4">
                    <Handshake className="w-6 h-6" /> Negociação
                  </h3>
                  <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
                    <input type="text" placeholder="Endereço da obra *" className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-5 py-4 text-sm font-semibold outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Fechamento *" onChange={handleDateMask} className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-5 py-4" />
                      <input type="text" placeholder="Entrega *" onChange={handleDateMask} className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-5 py-4" />
                    </div>
                    <textarea placeholder="Observação..." rows={3} className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-5 py-4 text-sm font-semibold outline-none resize-none" />
                    <button onClick={() => handleUpdateStatus('NEGOCIAÇÃO')} className="w-full py-5 bg-[#F5C71A] text-black rounded-[1.5rem] font-black uppercase tracking-widest">Salvar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-[#C0392B] uppercase tracking-tighter flex items-center gap-4">
                    <XCircle className="w-6 h-6" /> Status: Perdido
                  </h3>
                  <div className="space-y-5">
                    <select className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-5 py-4 text-sm font-semibold outline-none appearance-none">
                      <option value="">Selecione o motivo...</option>
                      {["Preço Alto", "Estoque", "Prazo", "Desistiu"].map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <textarea placeholder="Observação adicional..." rows={4} className="w-full bg-secondary/30 border border-border/50 rounded-2xl px-5 py-4 text-sm font-semibold outline-none resize-none" />
                    <button onClick={() => handleUpdateStatus('PERDIDO')} className="w-full py-5 bg-[#C0392B] text-white rounded-[1.5rem] font-black uppercase tracking-widest">Confirmar Perda</button>
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

interface CrmSectionProps { activeTab: string; }
export function CrmSection({ activeTab }: CrmSectionProps) {
  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-8 overflow-hidden">
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 min-h-0">
          {activeTab === "Analytics" ? (
            <div className="h-full overflow-y-auto scrollbar-hide py-4"><AnalyticsView /></div>
          ) : activeTab === "Produtos" ? (
            <ProdutosView />
          ) : (
            <OrçamentosView />
          )}
        </div>
      </div>
    </div>
  );
}
