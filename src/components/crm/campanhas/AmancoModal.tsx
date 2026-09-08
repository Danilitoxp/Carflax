import { useEffect, useState } from "react";
import { X, Trophy, Award, Loader2, AlertCircle, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiAmancoRanking, type AmancoVendedor } from "@/lib/api";
import { supabase } from "@/lib/supabase";

interface AmancoModalProps {
  onClose: () => void;
}

// Campanha ativa: 01 a 25/09/2026 (ver amancoHandler.js no backend)
const PERIODO_CAMPANHA = "01 a 25 de setembro de 2026";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [vendedores, setVendedores] = useState<AmancoVendedor[]>([]);
  const [avatarMap, setAvatarMap] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const erpData = await apiAmancoRanking();
        setVendedores(erpData.rankingVendedores ?? []);

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

  const maxVend = vendedores[0]?.PREMIO_TOTAL ?? 1;

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
                Caixa D'Água Amanco Wavin
                <span className="px-2 py-0.5 rounded-lg bg-blue-600/15 border border-blue-500/30 text-blue-500 text-[9px] font-black uppercase tracking-widest">AMANCO</span>
              </h2>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mt-0.5">{PERIODO_CAMPANHA}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-11 h-11 rounded-2xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-rose-500 transition-all active:scale-90">
            <X className="w-5 h-5" />
          </button>
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

          {!loading && !error && (
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
                    <p className="text-[11px] font-black text-slate-400">{fmt(vendedores[1].PREMIO_TOTAL)}</p>
                  </div>
                  {/* 1° */}
                  <div className="flex flex-col items-center gap-2 bg-gradient-to-b from-amber-500/10 to-transparent border-2 border-amber-400/30 rounded-3xl p-4 relative overflow-hidden shadow-lg shadow-amber-500/10">
                    <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 rounded-t-3xl" />
                    <div className="w-16 h-16 rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center overflow-hidden shadow-xl shadow-amber-400/30">
                      <img src={getAvatarSrc(avatarMap[vendedores[0].COD_VENDEDOR], vendedores[0].NOME_VENDEDOR)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-400/40"><Trophy className="w-4 h-4 text-amber-900" /></div>
                    <p className="text-[10px] font-black text-foreground uppercase text-center line-clamp-2 leading-tight">{vendedores[0].NOME_VENDEDOR}</p>
                    <p className="text-[13px] font-black text-amber-500">{fmt(vendedores[0].PREMIO_TOTAL)}</p>
                    <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-[8px] font-black text-amber-500 uppercase tracking-widest">1° Lugar</span>
                  </div>
                  {/* 3° */}
                  <div className="pt-6 flex flex-col items-center gap-2 bg-card/60 border border-orange-400/20 rounded-3xl p-4">
                    <div className="w-14 h-14 rounded-full bg-orange-400/10 border-2 border-orange-400/40 flex items-center justify-center overflow-hidden shadow-lg">
                      <img src={getAvatarSrc(avatarMap[vendedores[2].COD_VENDEDOR], vendedores[2].NOME_VENDEDOR)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shadow-md"><Medal className="w-4 h-4 text-orange-900" /></div>
                    <p className="text-[10px] font-black text-foreground uppercase text-center line-clamp-2 leading-tight">{vendedores[2].NOME_VENDEDOR}</p>
                    <p className="text-[11px] font-black text-orange-400">{fmt(vendedores[2].PREMIO_TOTAL)}</p>
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <div className="grid grid-cols-12 px-3 mb-1 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">
                  <div className="col-span-1">Pos</div>
                  <div className="col-span-6 pl-3">Vendedor</div>
                  <div className="col-span-2 text-right">Unidades</div>
                  <div className="col-span-3 text-right">Prêmio</div>
                </div>
                {vendedores.length === 0 ? (
                  <div className="text-center py-10 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Nenhuma venda de caixa d'água/tanque Amanco no período</div>
                ) : vendedores.map((v, i) => (
                  <div key={v.COD_VENDEDOR} className={cn("grid grid-cols-12 items-center px-4 py-3 rounded-2xl border transition-all group hover:scale-[1.01]",
                    i === 0 ? "bg-amber-500/8 border-amber-400/30" : i === 1 ? "bg-card/60 border-slate-300/20" : i === 2 ? "bg-card/60 border-orange-400/20" : "bg-card/40 border-border/30 hover:bg-secondary/30"
                  )}>
                    <div className="col-span-1"><RankBadge pos={i} /></div>
                    <div className="col-span-6 pl-3 flex items-center gap-2.5">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0 border", i === 0 ? "border-amber-400/50" : "border-border/40")}>
                        <img src={getAvatarSrc(avatarMap[v.COD_VENDEDOR], v.NOME_VENDEDOR)} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-[11px] font-black uppercase truncate group-hover:text-blue-500 transition-colors", i === 0 ? "text-amber-500" : "text-foreground")}>{v.NOME_VENDEDOR}</p>
                        <ProgressBar value={v.PREMIO_TOTAL} max={maxVend} />
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-[12px] font-black tabular-nums text-muted-foreground">{v.QTD_TOTAL}</span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className={cn("text-[12px] font-black tabular-nums", i === 0 ? "text-amber-500" : "text-emerald-500")}>{fmt(v.PREMIO_TOTAL)}</span>
                    </div>
                  </div>
                ))}
              </div>
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
