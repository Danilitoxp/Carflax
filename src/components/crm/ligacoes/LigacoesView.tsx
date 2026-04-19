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
              isActive ? "bg-slate-900 h-[var(--h)]" : "bg-slate-100 h-[20%]",
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
      <div className="py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
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
                "p-3 rounded-xl border flex flex-col gap-1",
                item.v ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
              )}>
                <span className="text-[8px] uppercase font-black tracking-widest text-slate-400 leading-none">{item.l}</span>
                <span className={cn("text-[11px] font-black", item.v ? "text-emerald-600" : "text-rose-600")}>
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
                  <div key={i} className="flex items-center gap-3 p-2 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all group">
                    <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-1 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">{t.tempo}</span>
                    <div className="flex flex-col">
                      <p className="text-[11px] font-bold text-slate-700 leading-tight">{t.descricao_curta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {acao.feedback_curto && (
            <div className="p-4 bg-slate-900 rounded-2xl text-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3 bg-blue-500 rounded-full" />
                <h4 className="text-[9px] font-black uppercase tracking-widest opacity-60">Plano de Ação</h4>
              </div>
              <p className="text-xs font-bold leading-relaxed opacity-90">"{acao.feedback_curto}"</p>
              {acao.treinamento_sugerido && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                  <div className="px-2 py-0.5 bg-blue-500 rounded text-[8px] font-black uppercase">Treinamento</div>
                  <span className="text-[10px] font-bold opacity-70">{acao.treinamento_sugerido}</span>
                </div>
              )}
            </div>
          )}
        </div>
      );
    } catch {
      return (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
           <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">"{call.summary}"</p>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 lg:p-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <audio 
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Stats - Tiny Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</span>
              <span className="text-xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
            </div>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              stat.color === "emerald" ? "bg-emerald-50 text-emerald-500" :
              stat.color === "blue" ? "bg-blue-50 text-blue-500" :
              stat.color === "rose" ? "bg-rose-50 text-rose-500" :
              "bg-slate-50 text-slate-500"
            )}>
              <stat.icon className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {/* Toolbar - Tiny Style */}
        <div className="p-3 border-b border-slate-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-[280px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-4 py-1.5 bg-slate-50/50 border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all h-8"
              />
            </div>
            <button className="flex items-center gap-2 px-3 h-8 bg-white border border-slate-100 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50">
              <Filter className="w-3 h-3" />
              Filtros
            </button>
          </div>
        </div>

        {/* Table - High Density */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-6 h-6 text-slate-900 animate-spin mb-3" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sincronizando...</span>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30">
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Cliente</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Responsável</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Data</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Duração</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Status</th>
                  <th className="px-6 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">{call.clientName}</span>
                        <span className="text-[10px] font-bold text-slate-400 tracking-tight">{call.phoneNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-2.5 h-2.5 text-slate-400" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600">{call.responsible}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-700">{String(call.timestamp).split(',')[0]}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{String(call.timestamp).split(',')[1]}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-1.5 grayscale opacity-60">
                        <Clock className="w-3 h-3" />
                        <span className="text-[11px] font-black">{call.duration}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                          call.status === "Concluída" || call.status === "Positivo" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                          call.status === "Perdida" || call.status === "Abandonada" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-slate-50 text-slate-600 border border-slate-100"
                        )}>
                          {call.status}
                        </span>
                        {call.score !== undefined && (
                          <span className={cn(
                            "text-[10px] font-black",
                            (call.score || 0) >= 80 ? "text-emerald-500" : (call.score || 0) >= 60 ? "text-amber-500" : "text-rose-500"
                          )}>{call.score}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => setSelectedCall(call)}
                          className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-400 rounded-lg hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-90"
                        >
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL TINY STYLE */}
      {selectedCall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 lg:p-12">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-300" onClick={() => setSelectedCall(null)} />
          
          <div 
            className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh] relative z-10 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tiny Modal Header */}
            <div className="p-4 border-b border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shadow-md">
                  <Volume2 className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-none">{selectedCall.clientName}</h3>
                  <div className="flex items-center gap-2 mt-1 grayscale opacity-60">
                    <Calendar className="w-2.5 h-2.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{selectedCall.timestamp}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedCall(null); setIsPlaying(false); }}
                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tiny Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide">
              {/* Compact Player */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 relative overflow-hidden">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-slate-900 tracking-tighter tabular-nums">{formatTime(currentTime)}</span>
                       <span className="text-[9px] font-bold text-slate-300">/</span>
                       <span className="text-[10px] font-black text-slate-400 tracking-tighter tabular-nums">{formatTime(duration) || selectedCall.duration}</span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 1.5, 2].map(speed => (
                        <button
                          key={speed}
                          onClick={() => {
                            setPlaybackSpeed(speed);
                            if (audioRef.current) audioRef.current.playbackRate = speed;
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black transition-all",
                            playbackSpeed === speed ? "bg-slate-900 text-white shadow-sm" : "bg-white border border-slate-100 text-slate-400 hover:bg-slate-50"
                          )}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all outline-none"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
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
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                   <div className="h-0.5 w-4 bg-slate-200" />
                   <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Resultado Gemini AI</h4>
                   <div className="h-0.5 flex-1 bg-slate-200" />
                </div>
                {renderAnalysis(selectedCall)}
              </div>
            </div>

            {/* Tiny Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IA Sincronizada</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedCall(null)}
                  className="px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all font-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
