import { useEffect, useState } from "react";
import { 
  Search, 
  User, 
  Phone, 
  CheckCircle2,
  Trash2,
  MessageSquare,
  LayoutGrid,
  Flame
} from "lucide-react";
import { marketingService } from "@/lib/marketing-service";
import type { MarketingCliente } from "@/lib/marketing-service";
import { cn } from "@/lib/utils";
import { TinyDropdown } from "@/components/ui/TinyDropdown";

const TEMP_CONFIG = {
  Quente: { color: "text-rose-500 bg-rose-500/10 border-rose-500/20", dot: "bg-rose-500" },
  Morno:  { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-500" },
  Frio:   { color: "text-blue-500 bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500" },
};

export function LeadsView() {
  const [leads, setLeads] = useState<MarketingCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("Todas as Plataformas");
  const [filterTemperature, setFilterTemperature] = useState("Todas as Temperaturas");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load leads on filters or page change
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const offset = (currentPage - 1) * pageSize;
      const { data, count } = await marketingService.getLeadsPaginated(
        pageSize,
        offset,
        debouncedSearch,
        filterTemperature
      );
      if (isMounted) {
        setLeads(data);
        setTotalCount(count);
        setLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, [currentPage, pageSize, debouncedSearch, filterTemperature]);

  const refreshLeads = async () => {
    setLoading(true);
    const offset = (currentPage - 1) * pageSize;
    const { data, count } = await marketingService.getLeadsPaginated(
      pageSize,
      offset,
      debouncedSearch,
      filterTemperature
    );
    setLeads(data);
    setTotalCount(count);
    setLoading(false);
  };

  const handleDeleteLead = async (jid: string) => {
    if (confirm("Tem certeza que deseja excluir este lead permanentemente?")) {
      await marketingService.deleteCliente(jid);
      refreshLeads();
    }
  };

  const handleOpenChat = (jid: string) => {
    // Salva o JID para que o WhatsappView possa abrir automaticamente
    localStorage.setItem("carflax_pending_chat", jid);
    window.dispatchEvent(new CustomEvent("carflax-change-tab", { detail: "Whatsapp Evolution" }));
  };

  // Como a plataforma ainda não está no banco, tratamos todos como WhatsApp por enquanto
  const filtered = filterPlatform === "Todas as Plataformas" || filterPlatform === "WhatsApp"
    ? leads
    : [];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden p-8">
      {/* Toolbar */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border/50 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:border-primary/50 transition-all shadow-sm"
          />
        </div>

        <div className="flex gap-2">
          <TinyDropdown 
            value={filterPlatform} 
            options={["Todas as Plataformas", "WhatsApp", "Instagram", "Facebook", "Google"]} 
            onChange={setFilterPlatform} 
            icon={LayoutGrid} 
            variant="slate" 
            placeholder="Plataforma" 
          />
          
          <TinyDropdown 
            value={filterTemperature} 
            options={["Todas as Temperaturas", "Quente", "Morno", "Frio"]} 
            onChange={setFilterTemperature} 
            icon={Flame} 
            variant="amber" 
            placeholder="Temperatura" 
          />

        </div>
      </div>

      {/* Lista Estilo Tabela/Inbox */}
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground bg-card/30 border border-dashed border-border rounded-3xl">
            <CheckCircle2 className="w-12 h-12 opacity-20" />
            <p className="text-lg font-bold tracking-tight">Tudo em dia!</p>
            <p className="text-sm opacity-60">Nenhum lead novo para processar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Cabeçalho da Lista */}
            <div className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr] gap-4 px-6 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>Lead / Contato</span>
              <span>Telefone</span>
              <span>Motivo</span>
              <span>Temperatura</span>
              <span className="text-right">Ações</span>
            </div>

            {filtered.map(lead => {
              const nome = lead.nome || lead.push_name || lead.remote_jid.split('@')[0];
              const phone = lead.remote_jid.split('@')[0];
              const temp = lead.temperatura || "Frio";
              const tempCfg = TEMP_CONFIG[temp as keyof typeof TEMP_CONFIG] || TEMP_CONFIG.Frio;
              return (
                <div key={lead.remote_jid} className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr] gap-4 items-center bg-card border border-border/50 rounded-2xl p-3 hover:border-primary/30 hover:bg-primary/[0.02] transition-all group">
                  {/* Lead / Contato */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-secondary overflow-hidden border border-border/50 shrink-0">
                      {lead.foto_url ? (
                        <img src={lead.foto_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <User className="w-5 h-5 text-primary/40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate">
                        {nome.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Via WhatsApp</p>
                    </div>
                  </div>

                  {/* Telefone */}
                  <div className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 opacity-50" />
                    {phone}
                  </div>

                  {/* Motivo do Arquivamento */}
                  <div className="min-w-0">
                    {lead.arquivado ? (
                      <span className="text-xs font-bold text-rose-500/90 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-xl uppercase tracking-wider text-[10px]">
                        {lead.status || "Arquivado"}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </div>

                  {/* Temperatura */}
                  <div>
                    <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest", tempCfg.color)}>
                       <span className={cn("w-1.5 h-1.5 rounded-full", tempCfg.dot)} />
                       {temp}
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleDeleteLead(lead.remote_jid)}
                      className="p-2 rounded-xl bg-secondary/50 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all border border-transparent hover:border-rose-500/20"
                      title="Excluir Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <button 
                      onClick={() => handleOpenChat(lead.remote_jid)}
                      className="w-10 h-10 rounded-xl bg-primary text-white hover:bg-primary/80 flex items-center justify-center transition-all shadow-lg shadow-primary/20 active:scale-95"
                      title="Ver Conversa"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && totalCount > 0 && (
        <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between bg-card/10 text-xs text-muted-foreground font-bold mt-2 rounded-b-2xl">
          <div>
            Exibindo {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} leads
          </div>
          
          <div className="flex items-center gap-4">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span>Mostrar</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-secondary/50 border border-border rounded-lg px-2 py-1 outline-none font-bold text-foreground text-xs"
              >
                {[25, 50, 100, 250].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-foreground disabled:opacity-40 disabled:hover:bg-secondary/30 transition-all font-black uppercase text-[10px] tracking-wider font-bold"
              >
                Anterior
              </button>
              
              <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-black">
                {currentPage} / {Math.ceil(totalCount / pageSize)}
              </span>

              <button
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalCount / pageSize)))}
                className="px-3 py-1.5 rounded-lg border border-border bg-secondary/30 hover:bg-secondary text-foreground disabled:opacity-40 disabled:hover:bg-secondary/30 transition-all font-black uppercase text-[10px] tracking-wider font-bold"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
