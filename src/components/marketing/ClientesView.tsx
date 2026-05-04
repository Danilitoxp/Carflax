import { useEffect, useState } from "react";
import { Search, User, Flame, MessageSquare, Phone, TrendingUp, Users, Thermometer } from "lucide-react";
import { marketingService } from "@/lib/marketing-service";
import type { MarketingCliente } from "@/lib/marketing-service";
import { cn } from "@/lib/utils";

const TEMP_CONFIG = {
  Quente: { color: "text-rose-500 bg-rose-500/10 border-rose-500/20", dot: "bg-rose-500" },
  Morno:  { color: "text-amber-500 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-500" },
  Frio:   { color: "text-blue-500 bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500" },
};

const STATUS_COLOR: Record<string, string> = {
  "Novo Lead":   "bg-violet-500/10 text-violet-400 border-violet-500/20",
  "Em Contato":  "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Negociando":  "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Convertido":  "bg-primary/10 text-primary border-primary/20",
  "Arquivado":   "bg-secondary text-muted-foreground border-border",
};

type FilterTemp = "Todos" | "Quente" | "Morno" | "Frio";

export function ClientesView() {
  const [clientes, setClientes] = useState<MarketingCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTemp, setFilterTemp] = useState<FilterTemp>("Todos");

  useEffect(() => {
    marketingService.getClientes().then(data => {
      setClientes(data);
      setLoading(false);
    });
  }, []);

  const filtered = clientes.filter(c => {
    const nome = (c.nome || c.push_name || c.remote_jid).toLowerCase();
    const matchSearch = nome.includes(search.toLowerCase());
    const matchTemp = filterTemp === "Todos" || c.temperatura === filterTemp;
    return matchSearch && matchTemp;
  });

  const counts = {
    total: clientes.length,
    quente: clientes.filter(c => c.temperatura === "Quente").length,
    morno:  clientes.filter(c => c.temperatura === "Morno").length,
    frio:   clientes.filter(c => c.temperatura === "Frio").length,
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 border-b border-border/50 bg-card/30">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-black text-2xl tracking-tighter uppercase flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              Base de Leads
            </h2>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Contatos capturados via WhatsApp</p>
          </div>
          <span className="text-xs font-black text-muted-foreground bg-secondary px-3 py-1.5 rounded-xl">
            {clientes.length} contatos
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-500/10 rounded-xl flex items-center justify-center">
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <div>
              <p className="text-xl font-black text-rose-500">{counts.quente}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Quentes</p>
            </div>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Thermometer className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-black text-amber-500">{counts.morno}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Mornos</p>
            </div>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-black text-blue-500">{counts.frio}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Frios</p>
            </div>
          </div>
        </div>

        {/* Search + Filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar lead..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex gap-1.5">
            {(["Todos", "Quente", "Morno", "Frio"] as FilterTemp[]).map(f => (
              <button
                key={f}
                onClick={() => setFilterTemp(f)}
                className={cn(
                  "px-3 py-2 rounded-xl text-[10px] font-black uppercase border transition-all",
                  filterTemp === f
                    ? "bg-primary text-white border-primary"
                    : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/30"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <Users className="w-8 h-8 opacity-30" />
            <p className="text-sm font-medium">Nenhum lead encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {/* Cabeçalho da tabela */}
            <div className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr] gap-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <span>Contato</span>
              <span>Telefone</span>
              <span>Última mensagem</span>
              <span>Temperatura</span>
              <span>Status</span>
            </div>

            {filtered.map(c => {
              const nome = c.nome || c.push_name || c.remote_jid.split('@')[0];
              const phone = c.remote_jid.split('@')[0];
              const temp = (c.temperatura as keyof typeof TEMP_CONFIG) || "Frio";
              const tempCfg = TEMP_CONFIG[temp] ?? TEMP_CONFIG.Frio;
              const statusColor = STATUS_COLOR[c.status || "Novo Lead"] ?? STATUS_COLOR["Novo Lead"];
              const updatedAt = c.ultima_conversa_em
                ? new Date(c.ultima_conversa_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                : "—";

              return (
                <div
                  key={c.remote_jid}
                  className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr] gap-4 items-center px-4 py-3 bg-card border border-border/50 rounded-2xl hover:border-primary/20 hover:bg-card/80 transition-all group"
                >
                  {/* Contato */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                      {c.foto_url
                        ? <img src={c.foto_url} className="w-full h-full object-cover" />
                        : <User className="w-4 h-4 text-muted-foreground" />
                      }
                    </div>
                    <p className="font-bold text-sm truncate">
                      {nome.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                  </div>

                  {/* Telefone */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{phone}</span>
                  </div>

                  {/* Última mensagem */}
                  <div className="min-w-0">
                    {c.ultima_mensagem ? (
                      <div className="flex items-start gap-1.5">
                        <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[11px] text-foreground/80 font-medium truncate">{c.ultima_mensagem}</p>
                          <p className="text-[10px] text-muted-foreground">{updatedAt}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Temperatura */}
                  <div>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border", tempCfg.color)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", tempCfg.dot)} />
                      {temp}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-lg border", statusColor)}>
                      {c.status || "Novo Lead"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && (
        <div className="px-8 py-3 border-t border-border/50 text-[10px] font-bold text-muted-foreground">
          Exibindo {filtered.length} de {clientes.length} leads
        </div>
      )}
    </div>
  );
}
