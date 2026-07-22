import { useEffect, useMemo, useState } from "react";
import { Search, CheckCircle2, PackageX, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

export interface ColetorFalta {
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

export function FurosView() {
  const [faltas, setFaltas] = useState<ColetorFalta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [somentePendentes, setSomentePendentes] = useState(true);

  const carregarFaltas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coletor_faltas")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) {
        console.error("[FurosView] erro ao carregar faltas:", error.message);
      } else {
        setFaltas((data as ColetorFalta[]) || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFaltas();
    const channel = supabase
      .channel("estoque_coletor_faltas_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "coletor_faltas" }, () => carregarFaltas())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleResolveFalta = async (id: string) => {
    setFaltas((prev) => prev.map((f) => (f.id === id ? { ...f, resolvido: true } : f)));
    const { error } = await supabase.from("coletor_faltas").update({ resolvido: true }).eq("id", id);
    if (error) {
      console.error("[FurosView] erro ao resolver furo:", error.message);
      carregarFaltas();
    }
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return faltas
      .filter((f) => (somentePendentes ? !f.resolvido : true))
      .filter((f) => {
        if (!q) return true;
        return (
          (f.codigo_produto || "").toLowerCase().includes(q) ||
          (f.descricao_produto || "").toLowerCase().includes(q) ||
          (f.pedido || "").toLowerCase().includes(q) ||
          (f.separador_nome || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.resolvido !== b.resolvido) return a.resolvido ? 1 : -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [faltas, busca, somentePendentes]);

  const pendentes = useMemo(() => faltas.filter((f) => !f.resolvido).length, [faltas]);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      <div className="w-full flex flex-col min-h-0 flex-1 px-6 md:px-8 pt-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                <PackageX className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black text-foreground uppercase tracking-tight">
                    Furos de Estoque
                  </h1>
                  {pendentes > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider animate-pulse">
                      {pendentes} {pendentes === 1 ? "Pendente" : "Pendentes"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Divergências de itens faltantes registradas pelos separadores no Coletor
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={carregarFaltas}
              disabled={loading}
              className="h-10 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold transition-all flex items-center gap-2 border border-border"
              title="Atualizar lista"
            >
              <RefreshCw className={cn("w-4 h-4 text-muted-foreground", loading && "animate-spin")} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 my-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por código de produto, descrição, pedido ou separador..."
              className="w-full h-10 pl-9 pr-4 bg-secondary/40 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
            />
          </div>
          <button
            onClick={() => setSomentePendentes((v) => !v)}
            className={cn(
              "h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-colors",
              somentePendentes
                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                : "bg-secondary/40 text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {somentePendentes ? "Apenas Pendentes" : "Exibir Todos"}
          </button>
          <span className="px-3 py-2 bg-secondary/40 border border-border rounded-xl text-[10px] font-bold text-muted-foreground">
            Total: <strong className="text-foreground font-black">{filtrados.length}</strong> {filtrados.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        {/* Content Table */}
        <div className="flex-1 min-h-0 overflow-y-auto pb-6 scrollbar-hide">
          <div className="rounded-2xl border border-border overflow-hidden bg-card/30">
            <table className="w-full text-left">
              <thead className="bg-secondary/60 border-b border-border sticky top-0 backdrop-blur-md z-10">
                <tr>
                  <th className="p-3 pl-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Data / Hora</th>
                  <th className="p-3 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pedido</th>
                  <th className="p-3 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Produto</th>
                  <th className="p-3 text-center text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pedida</th>
                  <th className="p-3 text-center text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Separada</th>
                  <th className="p-3 text-center text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Falta</th>
                  <th className="p-3 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Separador</th>
                  <th className="p-3 pr-4 text-right text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Ação / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading && faltas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-black uppercase tracking-widest text-primary">
                          Carregando furos de estoque...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-16 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <PackageX className="w-8 h-8 text-muted-foreground" />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground italic">
                          Nenhum furo {somentePendentes ? "pendente" : "registrado"} encontrado
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtrados.map((f) => {
                    const falta = Math.max(0, (f.quantidade_pedida ?? 0) - (f.quantidade_separada ?? 0));
                    return (
                      <tr key={f.id} className={cn("hover:bg-secondary/20 transition-colors", f.resolvido && "opacity-60")}>
                        <td className="p-3 pl-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-foreground">
                              {new Date(f.timestamp).toLocaleDateString("pt-BR")}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(f.timestamp).toLocaleTimeString("pt-BR")}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[11px] font-black text-foreground">#{f.pedido}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-blue-500">{f.codigo_produto}</span>
                            <span className="text-[9px] font-bold text-muted-foreground truncate max-w-[260px] uppercase">
                              {f.descricao_produto}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-sm font-black text-foreground">{f.quantidade_pedida ?? "—"}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-sm font-black text-muted-foreground">{f.quantidade_separada ?? "—"}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-sm font-black text-rose-500">{falta}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-black text-foreground uppercase">{f.separador_nome}</span>
                        </td>
                        <td className="p-3 pr-4 text-right">
                          {f.resolvido ? (
                            <div className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Resolvido
                            </div>
                          ) : (
                            <button
                              onClick={() => handleResolveFalta(f.id)}
                              className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight border border-rose-500/20"
                              title="Marcar como resolvido"
                            >
                              <AlertCircle className="w-3 h-3" />
                              Marcar Resolvido
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
