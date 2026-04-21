import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Clock, 
  Search, 
  Filter, 
  User,
  Loader2,
  Play,
  Pause,
  X,
  Volume2,
  Calendar
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getCallHistory } from "@/lib/goto-service";

interface CallLog {
  id: string;
  clientName: string;
  type: "incoming" | "outgoing" | "missed";
  duration: string;
  timestamp: string;
  status: string;
  responsible: string;
  phoneNumber: string;
  summary?: string;
  audio_url?: string;
  score?: number;
  recording_id?: string;
}

const WAVE_BARS = 40;
const WAVE_PATTERN = Array.from({ length: WAVE_BARS }).map((_, i) => {
  const envelope = Math.sin(Math.PI * (i / (WAVE_BARS - 1)));
  const ps = (Math.sin(i * 12.98) * 43758) % 1;
  return { h: Math.max(15, (Math.abs(ps) * 60 + 40) * envelope) };
});

function AudioWaveform({ isPlaying, progressRatio, onSeek, duration }: any) {
  return (
    <div 
      className="flex gap-[2px] items-center h-8 justify-center flex-1 cursor-pointer group"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        onSeek(ratio * duration);
      }}
    >
      {WAVE_PATTERN.map((bar, i) => {
        const isActive = (i / WAVE_BARS) <= progressRatio;
        return (
          <div
            key={i}
            className={cn(
              "flex-1 max-w-[3px] min-w-[2px] rounded-full transition-all duration-300",
              isActive ? "bg-blue-500 h-[var(--h)] shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-card h-[20%]",
              isPlaying && isActive && "opacity-80"
            )}
            style={{ "--h": `${bar.h}%` } as any}
          />
        );
      })}
    </div>
  );
}

export function LigacoesView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const history = await getCallHistory();
      setCalls(history as any);
      setLoading(false);
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedCall && audioRef.current) {
      const url = selectedCall.audio_url || `https://marketing-aloia.velbav.easypanel.host/api/recordings/${selectedCall.recording_id}`;
      audioRef.current.src = url;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, [selectedCall]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (t: number) => {
    if (!t || isNaN(t)) return "0:00";
    return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
  };

  const stats = [
    { label: "Total", value: calls.length.toString(), icon: Phone, color: "slate" },
    { label: "Entradas", value: calls.filter(c => c.type === "incoming").length.toString(), icon: PhoneIncoming, color: "emerald" },
    { label: "Saídas", value: calls.filter(c => c.type === "outgoing").length.toString(), icon: PhoneOutgoing, color: "blue" },
    { label: "Perdidas", value: calls.filter(c => c.status === "Perdida").length.toString(), icon: PhoneMissed, color: "rose" },
  ];

  const filteredCalls = calls.filter(c => 
    c.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderAnalysis = (call: CallLog) => {
    if (!call.summary) return (
      <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl">
        <Loader2 className="w-5 h-5 text-slate-300 animate-spin mb-2" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Aguardando IA...</span>
      </div>
    );
    
    try {
      const data = JSON.parse(call.summary);
      const ind = data.indicadores_visuais_rapidos || {};
      const tml = data.timeline_de_incidentes || [];
      const acao = data.plano_de_acao_gerente || {};

      return (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "Saudação", v: ind.saudacao_adequada },
              { l: "Nome", v: ind.perguntou_nome_cliente },
              { l: "Upsell", v: ind.ofereceu_produto_complementar },
            ].map((item, i) => (
              <div key={i} className={cn(
                "p-3 rounded-2xl border flex flex-col gap-1.5 transition-all hover:scale-105",
                item.v ? "bg-emerald-500/10 border-emerald-500/20 shadow-lg shadow-emerald-500/5" : "bg-rose-500/10 border-rose-500/20 shadow-lg shadow-rose-500/5"
              )}>
                <span className="text-[8px] uppercase font-black tracking-widest text-muted-foreground leading-none opacity-60">{item.l}</span>
                <span className={cn("text-[11px] font-black tracking-tight", item.v ? "text-emerald-500" : "text-rose-500")}>
                  {item.v ? "CONFIRMADO" : "FALTOU"}
                </span>
              </div>
            ))}
          </div>

          {tml.length > 0 && (
            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linha do Tempo</h4>
              <div className="flex flex-col gap-2">
                {tml.map((t: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-secondary/30 border border-border/40 rounded-2xl hover:border-blue-500/30 transition-all group">
                    <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">{t.tempo}</span>
                    <div className="flex flex-col">
                      <p className="text-[11px] font-black text-foreground/80 leading-tight tracking-tight uppercase">{t.descricao_curta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {acao.feedback_curto && (
            <div className="p-5 bg-[#0a0f16] border border-border/60 rounded-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Plano de Ação Inteligente</h4>
              </div>
              <p className="text-[12px] font-bold leading-relaxed text-foreground opacity-90 italic">"{acao.feedback_curto}"</p>
              {acao.treinamento_sugerido && (
                <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-3">
                  <div className="px-3 py-1 bg-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/20">Treinamento</div>
                  <span className="text-[11px] font-black text-muted-foreground opacity-80">{acao.treinamento_sugerido}</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    } catch {
      return (
        <div className="p-4 bg-secondary/30 rounded-2xl border border-border">
           <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">"{call.summary}"</p>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 bg-background min-h-full animate-in fade-in slide-in-from-bottom-2 duration-700">
      <audio 
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-5 flex items-center justify-between animate-pulse">
              <div className="flex flex-col gap-2">
                <div className="h-2 w-12 bg-secondary rounded" />
                <div className="h-6 w-10 bg-secondary rounded" />
              </div>
              <div className="w-10 h-10 bg-secondary rounded-xl" />
            </div>
          ))
        ) : (
          stats.map((stat, i) => (
            <div key={i} className="bg-card/60 backdrop-blur-xl border border-border/40 rounded-2xl p-5 flex items-center justify-between transition-all hover:bg-card/80 group shadow-lg shadow-black/20">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-70">{stat.label}</span>
                <span className="text-2xl font-black text-foreground tracking-tighter">{stat.value}</span>
              </div>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                stat.color === "emerald" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                stat.color === "blue" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                stat.color === "rose" ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                "bg-secondary text-slate-400 border border-border"
              )}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl flex flex-col overflow-hidden shadow-2xl shadow-black/20">
        {/* Toolbar - Tiny Style */}
        <div className="p-4 border-b border-border/40 flex items-center justify-between gap-4 bg-secondary/10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-[320px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
              <input 
                type="text" 
                placeholder="Buscar por cliente, responsável ou telefone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-[11px] font-bold text-foreground outline-none focus:ring-1 focus:ring-blue-500/30 transition-all h-10 placeholder:text-muted-foreground/30 uppercase tracking-tight"
              />
            </div>
            {!loading && (
              <button className="flex items-center gap-2 px-4 h-10 bg-secondary/50 border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
                <Filter className="w-3.5 h-3.5" />
                Filtrar Resultados
              </button>
            )}
          </div>
        </div>

        {/* Table - High Density */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-secondary/40 border-b border-border/40">
                <th className="px-6 py-5 text-[10px] font-black text-foreground/50 uppercase tracking-widest">Cliente</th>
                <th className="px-6 py-5 text-[10px] font-black text-foreground/50 uppercase tracking-widest">Responsável</th>
                <th className="px-6 py-5 text-[10px] font-black text-foreground/50 uppercase tracking-widest">Data do Contato</th>
                <th className="px-6 py-5 text-[10px] font-black text-foreground/50 uppercase tracking-widest text-center">Duração</th>
                <th className="px-6 py-5 text-[10px] font-black text-foreground/50 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-foreground/50 uppercase tracking-widest text-center">IA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {loading ? (
                Array.from({ length: 20 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-3 w-32 bg-secondary rounded" />
                        <div className="h-2 w-20 bg-secondary/50 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-secondary" />
                        <div className="h-3 w-20 bg-secondary rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-3 w-16 bg-secondary rounded" />
                        <div className="h-2 w-12 bg-secondary/50 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-transparent">---</td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 bg-secondary rounded" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="w-8 h-8 bg-secondary rounded-lg mx-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-[11px] font-black text-muted-foreground uppercase tracking-widest">Nenhuma ligação encontrada</td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-secondary/20 transition-all group">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-foreground group-hover:text-blue-500 transition-colors uppercase tracking-tight">{call.clientName}</span>
                        <span className="text-[10px] font-bold text-muted-foreground tracking-tight opacity-40">{call.phoneNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-secondary border border-border/60 flex items-center justify-center shadow-inner">
                          <User className="w-3.5 h-3.5 text-blue-500/80" />
                        </div>
                        <span className="text-[11px] font-black text-foreground/70 uppercase tracking-tight">{call.responsible}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-foreground/80 uppercase">{String(call.timestamp).split(',')[0]}</span>
                        <span className="text-[9px] font-bold text-blue-500/70 border-l border-blue-500/30 pl-2 mt-1">{String(call.timestamp).split(',')[1]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground underline decoration-blue-500/30 underline-offset-4">
                        <Clock className="w-3 h-3" />
                        <span className="text-[11px] font-black tabular-nums">{call.duration}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                          call.status === "Concluída" || call.status === "Positivo" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          call.status === "Perdida" || call.status === "Abandonada" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-secondary text-muted-foreground border-border"
                        )}>
                          {call.status}
                        </span>
                        {call.score !== undefined && (
                          <span className={cn(
                            "text-[11px] font-black tabular-nums p-1 rounded-md bg-secondary/50",
                            (call.score || 0) >= 80 ? "text-emerald-500" : (call.score || 0) >= 60 ? "text-amber-500" : "text-rose-500"
                          )}>{call.score}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedCall(call)}
                        className="w-8 h-8 mx-auto flex items-center justify-center bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-90 shadow-lg shadow-blue-500/10"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TINY STYLE */}
      {selectedCall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-12">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedCall(null)} />
          
          <div 
            className="bg-card w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] relative z-10 border border-border/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tiny Modal Header */}
            <div className="p-6 border-b border-border/40 flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 rotate-3">
                  <Volume2 className="w-5 h-5 text-white -rotate-3" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[14px] font-black text-foreground uppercase tracking-tight leading-none">{selectedCall.clientName}</h3>
                  <div className="flex items-center gap-2 mt-2 opacity-60">
                    <Calendar className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">{selectedCall.timestamp}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedCall(null); setIsPlaying(false); }}
                className="w-10 h-10 rounded-2xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-rose-500 transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tiny Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
              {/* Compact Player */}
              <div className="bg-secondary/40 backdrop-blur-sm border border-border/50 rounded-[32px] p-6 relative overflow-hidden">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <span className="text-[12px] font-black text-foreground tracking-tighter tabular-nums bg-card px-2 py-1 rounded-lg border border-border">{formatTime(currentTime)}</span>
                       <span className="text-muted-foreground/30 font-black">/</span>
                       <span className="text-[12px] font-black text-muted-foreground tracking-tighter tabular-nums">{formatTime(duration) || selectedCall.duration}</span>
                    </div>
                    <div className="flex gap-1.5 focus-within:ring-2 ring-blue-500/20 rounded-xl p-1 bg-card border border-border">
                      {[1, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => {
                            setPlaybackSpeed(speed);
                            if (audioRef.current) audioRef.current.playbackRate = speed;
                          }}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black transition-all",
                            playbackSpeed === speed ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <button 
                      onClick={togglePlay}
                      className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/30 hover:scale-105 hover:bg-blue-500 active:scale-95 transition-all outline-none group"
                    >
                      {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1 group-hover:scale-110 transition-transform" />}
                    </button>
                    <AudioWaveform 
                      isPlaying={isPlaying} 
                      progressRatio={duration ? currentTime / duration : 0} 
                      duration={duration}
                      onSeek={(time: number) => {
                        if (audioRef.current) audioRef.current.currentTime = time;
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Analysis Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                   <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">IA Analysis Dashboard</h4>
                   <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                {renderAnalysis(selectedCall)}
              </div>
            </div>

            {/* Tiny Modal Footer */}
            <div className="p-6 bg-secondary/20 border-t border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Neural Engine Active</span>
              </div>
              <button 
                onClick={() => setSelectedCall(null)}
                className="px-6 h-10 rounded-xl bg-secondary border border-border text-[11px] font-black uppercase tracking-widest text-foreground hover:bg-foreground hover:text-background transition-all active:scale-95"
              >
                Fechar Console
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
