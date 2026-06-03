import { useState, useEffect, useRef } from "react";
import { X, Trophy, Users, Award, TrendingUp, Loader2, AlertCircle, Medal, Building2, Shuffle, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiAmancoRanking, type AmancoVendedor, type AmancoCliente } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type TabId = "vendedores" | "clientes" | "funcionarios";

interface AmancoModalProps {
  onClose: () => void;
}

interface SupabaseUser {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string | null;
  status: string;
  company: string;
}

const now = new Date();
const MES_NOME = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

const MEDAL_COLORS = [
  { bg: "from-amber-400 to-yellow-500",  text: "text-amber-950", shadow: "shadow-amber-400/40",  border: "border-amber-400/50" },
  { bg: "from-slate-300 to-slate-400",   text: "text-slate-800",  shadow: "shadow-slate-300/40",  border: "border-slate-300/50" },
  { bg: "from-orange-400 to-amber-600",  text: "text-orange-950", shadow: "shadow-orange-400/40", border: "border-orange-400/50" },
];

const fmt = (v: number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const getAvatarSrc = (avatar: string | null | undefined, name: string) =>
  avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

function RankBadge({ pos }: { pos: number }) {
  const m = MEDAL_COLORS[pos];
  if (m) {
    return (
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg bg-gradient-to-br",
        m.bg, m.shadow, "border", m.border
      )}>
        <span className={cn("text-[13px] font-black", m.text)}>{pos + 1}</span>
      </div>
    );
  }
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-secondary/60 border border-border/40">
      <span className="text-[12px] font-black text-muted-foreground">{pos + 1}</span>
    </div>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full bg-secondary/60 rounded-full overflow-hidden mt-1.5">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function AmancoModal({ onClose }: AmancoModalProps) {
  const [tab, setTab] = useState<TabId>("vendedores");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [vendedores, setVendedores] = useState<AmancoVendedor[]>([]);
  const [clientes, setClientes] = useState<AmancoCliente[]>([]);
  const [funcionarios, setFuncionarios] = useState<SupabaseUser[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  // Sorteio de funcionários
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());
  const [sorteando, setSorteando] = useState(false);
  const [ganhador, setGanhador] = useState<SupabaseUser | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const sorteioRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const [erpData, supabaseResult] = await Promise.all([
          apiAmancoRanking(),
          supabase
            .from("usuarios")
            .select("id, name, role, department, avatar, status, company")
            .eq("status", "ativo")
            .not("role", "in", '("Diretor","Consultor")')
            .order("name"),
        ]);

        setVendedores(erpData.rankingVendedores ?? []);
        setClientes((erpData.rankingClientes ?? []).filter(c => c.CLIENTE?.toUpperCase() !== "CONSUMIDOR"));
        setFuncionarios((supabaseResult.data as SupabaseUser[]) ?? []);

        if (erpData.rankingVendedores?.length) {
          const codes = erpData.rankingVendedores.map((v) => v.COD_VENDEDOR);
          const { data: users } = await supabase
            .from("usuarios")
            .select("avatar, operator_code")
            .in("operator_code", codes);
          if (users) {
            const map: Record<string, string> = {};
            users.forEach((u) => { if (u.avatar) map[u.operator_code] = u.avatar; });
            setAvatarMap(map);
          }
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Limpeza do intervalo ao desmontar
  useEffect(() => () => { if (sorteioRef.current) clearInterval(sorteioRef.current); }, []);

  const participantes = funcionarios.filter((f) => !excluidos.has(f.id));

  const toggleExcluido = (id: string) => {
    if (sorteando) return;
    setGanhador(null);
    setExcluidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const iniciarSorteio = () => {
    if (participantes.length === 0 || sorteando) return;
    setGanhador(null);
    setSorteando(true);

    let ticks = 0;
    const totalTicks = 30; // ~1.5s de animação rápida
    sorteioRef.current = setInterval(() => {
      const random = participantes[Math.floor(Math.random() * participantes.length)];
      setFlashId(random.id);
      ticks++;
      if (ticks >= totalTicks) {
        clearInterval(sorteioRef.current!);
        // Escolha final
        const winner = participantes[Math.floor(Math.random() * participantes.length)];
        setFlashId(null);
        setGanhador(winner);
        setSorteando(false);
      }
    }, 60);
  };

  const maxVend = vendedores[0]?.TOTAL_FATURADO ?? 1;
  const maxCli  = clientes[0]?.TOTAL_FATURADO ?? 1;

  const TABS: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "vendedores",   label: "Ranking Vendedores", icon: Trophy,     count: vendedores.length },
    { id: "clientes",     label: "Ranking Clientes",   icon: TrendingUp, count: clientes.length },
    { id: "funcionarios", label: "Funcionários",       icon: Users,      count: funcionarios.length },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-card border border-border/50 rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 animate-in zoom-in-95 duration-300">

        {/* ── Header ── */}
        <div className="px-8 py-6 flex items-center justify-between border-b border-border/40 bg-secondary/20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[20px] bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-blue-600/30 rotate-3">
              <Award className="w-7 h-7 text-white -rotate-3" />
            </div>
            <div>
              <h2 className="text-[16px] font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                Seleção de Prêmios
                <span className="px-2 py-0.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-500 text-[9px] font-black uppercase tracking-widest">AMANCO</span>
              </h2>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mt-0.5 capitalize">{MES_NOME}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-rose-500 transition-all active:scale-90">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div className="px-6 pt-4 pb-0 flex gap-2 shrink-0 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-secondary/40 text-muted-foreground hover:bg-secondary/70 border border-border/40"
              )}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.count !== undefined && !loading && (
                  <span className={cn("ml-1 px-1.5 py-0.5 rounded-md text-[8px] font-black", active ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground/70")}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-6">

          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 h-64">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Carregando dados...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center gap-3 h-64">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ERP não disponível no momento</p>
            </div>
          )}

          {/* ── Tab: Vendedores ── */}
          {!loading && !error && tab === "vendedores" && (
            <div className="space-y-2">
              {vendedores.length >= 3 && (
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {/* 2° */}
                  <div className="pt-6 flex flex-col items-center gap-2 bg-card/60 border border-slate-300/20 rounded-3xl p-4">
                    <div className="w-14 h-14 rounded-full bg-slate-300/20 border-2 border-slate-300/50 flex items-center justify-center overflow-hidden shadow-lg">
                      <img src={getAvatarSrc(avatarMap[vendedores[1].COD_VENDEDOR], vendedores[1].NOME_VENDEDOR)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center shadow-md"><Medal className="w-4 h-4 text-slate-700" /></div>
                    <p className="text-[10px] font-black text-foreground uppercase text-center line-clamp-2 leading-tight">{vendedores[1].NOME_VENDEDOR}</p>
                    <p className="text-[11px] font-black text-slate-400">{fmt(vendedores[1].TOTAL_FATURADO)}</p>
                  </div>
                  {/* 1° */}
                  <div className="flex flex-col items-center gap-2 bg-gradient-to-b from-amber-500/10 to-transparent border-2 border-amber-400/30 rounded-3xl p-4 relative overflow-hidden shadow-lg shadow-amber-500/10">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 rounded-t-3xl" />
                    <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center overflow-hidden shadow-xl shadow-amber-400/30">
                      <img src={getAvatarSrc(avatarMap[vendedores[0].COD_VENDEDOR], vendedores[0].NOME_VENDEDOR)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-400/40"><Trophy className="w-4 h-4 text-amber-900" /></div>
                    <p className="text-[10px] font-black text-foreground uppercase text-center line-clamp-2 leading-tight">{vendedores[0].NOME_VENDEDOR}</p>
                    <p className="text-[13px] font-black text-amber-500">{fmt(vendedores[0].TOTAL_FATURADO)}</p>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[8px] font-black text-amber-500 uppercase tracking-widest">1° Lugar</span>
                  </div>
                  {/* 3° */}
                  <div className="pt-6 flex flex-col items-center gap-2 bg-card/60 border border-orange-400/20 rounded-3xl p-4">
                    <div className="w-14 h-14 rounded-full bg-orange-400/10 border-2 border-orange-400/40 flex items-center justify-center overflow-hidden shadow-lg">
                      <img src={getAvatarSrc(avatarMap[vendedores[2].COD_VENDEDOR], vendedores[2].NOME_VENDEDOR)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-md"><Medal className="w-4 h-4 text-orange-900" /></div>
                    <p className="text-[10px] font-black text-foreground uppercase text-center line-clamp-2 leading-tight">{vendedores[2].NOME_VENDEDOR}</p>
                    <p className="text-[11px] font-black text-orange-400">{fmt(vendedores[2].TOTAL_FATURADO)}</p>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 px-3 mb-1 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">
                  <div className="col-span-1">Pos</div>
                  <div className="col-span-7 pl-3">Vendedor</div>
                  <div className="col-span-4 text-right">Faturado (Amanco)</div>
                </div>
                {vendedores.length === 0 ? (
                  <div className="text-center py-10 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Nenhum dado para o mês atual</div>
                ) : vendedores.map((v, i) => (
                  <div key={v.COD_VENDEDOR} className={cn("grid grid-cols-12 items-center px-4 py-3 rounded-2xl border transition-all group hover:scale-[1.01]",
                    i === 0 ? "bg-amber-500/8 border-amber-400/30" : i === 1 ? "bg-card/60 border-slate-300/20" : i === 2 ? "bg-card/60 border-orange-400/20" : "bg-card/40 border-border/30 hover:bg-secondary/30"
                  )}>
                    <div className="col-span-1"><RankBadge pos={i} /></div>
                    <div className="col-span-7 pl-3 flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0 border", i === 0 ? "border-amber-400/50" : "border-border/40")}>
                        <img src={getAvatarSrc(avatarMap[v.COD_VENDEDOR], v.NOME_VENDEDOR)} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-[11px] font-black uppercase truncate group-hover:text-blue-500 transition-colors", i === 0 ? "text-amber-500" : "text-foreground")}>{v.NOME_VENDEDOR}</p>
                        <ProgressBar value={v.TOTAL_FATURADO} max={maxVend} />
                      </div>
                    </div>
                    <div className="col-span-4 text-right">
                      <span className={cn("text-[12px] font-black tabular-nums", i === 0 ? "text-amber-500" : "text-emerald-500")}>{fmt(v.TOTAL_FATURADO)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Clientes ── */}
          {!loading && !error && tab === "clientes" && (
            <div className="space-y-1.5">
              {/* World Cup Mode banner */}
              <div className="p-4 mb-4 bg-gradient-to-r from-emerald-500/10 via-yellow-500/5 to-blue-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-yellow-400 to-blue-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                    <span className="text-xl">🇧🇷</span>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-foreground uppercase tracking-tight flex items-center gap-1.5">
                      Painel Copa do Mundo 2026
                      <span className="px-1 py-0.5 rounded text-[8px] bg-yellow-500/20 text-yellow-500 font-bold border border-yellow-500/30">NOVO</span>
                    </h4>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">Visualização em tela cheia com a Camisa do Brasil</p>
                  </div>
                </div>
                <button
                  onClick={() => window.open(window.location.origin + window.location.pathname + "?view=ranking-copa", "_blank")}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-yellow-400 hover:from-emerald-600 hover:to-yellow-500 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-950" />
                  Abrir Painel
                </button>
              </div>

              <div className="grid grid-cols-12 px-3 mb-1 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">
                <div className="col-span-1">Pos</div>
                <div className="col-span-7 pl-3">Cliente</div>
                <div className="col-span-4 text-right">Faturado (Amanco)</div>
              </div>
              {clientes.length === 0 ? (
                <div className="text-center py-10 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Nenhum dado para o mês atual</div>
              ) : clientes.map((c, i) => (
                <div key={c.COD_CLIENTE} className={cn("grid grid-cols-12 items-center px-4 py-3 rounded-2xl border transition-all group hover:scale-[1.01]",
                  i === 0 ? "bg-amber-500/8 border-amber-400/30" : i === 1 ? "bg-card/60 border-slate-300/20" : i === 2 ? "bg-card/60 border-orange-400/20" : "bg-card/40 border-border/30 hover:bg-secondary/30"
                )}>
                  <div className="col-span-1"><RankBadge pos={i} /></div>
                  <div className="col-span-7 pl-3 flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border", i === 0 ? "bg-amber-500/10 border-amber-400/40" : "bg-secondary/50 border-border/40")}>
                      <Building2 className={cn("w-4 h-4", i === 0 ? "text-amber-500" : "text-muted-foreground")} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn("text-[11px] font-black uppercase truncate group-hover:text-blue-500 transition-colors", i === 0 ? "text-amber-500" : "text-foreground")}>{c.CLIENTE}</p>
                      <ProgressBar value={c.TOTAL_FATURADO} max={maxCli} />
                    </div>
                  </div>
                  <div className="col-span-4 text-right">
                    <span className={cn("text-[12px] font-black tabular-nums", i === 0 ? "text-amber-500" : "text-emerald-500")}>{fmt(c.TOTAL_FATURADO)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab: Funcionários ── */}
          {!loading && tab === "funcionarios" && (
            <div className="space-y-4">

              {/* ── Ganhador ── */}
              {ganhador && (
                <div className="relative overflow-hidden rounded-[28px] border-2 border-amber-400/60 bg-gradient-to-r from-amber-500/15 via-yellow-500/8 to-amber-500/15 p-5 flex items-center gap-5 shadow-2xl shadow-amber-500/20 animate-in zoom-in-95 duration-500">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.08),transparent_70%)]" />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                  <div className="w-20 h-20 rounded-full border-4 border-amber-400 overflow-hidden shadow-2xl shadow-amber-400/40 shrink-0 relative z-10">
                    <img src={getAvatarSrc(ganhador.avatar, ganhador.name)} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-[9px] font-black text-amber-400 uppercase tracking-[0.25em]">Sorteado!</span>
                    </div>
                    <h3 className="text-xl font-black text-foreground uppercase tracking-tight leading-tight truncate">{ganhador.name}</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{ganhador.role}</p>
                    {ganhador.department && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-[8px] font-black text-amber-400 uppercase tracking-widest">{ganhador.department}</span>
                    )}
                  </div>
                  <button
                    onClick={() => { setGanhador(null); }}
                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-secondary/60 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-rose-400 transition-all z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ── Barra de controles ── */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <span className="text-blue-500">{participantes.length}</span> participantes
                    {excluidos.size > 0 && (
                      <span className="ml-2 text-rose-400">· {excluidos.size} excluído{excluidos.size > 1 ? "s" : ""}</span>
                    )}
                  </span>
                  {excluidos.size > 0 && (
                    <button
                      onClick={() => { setExcluidos(new Set()); setGanhador(null); }}
                      className="text-[9px] font-black text-muted-foreground/50 hover:text-blue-500 uppercase tracking-widest transition-colors"
                    >
                      Resetar
                    </button>
                  )}
                </div>
                <button
                  onClick={iniciarSorteio}
                  disabled={sorteando || participantes.length === 0}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95",
                    sorteando
                      ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 cursor-wait"
                      : participantes.length === 0
                      ? "bg-secondary/40 text-muted-foreground/40 border border-border/20 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-amber-500/30"
                  )}
                >
                  <Shuffle className={cn("w-3.5 h-3.5", sorteando && "animate-spin")} />
                  {sorteando ? "Sorteando..." : "Sortear"}
                </button>
              </div>

              {/* ── Instrução ── */}
              <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest -mt-1">
                Clique em um colaborador para excluí-lo do sorteio
              </p>

              {/* ── Grid de Funcionários ── */}
              {funcionarios.length === 0 ? (
                <div className="text-center py-10 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
                  Nenhum funcionário encontrado
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {funcionarios.map((f) => {
                    const excluido = excluidos.has(f.id);
                    const isFlash = flashId === f.id;
                    const isWinner = ganhador?.id === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => toggleExcluido(f.id)}
                        disabled={sorteando}
                        className={cn(
                          "relative bg-card/50 border rounded-2xl p-3 flex items-center gap-3 transition-all text-left group",
                          excluido
                            ? "border-rose-500/30 bg-rose-500/5 opacity-50 hover:opacity-70"
                            : isFlash
                            ? "border-amber-400 bg-amber-400/15 scale-[1.03] shadow-lg shadow-amber-400/20"
                            : isWinner
                            ? "border-amber-400/60 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                            : "border-border/40 hover:bg-secondary/40 hover:border-blue-500/20 hover:scale-[1.02]",
                          sorteando && !excluido ? "cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        {/* Ícone de status */}
                        <div className="absolute top-2 right-2 z-10">
                          {excluido ? (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          ) : isWinner ? (
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/40 group-hover:text-emerald-500/70 transition-colors" />
                          )}
                        </div>

                        <div className={cn(
                          "w-11 h-11 rounded-xl overflow-hidden shrink-0 border transition-all",
                          excluido ? "border-rose-500/20 grayscale" : isFlash || isWinner ? "border-amber-400/60" : "border-border/40"
                        )}>
                          <img
                            src={getAvatarSrc(f.avatar, f.name)}
                            alt={f.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(f.name)}`; }}
                          />
                        </div>

                        <div className="min-w-0 flex-1 pr-3">
                          <p className={cn(
                            "text-[10px] font-black uppercase truncate leading-tight transition-colors",
                            excluido ? "text-muted-foreground/40 line-through" : isFlash || isWinner ? "text-amber-400" : "text-foreground group-hover:text-blue-500"
                          )}>
                            {f.name}
                          </p>
                          {f.role && (
                            <p className={cn("text-[8px] font-bold uppercase truncate tracking-wide mt-0.5", excluido ? "text-muted-foreground/30" : "text-muted-foreground/70")}>
                              {f.role}
                            </p>
                          )}
                          {f.department && (
                            <span className={cn(
                              "inline-block mt-1 px-1.5 py-0.5 rounded-md border text-[7px] font-black uppercase tracking-wider truncate max-w-full transition-all",
                              excluido
                                ? "bg-secondary/20 border-border/20 text-muted-foreground/20"
                                : isFlash || isWinner
                                ? "bg-amber-400/15 border-amber-400/30 text-amber-400/80"
                                : "bg-blue-600/10 border-blue-500/20 text-blue-500/70"
                            )}>
                              {f.department}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border/40 bg-card shrink-0">
          <button onClick={onClose} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
