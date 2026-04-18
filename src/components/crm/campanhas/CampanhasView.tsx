import { useState } from "react";
import { Target, Plus, X, Trophy, WashingMachine, Smartphone, Tv, Speaker, Fan, Refrigerator } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Campaign {
  id: string | number;
  type: "highlight" | "brand";
  name: string;
  description?: string;
  badge?: string;
  color?: string;
  icon?: React.ElementType;
  date?: string;
  status?: string;
  logo?: string;
}

export function CampanhasView() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  
  const campaigns: Campaign[] = [
    { 
      id: "premium", 
      type: "highlight",
      name: "Prêmio do Mês", 
      description: "Bata a meta • Concorra ao sorteio",
      badge: "NOVIDADE",
      color: "from-[#1A1A2E] to-[#16213E]",
      icon: Target
    },
    { 
      id: 1, 
      type: "brand",
      name: "Amanco", 
      date: "01/11/2025 - 30/11/2025",
      status: "Encerrado", 
      logo: "https://logodownload.org/wp-content/uploads/2019/07/amanco-logo.png",
    },
    { 
      id: 2, 
      type: "brand",
      name: "Italy valvulas - Dezembro", 
      date: "01/12/2025 - 31/12/2025",
      status: "Encerrado", 
      logo: "https://italyvalvulas.com.br/wp-content/uploads/2022/08/logo-italy-valvulas.png",
    },
    { 
      id: 3, 
      type: "brand",
      name: "Italy valvulas - Fevereiro", 
      date: "01/02/2026 - 28/02/2026",
      status: "Encerrado", 
      logo: "https://italyvalvulas.com.br/wp-content/uploads/2022/08/logo-italy-valvulas.png",
    },
    { 
      id: 4, 
      type: "brand",
      name: "Italy valvulas - Janeiro", 
      date: "01/01/2026 - 31/01/2026",
      status: "Encerrado", 
      logo: "https://italyvalvulas.com.br/wp-content/uploads/2022/08/logo-italy-valvulas.png",
    },
    { 
      id: 5, 
      type: "brand",
      name: "Italy valvulas - Novembro", 
      date: "01/11/2025 - 30/11/2025",
      status: "Encerrado", 
      logo: "https://italyvalvulas.com.br/wp-content/uploads/2022/08/logo-italy-valvulas.png",
    },
    { 
      id: 6, 
      type: "brand",
      name: "Italy Válvulas e Metais | GERAL", 
      date: "01/11/2025 - 28/02/2026",
      status: "Encerrado", 
      logo: "https://italyvalvulas.com.br/wp-content/uploads/2022/08/logo-italy-valvulas.png",
    },
    { 
      id: 7, 
      type: "brand",
      name: "Sansil Led", 
      date: "01/11/2025 - 15/12/2025",
      status: "Encerrado", 
      logo: "https://sansilled.com.br/wp-content/uploads/2021/04/logo-sansil-led.png",
    }
  ];

  const ranking = [
    { pos: 1, name: "GUSTAVO ALVES CORDEIRO NETO", value: "R$ 42.807,72", color: "bg-yellow-400" },
    { pos: 2, name: "TATIANE MARIA NICEA DA SILVA S", value: "R$ 38.504,53", color: "bg-slate-300" },
    { pos: 3, name: "MATEUS RONALD DE SOUSA", value: "R$ 29.651,30", color: "bg-orange-400" },
    { pos: 4, name: "MURILO HENRIQUE DOS SANTOS", value: "R$ 23.264,53", color: "bg-secondary" },
    { pos: 5, name: "CAROLINE VENCESLAU", value: "R$ 17.203,73", color: "bg-secondary" },
    { pos: 6, name: "VALERIA VIEIRA DOS SANTOS", value: "R$ 17.069,33", color: "bg-secondary" },
    { pos: 7, name: "GUILHERME SANTANA", value: "R$ 16.658,57", color: "bg-secondary" },
    { pos: 8, name: "JULIANA OLIVEIRA DA SILVA", value: "R$ 14.162,46", color: "bg-secondary" },
  ];

  // Import Trophy from lucide-react (add to imports if not there)
  // ...

  return (
    <div className="h-full flex flex-col pt-3 px-6 pb-2 overflow-hidden bg-[#F8FAFC]">
      {/* CSS for Border Trace and Float Animation */}
      <style>{`
        @keyframes border-trace {
          0%, 100% { clip-path: inset(0 0 98% 0); }
          25% { clip-path: inset(0 0 0 98%); }
          50% { clip-path: inset(98% 0 0 0); }
          75% { clip-path: inset(0 98% 0 0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes float-diag {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(4px, -6px); }
        }
        @keyframes float-vert {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-border-trace {
          animation: border-trace 4s linear infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-diag {
          animation: float-diag 5s ease-in-out infinite;
        }
        .animate-float-vert {
          animation: float-vert 6s ease-in-out infinite;
        }
      `}</style>

      {/* Header Area */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Campanhas</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Programas de Incentivo e Vendas</p>
        </div>
        <button 
          onClick={() => setIsNewCampaignModalOpen(true)}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-all shadow-sm flex items-center gap-2 uppercase tracking-wider active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Campanha
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-6">
          {campaigns.map((camp) => (
            <div 
              key={camp.id} 
              onClick={() => camp.type === 'brand' && setSelectedCampaign(camp)}
              className={cn(
                "aspect-[4/5] rounded-xl p-4 flex flex-col border border-slate-200 transition-all duration-300 cursor-pointer group relative overflow-hidden bg-white shadow-sm hover:shadow-md hover:border-blue-300",
                camp.type === 'highlight' && "border-blue-200/50 shadow-xl shadow-blue-600/5"
              )}
            >
              {camp.type === 'highlight' ? (
                <>
                  {/* Border Trace Effect */}
                  <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute inset-0 border-2 border-blue-600 rounded-xl animate-border-trace opacity-60" />
                  </div>

                  {/* Floating Product Decorations */}
                  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-10">
                    <Tv className="absolute top-4 left-4 w-5 h-5 text-blue-600 animate-float-diag opacity-80" style={{ animationDelay: '0s' }} />
                    <WashingMachine className="absolute top-10 right-4 w-6 h-6 text-blue-600 animate-float-vert opacity-60" style={{ animationDelay: '1.5s' }} />
                    <Smartphone className="absolute bottom-16 left-6 w-4 h-4 text-blue-600 animate-float opacity-90" style={{ animationDelay: '3s' }} />
                    <Refrigerator className="absolute bottom-6 right-8 w-6 h-6 text-blue-600 animate-float-diag opacity-50" style={{ animationDelay: '0.8s' }} />
                    <Speaker className="absolute top-1/2 left-2 w-4 h-4 text-blue-600 animate-float opacity-70" style={{ animationDelay: '2.2s' }} />
                    <Fan className="absolute bottom-12 right-2 w-5 h-5 text-blue-600 animate-float-vert opacity-80" style={{ animationDelay: '1.2s' }} />
                  </div>
                  
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 relative z-10">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-10 animate-pulse" />
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 flex items-center justify-center relative shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-500">
                        <Trophy className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <h3 className="text-[16px] font-black text-blue-600 tracking-tight uppercase leading-tight">Prêmio do Mês</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">Bata a meta • Concorra ao sorteio</p>
                    </div>

                    <div className="px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                      <span className="text-[9px] font-black text-blue-600 tracking-[0.2em] uppercase flex items-center gap-1.5">
                        <span className="text-[11px] leading-none mb-0.5">★</span> NOVIDADE
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 bg-slate-50 rounded-lg p-4 flex items-center justify-center border border-slate-100 mb-3 transition-colors group-hover:bg-blue-50/50">
                    <img 
                      src={camp.logo} 
                      className="max-h-12 w-auto object-contain brightness-100 group-hover:scale-110 transition-transform duration-500" 
                      alt={camp.name} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{camp.name}</h3>
                    <p className="text-[8px] font-bold text-slate-400 tracking-widest leading-none">{camp.date}</p>
                    <div className="pt-0.5">
                      <span className="inline-flex px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 text-[7px] font-black uppercase tracking-widest">
                         {camp.status}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RANKING MODAL (Tiny Redesign) */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setSelectedCampaign(null)} />
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Ranking Performance</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{selectedCampaign.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCampaign(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ranking List */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              <div className="grid grid-cols-12 px-4 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <div className="col-span-1">Pos</div>
                <div className="col-span-8">Vendedor</div>
                <div className="col-span-3 text-right">Faturamento</div>
              </div>

              <div className="space-y-1">
                {ranking.map((v) => (
                  <div key={v.pos} className="grid grid-cols-12 items-center bg-white hover:bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100 transition-all group">
                    <div className="col-span-1">
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-all",
                        v.pos === 1 ? "bg-amber-400 text-amber-900 shadow-sm shadow-amber-400/20" :
                        v.pos === 2 ? "bg-slate-200 text-slate-600" :
                        v.pos === 3 ? "bg-orange-100 text-orange-600" :
                        "bg-slate-50 text-slate-400"
                      )}>
                        {v.pos}
                      </div>
                    </div>
                    <div className="col-span-8 pl-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">
                        {v.name}
                      </span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-[11px] font-black text-emerald-600 tracking-tighter">
                        {v.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              <button 
                onClick={() => setSelectedCampaign(null)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10"
              >
                Fechar Ranking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW CAMPAIGN MODAL (Tiny Redesign) */}
      {isNewCampaignModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsNewCampaignModalOpen(false)} />
          <div className="relative w-full max-w-[480px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
               <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Nova Campanha</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Cadastro de Incentivo</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewCampaignModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-5 scrollbar-hide">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nome da Campanha</label>
                <input type="text" placeholder="Ex: Ofertas de Verão" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Imagem / Logo</label>
                <div className="relative group/file">
                  <input type="file" className="w-full h-12 opacity-0 absolute inset-0 z-10 cursor-pointer" />
                  <div className="w-full h-12 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center px-4 gap-3 group-hover/file:border-blue-600/50 transition-all">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Selecionar imagem</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Início</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Término</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Fornecedor Responsável</label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none appearance-none cursor-pointer">
                  <option value="">Selecione o fornecedor...</option>
                  <option value="amanco">Amanco</option>
                  <option value="italy">Italy Válvulas</option>
                  <option value="sansil">Sansil Led</option>
                </select>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-white shrink-0">
               <button 
                onClick={() => setIsNewCampaignModalOpen(false)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10"
              >
                Salvar Campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
