import { useState } from "react";
import { Target, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

  return (
    <div className="py-4 space-y-8 h-full overflow-y-auto scrollbar-hide pr-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
        {/* Nova Campanha Card */}
        <div 
          onClick={() => setIsNewCampaignModalOpen(true)}
          className="aspect-[4/5] bg-white/[0.01] border-2 border-dashed border-border/60 rounded-[1.5rem] flex flex-col items-center justify-center group cursor-pointer hover:border-primary/50 transition-all hover:bg-primary/[0.02]"
        >
          <div className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Nova Campanha</span>
        </div>

        {campaigns.map((camp) => (
          <div 
            key={camp.id} 
            onClick={() => camp.type === 'brand' && setSelectedCampaign(camp)}
            className={cn(
              "aspect-[4/5] rounded-[1.5rem] p-5 flex flex-col transition-all duration-500 cursor-pointer group relative overflow-hidden",
              camp.type === 'highlight' 
                ? "bg-gradient-to-br from-primary via-primary/90 to-blue-700 shadow-xl shadow-primary/10 border border-white/10" 
                : "bg-card border border-border/60 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5"
            )}
          >
            {camp.type === 'highlight' ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-white blur-xl opacity-20 animate-pulse" />
                  <Target className="w-6 h-6 text-white relative z-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white tracking-tight uppercase leading-tight">{camp.name}</h3>
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest leading-tight">{camp.description}</p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20">
                   <span className="text-[8px] font-black text-white tracking-[0.2em]">★ {camp.badge}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 bg-secondary/50 dark:bg-black/40 rounded-2xl p-4 flex items-center justify-center border border-border/10 mb-3 transition-colors">
                  <img 
                    src={camp.logo} 
                    className="max-h-10 w-auto object-contain brightness-100 group-hover:scale-110 transition-transform duration-700 dark:contrast-125" 
                    alt={camp.name} 
                  />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-[10px] font-black text-foreground/90 truncate uppercase tracking-tight">{camp.name}</h3>
                  <p className="text-[8px] font-bold text-muted-foreground tracking-widest leading-none">{camp.date}</p>
                  <div className="pt-0.5">
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[7px] font-black uppercase tracking-widest">
                       {camp.status}
                    </span>
                  </div>
                </div>
              </>
            )}
            
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </div>
        ))}
      </div>

      {/* RANKING MODAL */}
      <AnimatePresence>
        {selectedCampaign && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-md" 
              onClick={() => setSelectedCampaign(null)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-6xl bg-card border border-border/50 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-10 py-8 flex items-center justify-between border-b border-border/50 bg-secondary/5">
                <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Ranking — {selectedCampaign.name}</h2>
                <button 
                  onClick={() => setSelectedCampaign(null)}
                  className="px-6 py-2 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Fechar
                </button>
              </div>

              {/* Ranking List */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide space-y-3">
                <div className="grid grid-cols-12 px-6 mb-4 text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                  <div className="col-span-1">#</div>
                  <div className="col-span-8">Vendedor</div>
                  <div className="col-span-3 text-right">Faturamento</div>
                </div>

                {ranking.map((v) => (
                  <div key={v.pos} className="grid grid-cols-12 items-center bg-secondary/10 hover:bg-secondary/20 p-5 rounded-2xl border border-border/30 transition-all group">
                    <div className="col-span-1">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-lg",
                        v.pos <= 3 ? v.color + " text-black" : "bg-card/50 text-muted-foreground"
                      )}>
                        {v.pos}
                      </div>
                    </div>
                    <div className="col-span-8 pl-4">
                      <span className="text-[11px] font-black text-foreground/70 group-hover:text-foreground transition-colors uppercase tracking-tight">
                        {v.name}
                      </span>
                    </div>
                    <div className="col-span-3 text-right">
                      <span className="text-sm font-black text-emerald-500 tracking-tighter">
                        {v.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NEW CAMPAIGN MODAL */}
      <AnimatePresence>
        {isNewCampaignModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-md" 
              onClick={() => setIsNewCampaignModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="relative w-full max-w-[500px] bg-card border border-border/50 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-10 pt-10 pb-4 flex items-center justify-between">
                <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Nova Campanha</h2>
                <button 
                  onClick={() => setIsNewCampaignModalOpen(false)}
                  className="p-3 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-2xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-10 pb-10 pt-4 space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Nome da Campanha</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Ofertas de Verão"
                      className="w-full bg-secondary/30 border border-border/40 rounded-2xl px-5 py-4 text-sm text-foreground outline-none focus:border-primary/50 focus:bg-background transition-all placeholder:text-muted-foreground/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Imagem Principal</label>
                    <div className="relative group/file">
                      <input 
                        type="file" 
                        className="w-full h-14 opacity-0 absolute inset-0 z-10 cursor-pointer"
                      />
                      <div className="w-full h-14 bg-secondary/30 border border-border/40 border-dashed rounded-2xl flex items-center px-5 gap-3 group-hover/file:border-primary/50 transition-all">
                        <Plus className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-muted-foreground">Clique para selecionar imagem</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Início</label>
                      <input 
                        type="date" 
                        className="w-full bg-secondary/30 border border-border/40 rounded-2xl px-5 py-3.5 text-sm text-foreground outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Término</label>
                      <input 
                        type="date" 
                        className="w-full bg-secondary/30 border border-border/40 rounded-2xl px-5 py-3.5 text-sm text-foreground outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Fornecedor Responsável</label>
                    <select className="w-full bg-secondary/30 border border-border/40 rounded-2xl px-5 py-4 text-sm text-foreground/70 outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer">
                      <option value="">Selecione o fornecedor</option>
                      <option value="amanco">Amanco</option>
                      <option value="italy">Italy Válvulas</option>
                      <option value="sansil">Sansil Led</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setIsNewCampaignModalOpen(false)}
                    className="flex-1 py-4.5 bg-primary text-white rounded-[1.5rem] font-bold text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    Salvar Campanha
                  </button>
                  <button 
                    onClick={() => setIsNewCampaignModalOpen(false)}
                    className="py-4.5 px-8 bg-secondary text-foreground rounded-[1.5rem] font-bold text-sm uppercase tracking-widest hover:bg-secondary/80 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
