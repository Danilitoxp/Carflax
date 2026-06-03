import { useState, useEffect } from "react";
import { Building2, Loader2, AlertCircle, Star } from "lucide-react";
import { apiAmancoRanking, type AmancoCliente } from "@/lib/api";

const MEDAL_COLORS = [
  { bg: "from-amber-400 to-yellow-500",  text: "text-amber-950", shadow: "shadow-amber-400/40",  border: "border-amber-400/50" },
  { bg: "from-slate-300 to-slate-400",   text: "text-slate-800",  shadow: "shadow-slate-300/40",  border: "border-slate-300/50" },
  { bg: "from-orange-400 to-amber-600",  text: "text-orange-950", shadow: "shadow-orange-400/40", border: "border-orange-400/50" },
];

function RankBadge({ pos }: { pos: number }) {
  const m = MEDAL_COLORS[pos];
  if (m) {
    return (
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg bg-gradient-to-br ${m.bg} ${m.shadow} border ${m.border}`}>
        <span className={`text-[15px] font-black ${m.text}`}>{pos + 1}</span>
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-slate-800/60 border border-slate-700/50">
      <span className="text-[14px] font-black text-slate-400">{pos + 1}</span>
    </div>
  );
}

export function RankingCopaView() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [clientes, setClientes] = useState<AmancoCliente[]>([]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(false);
    try {
      const erpData = await apiAmancoRanking();
      // Filter out CONSUMIDOR
      const filteredClientes = (erpData.rankingClientes ?? []).filter(
        c => c.CLIENTE?.toUpperCase() !== "CONSUMIDOR"
      );
      setClientes(filteredClientes);
    } catch (e) {
      console.error(e);
      if (!silent) setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#070B16] text-slate-100 flex flex-col font-sans overflow-y-auto relative select-none pt-16 pb-12">
      {/* ── Background Glows ── */}
      <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-green-950/20 via-blue-950/10 to-transparent pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />



      {/* ── Main Layout ── */}
      <main className="max-w-7xl mx-auto w-full px-8 flex-1 grid grid-cols-12 gap-8 items-stretch z-10">
        
        {/* Loading / Error States */}
        {loading && (
          <div className="col-span-12 flex flex-col items-center justify-center gap-4 py-32">
            <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando ranking...</p>
          </div>
        )}

        {!loading && error && (
          <div className="col-span-12 flex flex-col items-center justify-center gap-4 py-32 text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <div>
              <p className="text-sm font-bold text-slate-300 uppercase tracking-wider">Falha na sincronização com o ERP</p>
              <button 
                onClick={() => fetchData()} 
                className="mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase rounded-lg transition-all"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Left Column: Ranking List (7 Cols) */}
            <section className="col-span-12 lg:col-span-7 space-y-4">
              <div className="bg-[#0B1124] border border-slate-800/80 rounded-[32px] p-6 shadow-2xl flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      Parceiros de Destaque
                    </h3>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                      Período: <span className="text-yellow-400">01/06/2026</span> até <span className="text-yellow-400">30/06/2026</span>
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                    {clientes.length} Clientes Ativos
                  </span>
                </div>

                <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin">
                  {clientes.length === 0 ? (
                    <div className="text-center py-20 text-xs text-slate-500 font-bold uppercase tracking-wider">
                      Sem registros faturados este mês
                    </div>
                  ) : (
                    clientes.map((c, i) => (
                      <div
                        key={c.COD_CLIENTE}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.01] ${
                          i === 0
                            ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/35"
                            : i === 1
                            ? "bg-slate-900/80 border-slate-700/40"
                            : i === 2
                            ? "bg-slate-900/80 border-orange-500/25"
                            : "bg-slate-950/40 border-slate-800/50 hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <RankBadge pos={i} />
                          <div className="w-10 h-10 rounded-xl bg-slate-800/40 border border-slate-700/30 flex items-center justify-center shrink-0">
                            <Building2 className={`w-5 h-5 ${i === 0 ? "text-yellow-400" : "text-slate-400"}`} />
                          </div>
                          <div className="min-w-0">
                            <h4 className={`text-sm font-black uppercase tracking-tight truncate ${
                              i === 0 ? "text-yellow-400" : "text-white"
                            }`}>
                              {c.CLIENTE}
                            </h4>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                              Código ERP: {c.COD_CLIENTE}
                            </p>
                          </div>
                        </div>

                        {/* Top placement medal tags */}
                        {i < 3 && (
                          <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            i === 0 
                              ? "bg-yellow-500/10 border border-yellow-500/30 text-yellow-400" 
                              : i === 1 
                              ? "bg-slate-300/10 border border-slate-300/30 text-slate-300"
                              : "bg-orange-500/10 border border-orange-500/30 text-orange-400"
                          }`}>
                            {i === 0 ? "1° Lugar" : i === 1 ? "2° Lugar" : "3° Lugar"}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Right Column: Brazil Shirt Display (5 Cols) */}
            <section className="col-span-12 lg:col-span-5">
              <div className="bg-[#0B1124] border border-slate-800/80 rounded-[32px] p-6 shadow-2xl flex flex-col h-full justify-between items-center text-center relative overflow-hidden">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  🏆 Grande Prêmio da Campanha
                </h3>

                {/* High-res Shirt Video */}
                <div className="relative w-full max-w-[420px] flex items-center justify-center">
                  <video
                    src="/camisa.MOV"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-h-[52vh] w-full object-contain mix-blend-screen"
                    style={{ filter: "brightness(1.25) contrast(1.15) saturate(1.1)" }}
                  />
                </div>

                {/* Bottom group container */}
                <div className="flex flex-col items-center gap-4 w-full">
                  {/* Highlighted Prize Label */}
                  <div className="text-center z-10 flex items-center justify-center gap-2">
                    <img
                      src="https://static.vecteezy.com/system/resources/thumbnails/034/211/381/small/blue-checkmark-validation-social-media-png.png"
                      alt="Verificado"
                      className="w-5 h-5 object-contain"
                    />
                    <h4 className="text-base font-black text-white uppercase tracking-tight">
                      Manto Oficial do Brasil
                    </h4>
                  </div>

                  <div className="z-10 w-full">
                    <div className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-400 via-green-500 to-yellow-500 text-slate-950 font-black text-[14px] uppercase tracking-widest shadow-2xl shadow-yellow-500/20 border border-yellow-300/40 animate-pulse w-full">
                      <span>🏆 Compre Amanco e Concorra! 🇧🇷</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
