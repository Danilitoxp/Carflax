import { useState, useMemo } from "react";
import { 
  Search, 
  Users, 
  TrendingUp, 
  History, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Filter,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Ban,
  Clock,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TinyDropdown } from "@/components/ui/TinyDropdown";

interface ClienteFRV {
  id: string;
  name: string;
  document: string; // CNPJ/CPF
  vendedor: string;
  saldoTotal: number;
  saldoLiberado: number;
  saldoBloqueado: number;
  ultimaMovimentacao: string;
  status: "Ativo" | "Bloqueado" | "Em Análise";
  classificacao: "Vip" | "Gold" | "Standard";
}

interface Movimentacao {
  id: string;
  data: string;
  tipo: "Crédito" | "Débito";
  valor: number;
  descricao: string;
  status: "Concluído" | "Pendente";
}

const mockClientes: ClienteFRV[] = [
  {
    id: "10502",
    name: "CONSTRUTORA ALFA LTDA",
    document: "12.345.678/0001-90",
    vendedor: "DANILO OLIVEIRA",
    saldoTotal: 25450.80,
    saldoLiberado: 20000.00,
    saldoBloqueado: 5450.80,
    ultimaMovimentacao: "2026-04-20",
    status: "Ativo",
    classificacao: "Vip"
  },
  {
    id: "10588",
    name: "MECÂNICA DO JOÃO",
    document: "98.765.432/0001-10",
    vendedor: "FERNANDO SILVA",
    saldoTotal: 1200.00,
    saldoLiberado: 1200.00,
    saldoBloqueado: 0,
    ultimaMovimentacao: "2026-04-15",
    status: "Ativo",
    classificacao: "Standard"
  },
  {
    id: "11023",
    name: "TRANSPORTADORA RÁPIDO",
    document: "45.678.901/0001-22",
    vendedor: "DANILO OLIVEIRA",
    saldoTotal: 45700.00,
    saldoLiberado: 35000.00,
    saldoBloqueado: 10700.00,
    ultimaMovimentacao: "2026-04-21",
    status: "Em Análise",
    classificacao: "Gold"
  },
  {
    id: "12005",
    name: "CONDOMÍNIO SOLARIS",
    document: "11.222.333/0001-44",
    vendedor: "ROBERTO SOUZA",
    saldoTotal: 890.50,
    saldoLiberado: 0,
    saldoBloqueado: 890.50,
    ultimaMovimentacao: "2026-04-10",
    status: "Bloqueado",
    classificacao: "Standard"
  },
  {
    id: "13042",
    name: "REDE DE POSTOS SHELL",
    document: "55.666.777/0001-88",
    vendedor: "DANILO OLIVEIRA",
    saldoTotal: 125000.00,
    saldoLiberado: 110000.00,
    saldoBloqueado: 15000.00,
    ultimaMovimentacao: "2026-04-22",
    status: "Ativo",
    classificacao: "Vip"
  }
];

const mockMovimentacoes: Movimentacao[] = [
  { id: "1", data: "2026-04-22 09:30", tipo: "Crédito", valor: 5000, descricao: "Bonificação por volume de compras", status: "Concluído" },
  { id: "2", data: "2026-04-20 14:15", tipo: "Débito", valor: 1500, descricao: "Abatimento em duplicata #45021", status: "Concluído" },
  { id: "3", data: "2026-04-18 11:00", tipo: "Crédito", valor: 250, descricao: "Estorno de devolução parcial", status: "Concluído" },
  { id: "4", data: "2026-04-15 16:45", tipo: "Débito", valor: 3000, descricao: "Uso de reserva para frete especial", status: "Pendente" },
];

export function ClientesFRVView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVendedor, setFilterVendedor] = useState("Todos os Vendedores");
  const [filterStatus, setFilterStatus] = useState("Todos os Status");
  const [selectedCliente, setSelectedCliente] = useState<ClienteFRV | null>(null);

  const filteredClientes = useMemo(() => {
    return mockClientes.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.id.includes(searchTerm) || 
                           c.document.includes(searchTerm);
      const matchesVendedor = filterVendedor === "Todos os Vendedores" || c.vendedor === filterVendedor;
      const matchesStatus = filterStatus === "Todos os Status" || c.status === filterStatus;
      return matchesSearch && matchesVendedor && matchesStatus;
    });
  }, [searchTerm, filterVendedor, filterStatus]);

  const stats = useMemo(() => {
    const total = mockClientes.reduce((acc, c) => acc + c.saldoTotal, 0);
    const liberado = mockClientes.reduce((acc, c) => acc + c.saldoLiberado, 0);
    const bloqueado = mockClientes.reduce((acc, c) => acc + c.saldoBloqueado, 0);
    return { total, liberado, bloqueado };
  }, []);

  const uniqueVendedores = useMemo(() => {
    const vends = new Set(mockClientes.map(c => c.vendedor));
    return ["Todos os Vendedores", ...Array.from(vends)];
  }, []);

  return (
    <div className="h-full flex flex-col bg-background p-6 gap-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Users className="w-6 h-6 text-primary" />
            </div>
            Carteira de Clientes - FRV
          </h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ml-14">
            Gestão do Fundo de Reserva de Valor
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-10 px-4 bg-secondary/50 border border-border text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-secondary transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="h-10 px-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20">
            <TrendingUp className="w-4 h-4" />
            Relatório Consolidado
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Saldo Total em Reserva</p>
          <h3 className="text-2xl font-black text-foreground tabular-nums">
            {stats.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </h3>
          <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-emerald-500">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+12.5% em relação ao mês anterior</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Saldo Liberado</p>
          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.liberado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </h3>
          <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.liberado / stats.total) * 100}%` }} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Saldo Bloqueado / Pendente</p>
          <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {stats.bloqueado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </h3>
          <div className="mt-3 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(stats.bloqueado / stats.total) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-center shrink-0">
        <div className="flex-1 relative group w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Buscar por nome, código ou documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <TinyDropdown
            value={filterVendedor}
            options={uniqueVendedores}
            onChange={setFilterVendedor}
            icon={Briefcase}
            variant="slate"
            placeholder="Vendedor"
            className="min-w-[180px]"
          />
          <TinyDropdown
            value={filterStatus}
            options={["Todos os Status", "Ativo", "Bloqueado", "Em Análise"]}
            onChange={setFilterStatus}
            icon={Filter}
            variant="blue"
            placeholder="Status"
            className="min-w-[150px]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 overflow-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-md border-b border-border">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Classificação</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Saldo Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Disponível</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredClientes.map((cliente) => (
                <tr 
                  key={cliente.id} 
                  className={cn(
                    "hover:bg-secondary/30 transition-colors group cursor-pointer",
                    selectedCliente?.id === cliente.id && "bg-primary/5"
                  )}
                  onClick={() => setSelectedCliente(cliente)}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                        {cliente.name}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-muted-foreground">ID: {cliente.id}</span>
                        <span className="text-[9px] font-bold text-muted-foreground/40">•</span>
                        <span className="text-[9px] font-bold text-muted-foreground">{cliente.document}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tight",
                      cliente.classificacao === "Vip" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                      cliente.classificacao === "Gold" ? "bg-slate-400/10 text-slate-500 border border-slate-400/20" :
                      "bg-secondary text-muted-foreground"
                    )}>
                      {cliente.classificacao}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-black text-foreground tabular-nums">
                      {cliente.saldoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {cliente.saldoLiberado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <div className="w-16 h-1 bg-secondary rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${(cliente.saldoLiberado / cliente.saldoTotal) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight",
                      cliente.status === "Ativo" ? "bg-emerald-500/10 text-emerald-600" :
                      cliente.status === "Bloqueado" ? "bg-rose-500/10 text-rose-600" :
                      "bg-amber-500/10 text-amber-600"
                    )}>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        cliente.status === "Ativo" ? "bg-emerald-500" :
                        cliente.status === "Bloqueado" ? "bg-rose-500" :
                        "bg-amber-500"
                      )} />
                      {cliente.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-all">
                        <History className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-primary transition-all">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Side Panel / Overlay (Conditional) */}
      {selectedCliente && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-[60] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20">
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Detalhes FRV</h3>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{selectedCliente.name}</p>
            </div>
            <button 
              onClick={() => setSelectedCliente(null)}
              className="p-2 hover:bg-secondary rounded-xl transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all gap-2 group">
                <ArrowUpRight className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Adicionar Crédito</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all gap-2 group">
                <ArrowDownLeft className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">Solicitar Débito</span>
              </button>
            </div>

            {/* Detailed Balance */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <Wallet className="w-3 h-3" />
                Composição do Saldo
              </h4>
              <div className="space-y-3 bg-secondary/30 rounded-2xl p-4 border border-border/50">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Saldo em Conta</span>
                  <span className="text-xs font-black text-foreground">R$ 18.000,00</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Bonificações Pendentes</span>
                  <span className="text-xs font-black text-blue-500">+ R$ 2.000,00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Reserva p/ Devoluções</span>
                  <span className="text-xs font-black text-rose-500">- R$ 5.450,80</span>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                <History className="w-3 h-3" />
                Histórico Recente
              </h4>
              <div className="space-y-3">
                {mockMovimentacoes.map((mov) => (
                  <div key={mov.id} className="flex gap-4 p-3 rounded-xl border border-border/50 hover:bg-secondary/20 transition-all group">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      mov.tipo === "Crédito" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                    )}>
                      {mov.tipo === "Crédito" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="text-[10px] font-black text-foreground truncate uppercase">{mov.descricao}</p>
                        <span className={cn(
                          "text-[10px] font-black whitespace-nowrap",
                          mov.tipo === "Crédito" ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {mov.tipo === "Crédito" ? "+" : "-"} {mov.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-bold text-muted-foreground">{mov.data}</span>
                        <span className="text-[8px] font-bold text-muted-foreground/40">•</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tighter",
                          mov.status === "Concluído" ? "text-emerald-500" : "text-amber-500"
                        )}>
                          {mov.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Account Status Card */}
            <div className={cn(
              "p-4 rounded-2xl border flex items-center gap-4",
              selectedCliente.status === "Ativo" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20"
            )}>
              {selectedCliente.status === "Ativo" ? (
                <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
              ) : (
                <Ban className="w-8 h-8 text-rose-500 shrink-0" />
              )}
              <div>
                <p className="text-[10px] font-black text-foreground uppercase tracking-tight">Status da Conta: {selectedCliente.status}</p>
                <p className="text-[8px] font-bold text-muted-foreground mt-0.5">
                  {selectedCliente.status === "Ativo" 
                    ? "Cliente elegível para resgate de valores e aplicação de descontos via FRV."
                    : "Resgates e movimentações temporariamente suspensos para este cliente."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-border bg-secondary/10">
            <button className="w-full py-4 bg-foreground text-background rounded-2xl font-black text-[11px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl">
              Gerar Extrato PDF
            </button>
          </div>
        </div>
      )}

      {/* Mobile Selection Message */}
      {!selectedCliente && (
        <div className="hidden lg:flex fixed bottom-10 left-1/2 -translate-x-1/2 items-center gap-3 px-6 py-3 bg-card border border-border rounded-full shadow-2xl animate-bounce">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <p className="text-[9px] font-black text-foreground uppercase tracking-widest">Selecione um cliente para ver o detalhamento do FRV</p>
        </div>
      )}
    </div>
  );
}
