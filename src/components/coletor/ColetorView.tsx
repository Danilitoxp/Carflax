import { useState, useEffect, useCallback } from "react";
import { 
  Smartphone, 
  Activity, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ExternalLink,
  Settings,
  Users,
  ListChecks,
  Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface StorageItem {
  codigo: string;
  nome: string;
  qtd: number;
  loc?: string;
}

interface StorageTask {
  id: string;
  conferencia_id: string;
  fornecedor: string;
  status: string;
  created_at: string;
  itens: StorageItem[];
  empresa_id: string;
  operador_nome?: string;
}

interface ActiveSession {
  conferencia_id: string;
  produto_codigo: string;
  operador: string;
  operador_nome: string;
  empresa: string;
  locked_at: string;
  qtde_conferida: number;
  qtde_total: number;
}

interface ActivePicking {
  pedido_id: string;
  operador: string;
  operador_nome: string;
  empresa: string;
  locked_at: string;
  qtde_separada: number;
  qtde_total: number;
}

interface InventoryItem {
  operador: string;
  operador_nome: string;
  produto_codigo: string;
  produto_nome: string;
  quantidade: number;
  localizacao: string;
  created_at: string;
}

interface PendingPicking {
  FGO_NUMDOC: string;
  NOME_CLIENTE: string;
  FGO_HORENT: string;
  STA_DESCRI: string;
  NOME_VENDEDOR: string;
  FGO_CODEMP: string;
  FGO_VOLUME: string;
  NOME_SEPARADOR?: string;
}

interface MissingItem {
  id: string;
  pedido: string;
  codigo_produto: string;
  descricao_produto: string;
  quantidade_pedida: number;
  quantidade_separada: number;
  separador_nome: string;
  empresa: string;
  timestamp: string;
  resolvido: boolean;
}

export function ColetorView() {
  const [activeTab, setActiveTab] = useState<"monitor" | "separacao" | "armazenamento" | "inventario" | "faltas" | "config">("monitor");
  const [storageTasks, setStorageTasks] = useState<StorageTask[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [activePickings, setActivePickings] = useState<ActivePicking[]>([]);
  const [pendingPickings, setPendingPickings] = useState<PendingPicking[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");



  const fetchData = useCallback(async () => {
    try {
      // 1. Buscar Armazenamentos Pendentes
      const { data: storageData } = await supabase
        .from('coletor_armazenamento')
        .select('*')
        .eq('status', 'PENDENTE')
        .order('created_at', { ascending: false });

      setStorageTasks((storageData as StorageTask[]) || []);

      // 2. Buscar Sessões Ativas (Conferência)
      const { data: sessionData } = await supabase
        .from('coletor_conferencia')
        .select('*');

      setActiveSessions((sessionData as ActiveSession[]) || []);

      // 3. Buscar Sessões de Separação
      const { data: pickingData } = await supabase
        .from('coletor_separacao')
        .select('*');

      setActivePickings((pickingData as ActivePicking[]) || []);

      try {
        const response = await fetch("https://marketing-banco-de-dados.velbav.easypanel.host/api/pedidos-separacao");
        const data = await response.json();
        if (data.success) {
          setPendingPickings(data.data || []);
        }
      } catch (err) {
        console.error("Erro ao buscar pedidos pendentes da API:", err);
      }

      // 5. Buscar Faltas (Divergências)
      const { data: faltasData } = await supabase
        .from('coletor_faltas')
        .select('*')
        .order('timestamp', { ascending: false });

      setMissingItems((faltasData as MissingItem[]) || []);

      // Inventário (Opcional - Atualmente Externo na Citel)
      setInventoryItems([]);
    } catch (error) {
      console.error("Erro ao buscar dados do coletor:", error);
    } finally {
      // Carregamento finalizado
    }
  }, []);

  const handleUnlockPicking = async (picking: ActivePicking) => {
    if (!confirm(`Deseja forçar a liberação do pedido ${picking.pedido_id} operado por ${picking.operador_nome}?`)) return;
    
    try {
      const { error } = await supabase
        .from('coletor_separacao')
        .delete()
        .eq('pedido_id', picking.pedido_id);

      if (error) throw error;
      fetchData();
    } catch {
      alert("Erro ao liberar sessão de separação");
    }
  };

  const handleDeleteStorage = async (task: StorageTask) => {
    if (!confirm(`Deseja realmente excluir a tarefa de armazenamento da NF ${task.conferencia_id}?`)) return;
    
    try {
      const { error } = await supabase
        .from('coletor_armazenamento')
        .delete()
        .eq('id', task.id);

      if (error) throw error;
      fetchData();
    } catch {
      alert("Erro ao excluir tarefa de armazenamento");
    }
  };

  const handleUnlockSession = async (session: ActiveSession) => {
    if (!confirm(`Deseja forçar a liberação do produto ${session.produto_codigo} operado por ${session.operador_nome}?`)) return;
    
    try {
      const { error } = await supabase
        .from('coletor_conferencia')
        .delete()
        .eq('conferencia_id', session.conferencia_id)
        .eq('produto_codigo', session.produto_codigo);

      if (error) throw error;
      fetchData();
    } catch {
      alert("Erro ao liberar sessão");
    }
  };

  useEffect(() => {
    fetchData();
    const storageSub = supabase
      .channel('coletor-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coletor_armazenamento' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coletor_conferencia' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coletor_separacao' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coletor_faltas' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(storageSub);
    };
  }, [fetchData]);

  const filteredStorageTasks = storageTasks.filter(task => 
    task.conferencia_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (task.fornecedor && task.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPendingPickings = pendingPickings.filter(picking =>
    picking.FGO_NUMDOC.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (picking.NOME_CLIENTE && picking.NOME_CLIENTE.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-transparent space-y-6">
      {/* Header com Stats Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card/50 backdrop-blur-md border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm group hover:border-blue-500/50 transition-all">
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Atividade</p>
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{activeSessions.length} Operando</h3>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-md border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm group hover:border-amber-500/50 transition-all">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pendente</p>
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{storageTasks.length} NF's</h3>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-md border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm group hover:border-emerald-500/50 transition-all">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Inventário</p>
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{inventoryItems.length} Coletas</h3>
          </div>
        </div>

        <div className="bg-card/50 backdrop-blur-md border border-border p-5 rounded-2xl flex items-center gap-4 shadow-sm group hover:border-amber-500/50 transition-all">
          <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
            <ListChecks className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Separação</p>
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight">{activePickings.length} Ativos</h3>
          </div>
        </div>
      </div>

      {/* Tabs Customizadas */}
      <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-xl w-fit border border-border/50">
        <button 
          onClick={() => setActiveTab("monitor")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "monitor" ? "bg-card text-blue-500 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          Monitor
        </button>
        <button 
          onClick={() => setActiveTab("separacao")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative",
            activeTab === "separacao" ? "bg-card text-amber-500 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ListChecks className="w-3.5 h-3.5" />
          Separação
          {activePickings.length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab("armazenamento")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "armazenamento" ? "bg-card text-blue-500 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="w-3.5 h-3.5" />
          Armazenamento
        </button>
        <button 
          onClick={() => setActiveTab("inventario")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "inventario" ? "bg-card text-blue-500 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Inventário
        </button>
        <button 
          onClick={() => setActiveTab("faltas")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative",
            activeTab === "faltas" ? "bg-card text-rose-500 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          Faltas
          {missingItems.filter(f => !f.resolvido).length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab("config")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === "config" ? "bg-card text-blue-500 shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          Configurações
        </button>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 bg-card/30 backdrop-blur-sm border border-border rounded-3xl overflow-hidden flex flex-col shadow-xl min-h-[500px]">
        {activeTab === "separacao" && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Separação de Pedidos</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Acompanhamento de picking em tempo real</p>
              </div>
              
              <div className="flex-1 max-w-md mx-8 relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar Pedido ou Cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-foreground outline-none focus:border-blue-600/50 focus:bg-background transition-all placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">
                    {activePickings.length} Em Separação
                  </span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] font-black uppercase text-blue-500 tracking-widest">
                    {filteredPendingPickings.length} Pendentes
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Sessões Ativas (Destaque) */}
              {activePickings.length > 0 && (
                <div className="p-6 border-b border-border space-y-4 shrink-0 bg-secondary/10">
                  <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-3 h-3 text-amber-500" />
                    Sessões Ativas Agora
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {activePickings.map((picking, idx) => (
                      <div key={idx} className="bg-card border border-border p-5 rounded-2xl space-y-4 hover:border-amber-500/30 transition-all shadow-sm group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 font-black text-xs">
                              {picking.operador.substring(0, 3)}
                            </div>
                            <div>
                              <p className="text-[11px] font-black text-foreground uppercase leading-none">{picking.operador_nome}</p>
                              <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Empresa {picking.empresa}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleUnlockPicking(picking)}
                            className="p-2 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg transition-all"
                            title="Forçar Liberação"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-muted-foreground">PEDIDO:</span>
                            <span className="text-foreground font-black">{picking.pedido_id}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-muted-foreground">ITENS:</span>
                            <span className="text-foreground">{picking.qtde_separada} de {picking.qtde_total}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-muted-foreground">INÍCIO:</span>
                            <span className="text-foreground">{new Date(picking.locked_at).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="text-amber-600">{Math.round((picking.qtde_separada / (picking.qtde_total || 1)) * 100)}%</span>
                          </div>
                          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 transition-all duration-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" 
                              style={{ width: `${(picking.qtde_separada / (picking.qtde_total || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pedidos Pendentes (Lista) */}
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-md border-b border-border">
                      <tr>
                        <th className="p-4 pl-6 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pedido</th>
                        <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Cliente / Vendedor</th>
                        <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Vol</th>
                        <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                        <th className="p-4 pr-6 text-right text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Separador</th>
                      </tr>
                    </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredPendingPickings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest italic opacity-50">
                          Nenhum pedido encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredPendingPickings.map((pedido, idx) => (
                        <tr key={idx} className="hover:bg-secondary/20 transition-all group">
                          <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-foreground uppercase tracking-tight">#{pedido.FGO_NUMDOC}</span>
                              <span className="text-[9px] font-bold text-muted-foreground uppercase">{pedido.FGO_HORENT}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col max-w-[350px]">
                            <span className="text-[11px] font-black text-foreground uppercase tracking-tight truncate">{pedido.NOME_CLIENTE}</span>
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">{pedido.NOME_VENDEDOR}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 bg-secondary rounded text-[9px] font-black">{Math.round(Number(pedido.FGO_VOLUME))} Vol</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {pedido.STA_DESCRI === "Separando" ? (
                              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20 shadow-sm shadow-amber-500/5">
                                <Activity className="w-3 h-3 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-tight">Separando</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full border border-emerald-500/20 shadow-sm shadow-emerald-500/5">
                                <Clock className="w-3 h-3" />
                                <span className="text-[9px] font-black uppercase tracking-tight">Aguardando</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {pedido.NOME_SEPARADOR ? (
                            <span className="text-[10px] font-black text-foreground uppercase tracking-tight truncate max-w-[150px] inline-block">
                              {pedido.NOME_SEPARADOR.split(' ')[0]} {pedido.NOME_SEPARADOR.split(' ').pop()}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest italic">
                              Não Atribuído
                            </span>
                          )}
                        </td>
                      </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "monitor" && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Operações em Tempo Real</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sessões ativas no coletor de mão</p>
              </div>
              <Users className="w-5 h-5 text-muted-foreground/30" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {activeSessions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale py-20">
                  <Activity className="w-16 h-16 mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">Nenhuma sessão ativa agora</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeSessions.map((session, idx) => (
                    <div key={idx} className="bg-card border border-border p-5 rounded-2xl space-y-4 hover:border-blue-500/30 transition-all shadow-sm group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-blue-500 font-black text-xs">
                            {session.operador.substring(0, 3)}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-foreground uppercase leading-none">{session.operador_nome}</p>
                            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Empresa {session.empresa}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUnlockSession(session)}
                          className="p-2 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-lg transition-all"
                          title="Forçar Liberação"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground">NF / DOC:</span>
                          <span className="text-foreground">{session.conferencia_id}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground">PRODUTO:</span>
                          <span className="text-foreground">{session.produto_codigo}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground">INÍCIO:</span>
                          <span className="text-foreground">{new Date(session.locked_at).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                          <span className="text-muted-foreground">Progresso do Item</span>
                          <span className="text-blue-500">{Math.round((session.qtde_conferida / (session.qtde_total || 1)) * 100)}%</span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 transition-all duration-500" 
                            style={{ width: `${(session.qtde_conferida / (session.qtde_total || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "armazenamento" && (
          <div className="flex flex-col h-full">
             <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Fila de Armazenamento</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mercadorias conferidas aguardando guarda</p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <input 
                  type="text" 
                  placeholder="Buscar NF ou Fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:border-blue-500/50 outline-none w-64"
                />
              </div>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-md border-b border-border">
                  <tr>
                    <th className="p-4 pl-6 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Nota Fiscal</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Fornecedor</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Itens</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Operador</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Data/Hora</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                    <th className="p-4 pr-6 text-right text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredStorageTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest italic opacity-50">
                        Nenhuma tarefa encontrada
                      </td>
                    </tr>
                  ) : (
                    filteredStorageTasks.map((task) => (
                      <tr key={task.id} className="hover:bg-secondary/20 transition-all group">
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{task.conferencia_id}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase truncate block max-w-[200px]">{task.fornecedor}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 bg-secondary rounded text-[9px] font-black">{task.itens?.length || 0} Itens</div>
                          </div>
                        </td>
                        <td className="p-4">
                           <span className="text-[10px] font-bold text-foreground uppercase">{task.operador_nome || "N/A"}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-foreground">{new Date(task.created_at).toLocaleDateString()}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(task.created_at).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full border border-amber-500/20 shadow-sm shadow-amber-500/5">
                            <Clock className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-tight">Aguardando Guarda</span>
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-right">
                           <button 
                             onClick={() => handleDeleteStorage(task)}
                             className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all shadow-sm"
                             title="Excluir Tarefa"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "faltas" && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Relatório de Faltas</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Itens não encontrados durante a separação</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  {missingItems.filter(f => !f.resolvido).length} Pendentes
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card border-b border-border z-10">
                  <tr>
                    <th className="p-4 pl-6 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Data/Hora</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pedido</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Produto</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Esperado / Achado</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Separador</th>
                    <th className="p-4 pr-6 text-right text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {missingItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest italic opacity-50">
                        Nenhuma falta registrada
                      </td>
                    </tr>
                  ) : (
                    missingItems.map((item) => (
                      <tr key={item.id} className={cn("hover:bg-secondary/20 transition-colors", item.resolvido && "opacity-60")}>
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-foreground">{new Date(item.timestamp).toLocaleDateString()}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[11px] font-black text-foreground">#{item.pedido}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-blue-500">{item.codigo_produto}</span>
                            <span className="text-[9px] font-bold text-muted-foreground truncate max-w-[200px] uppercase">{item.descricao_produto}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                             <span className="text-sm font-black text-foreground">{item.quantidade_pedida}</span>
                             <span className="text-[10px] text-muted-foreground">/</span>
                             <span className="text-sm font-black text-rose-500">{item.quantidade_separada}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-black text-foreground uppercase">{item.separador_nome}</span>
                        </td>
                        <td className="p-4 pr-6 text-right">
                          {item.resolvido ? (
                            <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolvido
                            </div>
                          ) : (
                            <button 
                              onClick={async () => {
                                await supabase.from('coletor_faltas').update({ resolvido: true }).eq('id', item.id);
                                fetchData();
                              }}
                              className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border border-rose-500/20"
                            >
                              Pendente
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "inventario" && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-foreground uppercase tracking-tight">Contagens de Inventário</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Últimas coletas realizadas via coletor</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest">
                  {inventoryItems.length} Coletas
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card border-b border-border z-10">
                  <tr>
                    <th className="p-4 pl-6 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Operador</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Produto</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Qtd Coletada</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Localização</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Data/Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {inventoryItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest italic opacity-50">
                        Nenhum item de inventário encontrado
                      </td>
                    </tr>
                  ) : (
                    inventoryItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-4 pl-6">
                          <span className="text-[10px] font-black text-foreground uppercase">{item.operador_nome || item.operador}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-blue-500">{item.produto_codigo}</span>
                            <span className="text-[9px] font-bold text-muted-foreground truncate max-w-[200px] uppercase">{item.produto_nome}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-black text-foreground">{item.quantidade}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-[10px] font-bold text-amber-500 uppercase">{item.localizacao || "N/A"}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                            <span className="text-[9px] text-muted-foreground">{new Date(item.created_at).toLocaleTimeString()}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div className="p-10 space-y-8 max-w-2xl">
            <div className="space-y-4">
              <h2 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                <Settings className="w-5 h-5 text-blue-500" />
                Infraestrutura de Impressão
              </h2>
              <div className="bg-card border border-border p-6 rounded-2xl space-y-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase text-foreground">Servidor BarTender (DonlyX)</p>
                    <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">Endereço do servidor local de etiquetas</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <input 
                    type="text" 
                    defaultValue="http://192.168.10.225:3003"
                    className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 text-xs font-black outline-none focus:border-blue-500/50"
                  />
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                    Salvar
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-3">
                <Activity className="w-5 h-5 text-amber-500" />
                Sincronização de Dados
              </h2>
              <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-2xl space-y-4">
                <p className="text-[10px] font-bold text-amber-600/80 leading-relaxed uppercase tracking-wide">
                  O Carflax está conectado ao banco de dados <span className="font-black underline decoration-amber-500/30">htcyaamvyjghjkzrzhvk</span> (Coletor). 
                  Todas as alterações em orçamentos e estoques são sincronizadas em tempo real através da API Marketing.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
