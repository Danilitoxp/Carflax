import { useEffect, useState } from "react";
import { 
  Search, 
  User, 
  Phone, 
  Clock,
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
  const [filterPlatform, setFilterPlatform] = useState("Todas as Plataformas");
  const [filterTemperature, setFilterTemperature] = useState("Todas as Temperaturas");

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      const data = await marketingService.getClientes();
      if (isMounted) {
        const onlyLeads = data.filter(c => c.status === "Novo Lead" || c.status === "Em Contato" || !c.status);
        setLeads(onlyLeads);
        setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  const refreshLeads = async () => {
    setLoading(true);
    const data = await marketingService.getClientes();
    const onlyLeads = data.filter(c => c.status === "Novo Lead" || c.status === "Em Contato" || !c.status);
    setLeads(onlyLeads);
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
    window.dispatchEvent(new CustomEvent("carflax-change-tab", { detail: "Whatsapp" }));
  };

  const filtered = leads.filter(c => {
    const nome = (c.nome || c.push_name || c.remote_jid).toLowerCase();
    const matchSearch = nome.includes(search.toLowerCase());
    const matchTemp = filterTemperature === "Todas as Temperaturas" || c.temperatura === filterTemperature;
    // Como a plataforma ainda não está no banco, tratamos todos como WhatsApp por enquanto
    const matchPlatform = filterPlatform === "Todas as Plataformas" || filterPlatform === "WhatsApp";
    
    return matchSearch && matchTemp && matchPlatform;
  });

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
              <span>Última Interação</span>
              <span>Temperatura</span>
              <span className="text-right">Ações</span>
            </div>

            {filtered.map(lead => {
              const nome = lead.nome || lead.push_name || lead.remote_jid.split('@')[0];
              const phone = lead.remote_jid.split('@')[0];
              const temp = lead.temperatura || "Frio";
              const tempCfg = TEMP_CONFIG[temp as keyof typeof TEMP_CONFIG] || TEMP_CONFIG.Frio;
              const updatedAt = lead.ultima_conversa_em
                ? new Date(lead.ultima_conversa_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : "";
              
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

                  {/* Última Interação */}
                  <div className="min-w-0">
                    {lead.ultima_mensagem ? (
                      <div className="flex flex-col">
                        <p className="text-xs font-medium text-foreground/80 truncate italic">
                          "{lead.ultima_mensagem}"
                        </p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {updatedAt}
                        </p>
                      </div>
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
    </div>
  );
}
