import { useState, useEffect } from "react";
import { 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Navigation, 
  Camera,
  User as UserIcon,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiEntregasRomaneios, type EntregaResumo } from "@/lib/api";

export function MotoristaView() {
  const [loading, setLoading] = useState(true);
  const [entregas, setEntregas] = useState<EntregaResumo[]>([]);
  
  const stats = {
    total: entregas.length,
    concluidas: 0, // Implementar integração com Supabase/Firebase depois
    pendentes: entregas.length
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiEntregasRomaneios();
      if (res.success) {
        setEntregas(res.data);
      }
    } catch (error) {
      console.error("Erro ao buscar entregas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-4 pb-10 bg-[#F8FAFC]">
      {/* HEADER TIPO APP MOBILE */}
      <div className="bg-white border-b border-slate-100 p-4 pt-6 pb-6 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white border-2 border-white shadow-lg">
              <UserIcon className="w-6 h-6" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-3 h-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Minhas Entregas</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-2.5 rounded-xl hover:bg-slate-50 text-slate-400 transition-all">
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </button>
      </div>

      {/* STATS PÍLULAS */}
      <div className="grid grid-cols-3 gap-3 px-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total</span>
            <span className="text-xl font-black text-slate-900 leading-none">{stats.total}</span>
        </div>
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest mb-1">Feito</span>
            <span className="text-xl font-black text-emerald-600 leading-none">{stats.concluidas}</span>
        </div>
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col items-center">
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-1">Aguard.</span>
            <span className="text-xl font-black text-amber-600 leading-none">{stats.pendentes}</span>
        </div>
      </div>

      {/* LISTA DE ENTREGAS (CARD GIGANTE PARA MOBILE) */}
      <div className="flex-1 px-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-blue-500" />
                Rota Ordenada
            </h3>
            <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                <Navigation className="w-3 h-3" />
                Abrir Mapa Completo
            </button>
        </div>

        {entregas.length > 0 ? (
          entregas.map((e, idx) => (
            <div key={e.NF} className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              {/* INDICADOR DE ORDEM */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-20 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[12px] font-black">
                        {idx + 1}
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black tracking-widest uppercase">
                        NF #{e.NF}
                    </div>
                </div>
                <button className="text-slate-300 p-1">
                    <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                   <h4 className="text-[15px] font-black text-slate-900 uppercase tracking-tight leading-tight">{e.CLIENTE}</h4>
                   <div className="flex items-start gap-2 mt-2 opacity-60">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[12px] font-bold text-slate-500 leading-snug uppercase tracking-tighter">
                        {e.ENDERECO}, {e.BAIRRO} - {e.CIDADE}
                      </span>
                   </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                    <button className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                        <Navigation className="w-4 h-4" />
                        Navegar
                    </button>
                    <button className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                        <Camera className="w-4 h-4" />
                        Finalizar
                    </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                <Truck className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                {loading ? "Sincronizando rota..." : "Nenhuma entrega\npara sua rota hoje!"}
            </p>
          </div>
        )}
      </div>

      {/* BOTÃO FLUTUANTE DE GPS */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce">
         <Navigation className="w-6 h-6" />
      </button>
    </div>
  );
}
