import { useState, useMemo, useEffect } from "react";
import { 
  TrendingDown, 
  Users, 
  PackageX, 
  Download,
  Search,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiCrmOrcamentos } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id?: string;
  name: string;
  role: string;
  avatar?: string;
}

interface RelatoriosViewProps {
  orcamentos?: any[];
  userProfile?: UserProfile;
}

export function RelatoriosView({ 
  orcamentos: propsOrcamentos = [],
  userProfile 
}: RelatoriosViewProps) {
  const [localOrcamentos, setLocalOrcamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("este-mes");
  const [searchTerm, setSearchTerm] = useState("");

  // 0. Carregamento de Dados (Independente)
  useEffect(() => {
    async function fetchData() {
      if (propsOrcamentos.length > 0) {
        setLocalOrcamentos(propsOrcamentos);
        return;
      }

      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        
        // 1. Busca Orçamentos do Mês
        let raw = await apiCrmOrcamentos({ inicio: startOfMonth, fim: endOfMonth });
        
        // 4. Filtro de Privacidade (Vendedor só vê o dele)
        if (userProfile?.role?.toUpperCase() === 'VENDEDOR' && userProfile?.name) {
          const userName = userProfile.name.toUpperCase();
          raw = raw.filter(o => {
            const sellerName = (o.VENDEDOR || "").toUpperCase();
            return sellerName.includes(userName) || userName.includes(sellerName);
          });
          console.log(`[Relatorios] Filtro aplicado para vendedor: ${userProfile.name} (${raw.length} registros)`);
        }

        // 2. Busca Status do CRM
        const { data: statuses } = await supabase.from("crm_status").select("*");
        
        // 3. Cruzamento de Dados (Busca Inteligente via Colunas Reais)
        const merged = (raw || []).map(o => {
          const apiId = String(o.ORCAMENTO).replace("-OR", "").trim();
          
          const s = (statuses || []).find(st => {
            const dbId = String(st.documento).replace("-OR", "").trim();
            return dbId === apiId || st.documento === o.ORCAMENTO;
          });

          const status = (s?.status_crm || "ABERTO").toUpperCase();
          const lossReason = (s?.motivo_perda || "").toUpperCase();

          // Lógica de Filtragem de Itens Perdidos (Fonte: Novas Colunas)
          let itemsToCount: any[] = [];
          
          if (status === "PERDIDO") {
            const idsEstoque = s?.itens_estoque || [];
            const idsPreco = s?.itens_preco || [];
            const allSpecificIds = [...(Array.isArray(idsEstoque) ? idsEstoque : []), ...(Array.isArray(idsPreco) ? idsPreco : [])];

            if (allSpecificIds.length > 1 || (allSpecificIds.length > 0)) {
              itemsToCount = (o.PRODUTOS || []).filter((it: any) => 
                allSpecificIds.map(String).includes(String(it.COD_PRODUTO))
              );
            } 
          } else {
            itemsToCount = o.PRODUTOS || [];
          }

          return {
            id: o.ORCAMENTO,
            client: o.CLIENTE,
            seller: o.VENDEDOR,
            numericValue: parseFloat(String(o.VALOR_TOTAL_ORCAMENTO || 0)),
            value: o.VALOR_TOTAL_ORCAMENTO ? parseFloat(String(o.VALOR_TOTAL_ORCAMENTO)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : "R$ 0,00",
            status,
            lossReason,
            items: itemsToCount,
            empresa: o.EMPRESA
          };
        });
        
        setLocalOrcamentos(merged);
      } catch (e) {
        console.error("[Relatorios] Erro ao carregar dados:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [propsOrcamentos, userProfile?.name, userProfile?.role]);

  const orcamentos = localOrcamentos;

  // 1. Cálculos de Perda de Estoque
  const perdasPorEstoque = useMemo(() => {
    const perdidos = orcamentos.filter(o => o.status === "PERDIDO" && (o.lossReason?.includes("ESTOQUE") || o.lossReason?.includes("PREÇO")));
    
    // Agrupar por produto
    const ranking: Record<string, { cod: string, nome: string, total: number, qtd: number, orcamentos: number }> = {};
    
    perdidos.forEach(o => {
      // Priorizar os itens identificados via metadata (os selecionados pelo usuário)
      // Se não houver itens específicos, mas o orçamento for perdido por estoque,
      // ele foi filtrado para virar [] na nossa lógica anterior. 
      // Precisamos garantir que usamos o o.items que foi filtrado no merged.
      const lostItems = o.items || [];
      
      lostItems.forEach((item: any) => {
        const cod = String(item.COD_PRODUTO || item.cod || "S/C");
        const nome = String(item.PRODUTO || item.nome || "PRODUTO NÃO IDENTIFICADO");
        const valor = parseFloat(String(item.VALOR_TOTAL || item.total || (parseFloat(item.QUANTIDADE || 0) * parseFloat(item.PRECO_UNITARIO || 0)) || 0));
        const qtd = parseFloat(String(item.QUANTIDADE || item.qtd || 1));

        if (!ranking[cod]) {
          ranking[cod] = { 
            cod, 
            nome, 
            total: 0, 
            qtd: 0,
            orcamentos: 0
          };
        }
        ranking[cod].total += valor;
        ranking[cod].qtd += qtd;
        ranking[cod].orcamentos += 1;
      });
    });

    return Object.values(ranking).sort((a, b) => b.total - a.total);
  }, [orcamentos]);

  // 2. Métricas por Vendedor
  const metricasClientes = useMemo(() => {
    const clients: Record<string, { 
      nome: string, 
      total: number, 
      fechados: number, 
      perdidos: number,
      valorPerdido: number,
      items: any[]
    }> = {};

    orcamentos.forEach(o => {
      const clientName = o.client || "CLIENTE NÃO IDENTIFICADO";
      if (!clients[clientName]) {
        clients[clientName] = { 
          nome: clientName, 
          total: 0, 
          fechados: 0, 
          perdidos: 0, 
          valorPerdido: 0,
          items: []
        };
      }
      const c = clients[clientName];
      c.total += 1;
      const val = o.numericValue || 0;
      
      if (o.status === "GANHO" || o.status === "VENDA") {
        c.fechados += 1;
      } else if (o.status === "PERDIDO") {
        c.perdidos += 1;
        c.valorPerdido += val;
      }
      c.items.push(o);
    });

    // Ordenar pelos que mais PERDERAM orçamentos
    return Object.values(clients).sort((a, b) => b.perdidos - a.perdidos).slice(0, 50);
  }, [orcamentos]);

  const stats = [
    { label: "Vendas Perdidas (Valor)", value: perdasPorEstoque.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: PackageX, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Itens Afetados", value: perdasPorEstoque.length.toString(), icon: Package, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Total de Clientes", value: metricasClientes.length.toString(), icon: Users, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  if (loading) {
    return (
      <div className="h-full flex flex-col p-6 space-y-6 bg-background overflow-hidden">
        {/* Skeleton Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="h-10 w-full md:w-64 bg-card/50 rounded-xl animate-pulse border border-border" />
          <div className="flex gap-2">
            <div className="h-10 w-48 bg-card/50 rounded-xl animate-pulse border border-border" />
            <div className="h-10 w-24 bg-card/50 rounded-xl animate-pulse border border-border" />
          </div>
        </div>

        {/* Skeleton Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-28 bg-card/50 rounded-2xl animate-pulse border border-border" />
          ))}
        </div>

        {/* Skeleton Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-card/50 rounded-2xl animate-pulse border border-border" />
          <div className="h-[400px] bg-card/50 rounded-2xl animate-pulse border border-border" />
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    const headers = ["Orçamento", "Vendedor", "Cliente", "Total (R$)", "Status CRM", "Motivo da Perda", "Empresa"];
    const rows = orcamentos.map(o => [
      o.id,
      o.seller,
      o.client,
      o.numericValue.toFixed(2),
      o.status,
      o.lossReason || "",
      o.empresa || ""
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_perdas_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-6 bg-background overflow-hidden">
      {/* Barra de Ações Compacta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative group flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="PESQUISAR PRODUTO OU VENDEDOR..."
            className="w-full bg-card/50 border border-border rounded-xl pl-9 pr-4 py-2 text-[10px] font-black uppercase tracking-wider outline-none focus:border-blue-500/50 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-card/50 rounded-xl border border-border p-1">
            {["este-mes", "ultimo-mes", "total"].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all",
                  dateRange === range ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                {range.replace("-", " ")}
              </button>
            ))}
          </div>
          
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col space-y-6 overflow-hidden">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 shrink-0">
          {stats.map((stat, i) => (
            <div key={i} className="p-5 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
              <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 opacity-5 group-hover:scale-125 transition-transform duration-500", stat.color)}>
                <stat.icon className="w-full h-full" />
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("p-2 rounded-xl", stat.bg)}>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
                </div>
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">{stat.value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Top Produtos Perdidos (Falta de Estoque) */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-[500px]">
            <div className="p-4 border-b border-border bg-secondary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageX className="w-4 h-4 text-rose-500" />
                <span className="text-[11px] font-black uppercase tracking-widest">Top Perdas por Estoque</span>
              </div>
              <span className="text-[9px] font-bold text-muted-foreground uppercase bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full">Alerta de Compras</span>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {perdasPorEstoque.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Package className="w-12 h-12 opacity-10 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma perda registrada</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-card z-10 shadow-sm border-b border-border">
                    <tr>
                      <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Produto</th>
                      <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Qtd.</th>
                      <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perdasPorEstoque.map((p, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors group">
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">CÓD: {p.cod}</span>
                            <span className="text-[10px] font-bold text-foreground line-clamp-1 uppercase tracking-tight">{p.nome}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-[10px] font-black text-foreground">
                            {p.qtd}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-[11px] font-black text-rose-500">
                            {p.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Clientes com Mais Perdas */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-[500px]">
            <div className="p-4 border-b border-border bg-secondary/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                <span className="text-[11px] font-black uppercase tracking-widest">Clientes com Mais Perdas</span>
              </div>
              <TrendingDown className="w-4 h-4 text-rose-500/30" />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-card z-10 shadow-sm border-b border-border">
                  <tr>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cliente</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Status Perda</th>
                    <th className="p-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Valor Perdido</th>
                  </tr>
                </thead>
                <tbody>
                  {metricasClientes
                    .filter(c => c.perdidos > 0)
                    .sort((a, b) => {
                      if (b.perdidos !== a.perdidos) return b.perdidos - a.perdidos;
                      return b.valorPerdido - a.valorPerdido;
                    })
                    .slice(0, 50)
                    .map((c, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="p-4 font-bold text-[10px] uppercase tracking-tight flex items-center gap-3">
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm",
                          i === 0 ? "bg-amber-500/20 text-amber-500 border border-amber-500/20" :
                          i === 1 ? "bg-slate-400/20 text-slate-400 border border-slate-400/20" :
                          i === 2 ? "bg-orange-600/20 text-orange-600 border border-orange-600/20" :
                          "bg-secondary text-muted-foreground"
                        )}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1)}
                        </div>
                        <div className="flex flex-col">
                          <span className={cn("truncate w-32 md:w-48", i < 3 ? "text-foreground" : "text-muted-foreground")}>{c.nome}</span>
                          <span className="text-[8px] text-muted-foreground font-medium">{c.total} orçamentos totais</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-rose-500 transition-all duration-1000" 
                              style={{ width: `${(c.perdidos / (c.total || 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-black text-rose-500">{((c.perdidos / (c.total || 1)) * 100).toFixed(1)}% de perda</span>
                        </div>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-rose-500">{c.valorPerdido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{c.perdidos} OCORRÊNCIAS</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
