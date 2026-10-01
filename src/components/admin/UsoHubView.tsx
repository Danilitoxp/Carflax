import { useEffect, useMemo, useState } from "react";
import { Activity, Users, Eye, ExternalLink, Radio, TrendingDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { NAV_SECTIONS } from "@/lib/menu-config";
import { INVENTARIO_FERRAMENTAS_URL, ouvirPresenca, type PresencaInfo } from "@/lib/acessos";

interface AcessoRow {
  id: number;
  user_id: string | null;
  user_nome: string | null;
  departamento: string | null;
  secao: string;
  origem: string;
  created_at: string;
}

type Periodo = "hoje" | "7d" | "30d";
const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
];

function inicioPeriodo(p: Periodo) {
  const d = new Date();
  if (p === "hoje") d.setHours(0, 0, 0, 0);
  else d.setDate(d.getDate() - (p === "7d" ? 7 : 30));
  return d;
}

// Nome amigável de cada chave de seção ("Carteira" → "Comercial › Minha Carteira").
const NOMES: Record<string, string> = (() => {
  const m: Record<string, string> = {
    "Minha Esteira": "Esteira",
    Organograma: "Organograma",
    "Painel do Gestor": "Painel do Gestor (/gestor)",
    "Vendedor no celular": "Vendedor no celular (/vendedor)",
  };
  NAV_SECTIONS.forEach((s) => {
    if (s.subItems?.length) {
      s.subItems.forEach((sub) => {
        if (!sub.novaAba) m[sub.value || sub.label] = `${s.label} › ${sub.label}`;
      });
    } else {
      m[s.label] = s.label;
    }
  });
  return m;
})();
const nomeSecao = (k: string) => NOMES[k] || (k.startsWith("esteira-subquadro:") ? "Esteira › Subquadro" : k);

const tempoRelativo = (iso: string) => {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export function UsoHubView() {
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const [acessos, setAcessos] = useState<AcessoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState<PresencaInfo[]>([]);
  const [, setTick] = useState(0);

  // Histórico do período
  useEffect(() => {
    let cancel = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("hub_acessos")
        .select("id, user_id, user_nome, departamento, secao, origem, created_at")
        .gte("created_at", inicioPeriodo(periodo).toISOString())
        .order("created_at", { ascending: false })
        .limit(20000);
      if (error) console.error("[UsoHub] Erro ao carregar acessos:", error);
      if (!cancel) {
        setAcessos(data || []);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [periodo]);

  // Novos acessos em tempo real
  useEffect(() => {
    const ch = supabase
      .channel("uso-hub-acessos")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hub_acessos" }, (payload) => {
        setAcessos((prev) => [payload.new as AcessoRow, ...prev]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Quem está online agora (presença)
  useEffect(() => ouvirPresenca(setOnline), []);

  // Atualiza os "há X min" a cada 30 s
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const porSecao = new Map<string, { total: number; pessoas: Set<string> }>();
    const porDepto = new Map<string, number>();
    const pessoas = new Set<string>();
    acessos.forEach((a) => {
      const cur = porSecao.get(a.secao) || { total: 0, pessoas: new Set<string>() };
      cur.total++;
      if (a.user_id) {
        cur.pessoas.add(a.user_id);
        pessoas.add(a.user_id);
      }
      porSecao.set(a.secao, cur);
      const d = a.departamento || "Sem setor";
      porDepto.set(d, (porDepto.get(d) || 0) + 1);
    });
    const ranking = Array.from(porSecao.entries())
      .map(([secao, v]) => ({ secao, total: v.total, pessoas: v.pessoas.size }))
      .sort((a, b) => b.total - a.total);
    const deptos = Array.from(porDepto.entries()).sort((a, b) => b[1] - a[1]);
    const acessadas = new Set(ranking.map((r) => r.secao));
    const semAcesso = Object.keys(NOMES).filter((k) => !acessadas.has(k) && !["Minha Esteira"].includes(k));
    return { ranking, deptos, pessoas: pessoas.size, semAcesso };
  }, [acessos]);

  const max = stats.ranking[0]?.total || 1;
  const maxDepto = stats.deptos[0]?.[1] || 1;

  const kpis = [
    { label: "Online agora", value: String(online.length), icon: Radio, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Acessos no período", value: stats.ranking.reduce((a, r) => a + r.total, 0).toLocaleString("pt-BR"), icon: Activity, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { label: "Pessoas diferentes", value: String(stats.pessoas), icon: Users, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
    { label: "Tela mais usada", value: stats.ranking[0] ? nomeSecao(stats.ranking[0].secao).split(" › ").pop()! : "—", icon: Eye, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  ];

  const card = "bg-card/40 backdrop-blur-md border border-border/60 rounded-2xl p-5 shadow-sm";
  const titulo = "text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2";

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-0 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight uppercase leading-none">Uso do HUB</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
            O que a equipe mais acessa, atualizado em tempo real
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-border/60 overflow-hidden">
            {PERIODOS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodo(p.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold transition-colors",
                  periodo === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <a
            href={INVENTARIO_FERRAMENTAS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/60 text-xs font-bold text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            Inventário de ferramentas <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className={card}>
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k.label}</p>
                    <p className="text-2xl font-black text-foreground mt-1 truncate">{k.value}</p>
                  </div>
                  <div className={cn("p-2 rounded-xl border shrink-0", k.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Ranking de telas */}
            <div className={cn(card, "xl:col-span-2")}>
              <p className={titulo}><Activity className="w-4 h-4" /> Telas mais acessadas</p>
              {stats.ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum acesso registrado neste período ainda.</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.ranking.map((r, i) => (
                    <div key={r.secao} className="grid grid-cols-[1.5rem_minmax(0,14rem)_1fr_auto] items-center gap-3 text-sm">
                      <span className="text-xs font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="font-semibold text-foreground truncate" title={nomeSecao(r.secao)}>{nomeSecao(r.secao)}</span>
                      <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(r.total / max) * 100}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        <b className="text-foreground">{r.total}</b> · {r.pessoas} {r.pessoas === 1 ? "pessoa" : "pessoas"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Online agora */}
            <div className={card}>
              <p className={titulo}>
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                Online agora
              </p>
              {online.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguém online no momento.</p>
              ) : (
                <ul className="space-y-2.5">
                  {[...online].sort((a, b) => a.nome.localeCompare(b.nome)).map((p) => (
                    <li key={p.user_id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{p.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{nomeSecao(p.secao)}</p>
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{tempoRelativo(p.desde)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Por setor */}
            <div className={card}>
              <p className={titulo}><Building2 className="w-4 h-4" /> Acessos por setor</p>
              {stats.deptos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados no período.</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.deptos.map(([d, n]) => (
                    <div key={d} className="text-sm">
                      <div className="flex justify-between gap-3 mb-1">
                        <span className="font-semibold text-foreground truncate">{d}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{n}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${(n / maxDepto) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feed ao vivo */}
            <div className={card}>
              <p className={titulo}><Radio className="w-4 h-4" /> Últimos acessos</p>
              <ul className="space-y-2 max-h-80 overflow-y-auto scrollbar-hide">
                {acessos.slice(0, 40).map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{a.user_nome || "Sem nome"}</p>
                      <p className="text-xs text-muted-foreground truncate">{nomeSecao(a.secao)}</p>
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{tempoRelativo(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Sem acesso */}
            <div className={card}>
              <p className={titulo}><TrendingDown className="w-4 h-4" /> Sem acesso no período</p>
              {stats.semAcesso.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todas as telas tiveram acesso.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {stats.semAcesso.map((k) => (
                    <span key={k} className="text-xs px-2 py-1 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      {nomeSecao(k)}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-3">
                Candidatas a revisar no inventário de ferramentas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
