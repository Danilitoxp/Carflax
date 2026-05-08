import { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Key, 
  User, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  Search,
  Calendar,
  Wrench,
  Flame,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiCrmAlugueisClientes } from "@/lib/api";

interface Rental {
  id: string;
  machineId: string;
  clientName: string;
  value: number;
  startDate: string;
  endDate?: string;
  paymentStatus: "paid" | "pending";
  salesperson: string;
  status: "active" | "completed" | "overdue";
}

interface Machine {
  id: string;
  name: string;
  model: string;
  status: "available" | "rented" | "maintenance";
  image?: string;
  currentRental?: Rental;
}

export function AlugueisView() {
  const [machines] = useState<Machine[]>([
    {
      id: "TRM20905",
      name: "Termofusora Grande",
      model: "75 a 110mm (220V)",
      status: "available",
      image: "https://casadosoldador.com.br/files/products_images/33231/termofusora-1200w-p-tubos-ppr-75-a-110mm-220v-top-fusion-casa-do-soldador-1%20(1).webp?1691430838"
    },
    {
      id: "TRM20633",
      name: "Termofusora Pequena",
      model: "20 a 63mm (220V)",
      status: "available",
      image: "https://images.tcdn.com.br/img/img_prod/1100542/90_termofusora_ppr_6_bocais_20_a_63mm_800w_220v_trm20633_topfusion_12979_2_786e8cd03e10868e40be143611963701.jpg"
    }
  ]);
  const [history] = useState<Rental[]>([]);
  const [showNewRentalModal, setShowNewRentalModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [clients, setClients] = useState<{ value: string; label: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [search, setSearch] = useState("");
  const [dailyValue, setDailyValue] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState("");

  const resetForm = useCallback(() => {
    setSearch("");
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate("");
    setSelectedMachine(null);
    setDailyValue("");
  }, []);

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const data = await apiCrmAlugueisClientes();
      setClients(data);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  useEffect(() => {
    if (showNewRentalModal) {
      loadClients();
    }
  }, [showNewRentalModal, loadClients]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.label.toLowerCase().includes(search.toLowerCase()) || 
      c.value.toString().includes(search)
    ).slice(0, 5);
  }, [clients, search]);

  const totalCalculation = useMemo(() => {
    if (!startDate || !endDate || !dailyValue) return { days: 0, total: 0 };
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const days = diffDays > 0 ? diffDays : 0;
    const daily = parseFloat(dailyValue.replace(',', '.'));
    return {
      days,
      total: days * daily
    };
  }, [startDate, endDate, dailyValue]);

  const stats = useMemo(() => {
    return {
      available: machines.filter(m => m.status === "available").length,
      rented: machines.filter(m => m.status === "rented").length,
      maintenance: machines.filter(m => m.status === "maintenance").length,
      pendingPayments: machines.reduce((acc, m) => acc + (m.currentRental?.paymentStatus === "pending" ? 1 : 0), 0)
    };
  }, [machines]);

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-[#020617] p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-1">Aluguéis</h1>
          <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">Controle de Equipamentos</p>
        </div>
        <button 
          onClick={() => setShowNewRentalModal(true)}
          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Aluguel
        </button>
      </div>

      {/* Stats - More Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Disponíveis", value: stats.available, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Em Uso", value: stats.rented, icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Manutenção", value: stats.maintenance, icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50" },
          { label: "Pagtos Pendentes", value: stats.pendingPayments, icon: DollarSign, color: "text-rose-500", bg: "bg-rose-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", stat.bg, "dark:bg-opacity-10")}>
              <stat.icon className={cn("w-4 h-4", stat.color)} />
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{stat.label}</span>
              <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {machines.map((machine) => (
          <div key={machine.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group">
            {/* Machine Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  {machine.image ? (
                    <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
                  ) : (
                    <Flame className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white leading-none mb-1">{machine.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase">{machine.id}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{machine.model}</span>
                  </div>
                </div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                machine.status === "available" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                machine.status === "rented" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                "bg-amber-500/10 text-amber-500 border-amber-500/20"
              )}>
                {machine.status === "available" ? "Disponível" : 
                 machine.status === "rented" ? "Alugado" : "Manutenção"}
              </div>
            </div>

            {/* Machine Body */}
            <div className="p-4">
              {machine.status === "rented" && machine.currentRental ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-col gap-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Cliente Atual</span>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-black text-slate-900 dark:text-white">{machine.currentRental.clientName}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Início</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {new Date(machine.currentRental.startDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Vendedor</span>
                      <div className="flex items-center gap-2">
                        <div className="w-3.5 h-3.5 rounded-full bg-primary/10 flex items-center justify-center text-[7px] font-black text-primary uppercase">
                          {machine.currentRental.salesperson[0]}
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{machine.currentRental.salesperson}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-900 dark:bg-slate-950 rounded-xl border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</span>
                      <span className="text-sm font-black text-white">
                        R$ {machine.currentRental.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-black uppercase",
                      machine.currentRental.paymentStatus === "paid" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                    )}>
                      {machine.currentRental.paymentStatus === "paid" ? "Pago" : "Pendente"}
                    </div>
                  </div>

                  <button className="w-full py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    Finalizar
                  </button>
                </div>
              ) : machine.status === "available" ? (
                <div className="h-[180px] flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Pronto para uso</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Nenhum aluguel ativo.</p>
                  </div>
                  <button 
                    onClick={() => { 
                      setSelectedMachine(machine); 
                      setDailyValue(machine.id === "TRM20905" ? "200,00" : "150,00");
                      setShowNewRentalModal(true); 
                    }}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 group/btn"
                  >
                    Alugar agora
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              ) : (
                <div className="h-[180px] flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                    <Wrench className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Manutenção</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">Indisponível temporariamente.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* History Section - New */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Histórico Recente</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Equipamento</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                <th className="px-4 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.length > 0 ? history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase">{item.machineId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">{item.clientName}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">{item.salesperson}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                      {new Date(item.startDate).toLocaleDateString('pt-BR')} - {item.endDate ? new Date(item.endDate).toLocaleDateString('pt-BR') : '...'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[10px] font-black text-slate-900 dark:text-white">
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-500">
                      Concluído
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum histórico encontrado</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Rental Modal (Placeholder for the idea) */}
      {showNewRentalModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Key className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Novo Registro</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Aluguel de Equipamento</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowNewRentalModal(false); resetForm(); }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45 text-slate-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-3">
                {!selectedMachine && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Equipamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      {machines.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedMachine(m);
                            setDailyValue(m.id === "TRM20905" ? "200,00" : "150,00");
                          }}
                          className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 hover:bg-slate-100 p-2 rounded-xl border flex items-center gap-2 transition-all text-left"
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-slate-100 dark:border-slate-700">
                            <img src={m.image} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[10px] font-black uppercase leading-none truncate text-slate-900 dark:text-white">
                              {m.name.split(' ')[1]}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-tighter truncate text-slate-400">
                              {m.id}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Cliente</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar cliente..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary/50 transition-all text-slate-900 dark:text-white"
                    />
                    
                    {search && filteredClients.length > 0 && (
                      <div className="absolute z-10 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
                        {filteredClients.map((client) => (
                          <div 
                            key={client.value}
                            onClick={() => { setSearch(client.label); }}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between group"
                          >
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-900 dark:text-white">{client.label}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase">{client.value}</span>
                            </div>
                            <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                          </div>
                        ))}
                      </div>
                    )}

                    {loadingClients && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Retirada</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-2 py-2 text-xs font-bold outline-none focus:border-primary/50 transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Entrega</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-2 py-2 text-xs font-bold outline-none focus:border-primary/50 transition-all text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Valor da Diária</span>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">R$ {dailyValue || "0,00"}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Duração</span>
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">{totalCalculation.days} {totalCalculation.days === 1 ? 'dia' : 'dias'}</span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-[0.15em]">Total a Pagar</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        R$ {totalCalculation.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  // Aqui seria a lógica de salvar no banco futuramente
                  setShowNewRentalModal(false);
                  resetForm();
                }}
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-90 transition-all"
              >
                Confirmar Aluguel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
