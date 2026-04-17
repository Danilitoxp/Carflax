import { useState } from "react";
import { 
  Search, 
  MapPin, 
  CheckCircle2, 
  Calendar,
  Download,
  Clock,
  ArrowRight,
  FileText,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import type { Delivery } from "../romaneios/RomaneiosView";

export function ConcluidasView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("Hoje: 17 de Abr, 2026");

  const history: Delivery[] = [
    {
      id: "h1",
      nf: "121400",
      client: "LOJAS CEM S/A",
      address: "AVENIDA NOVE DE JULHO, 1200 - Jundiaí - SP",
      status: "completed",
      time: "10:15",
      value: "R$ 12.450,00",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310f?q=80&w=200&h=120&auto=format&fit=crop"
    },
    {
      id: "h2",
      nf: "121398",
      client: "MERCADO LIVRE LTDA",
      address: "ESTRADA MUNICIPAL, 500 - Cajamar - SP",
      status: "completed",
      time: "09:30",
      value: "R$ 3.200,50",
      image: "https://images.unsplash.com/photo-1553413077-190dd306264c?q=80&w=200&h=120&auto=format&fit=crop"
    }
  ];

  const filteredHistory = history.filter(delivery => 
    delivery.nf.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  const handleRangeSelect = (start: Date, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
    
    if (start && end) {
      const startStr = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const endStr = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      setSelectedPeriod(`${startStr} até ${endStr}`);
      setIsDateMenuOpen(false);
    } else {
      setSelectedPeriod(`${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}...`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-10 pb-10">
      {/* Advanced Filter Architecture */}
      <section className="bg-card border border-border/50 rounded-[3rem] p-6 shadow-2xl shadow-primary/[0.02]">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="flex-1 w-full space-y-2">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Busque por NF, cliente ou motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-secondary/30 border border-border/50 rounded-[2rem] pl-14 pr-6 py-4 text-sm font-semibold outline-none focus:border-primary/50 focus:bg-background transition-all"
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 shrink-0">
             <div className="relative">
                <button 
                  onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                  className="flex items-center justify-between gap-3 px-6 py-4 rounded-[1.5rem] bg-secondary/30 border border-border/50 text-sm font-bold text-foreground/70 cursor-pointer hover:bg-secondary/50 transition-all group min-w-[260px]"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>{selectedPeriod}</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isDateMenuOpen && "rotate-180")} />
                </button>

                 {isDateMenuOpen && (
                   <div className="absolute top-full right-0 mt-3 w-auto bg-card border border-border/50 rounded-2xl shadow-2xl z-[100] backdrop-blur-xl">
                     <MiniCalendar 
                       mode="range" 
                       onSelectRange={handleRangeSelect} 
                       initialStartDate={startDate}
                       initialEndDate={endDate}
                     />
                   </div>
                 )}
             </div>

             <div className="h-10 w-px bg-border/20 hidden lg:block" />


             <button className="flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-[1.5rem] shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
               <FileText className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Exportar Relatório</span>
               <Download className="w-4 h-4" />
             </button>
          </div>
        </div>
      </section>

      {/* History Feed */}
      <div className="space-y-8">
        <div className="flex items-center justify-between px-2">
           <h4 className="text-[12px] font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Histórico de Entregas
           </h4>
           <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent mx-8 hidden md:block" />
           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
             {filteredHistory.length} registros encontrados
           </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            {filteredHistory.length > 0 ? (
              filteredHistory.map((delivery) => (
                <div 
                  key={delivery.id}
                  className="bg-card border border-border/40 rounded-[2.5rem] p-6 hover:shadow-xl hover:shadow-primary/[0.03] hover:border-primary/30 transition-all group mb-4"
                >
                  <div className="flex flex-col lg:flex-row items-center gap-8">
                    {/* NF Identity */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                       <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center relative shadow-inner">
                          <span className="text-[8px] font-black text-emerald-600 uppercase">Status</span>
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                       </div>
                       <span className="text-xs font-black text-foreground tracking-tighter">NF {delivery.nf}</span>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 space-y-2 text-center lg:text-left pt-2 lg:pt-0">
                       <div className="flex items-center justify-center lg:justify-start gap-3">
                          <h5 className="text-[13px] font-black text-foreground uppercase tracking-tight">{delivery.client}</h5>
                          <span className="px-3 py-1 rounded-lg bg-secondary text-muted-foreground text-[8px] font-black tracking-widest uppercase">CONCLUÍDA</span>
                       </div>
                       <div className="flex items-center justify-center lg:justify-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-primary/60" />
                          <p className="text-[11px] font-bold text-muted-foreground uppercase leading-relaxed max-w-2xl">{delivery.address}</p>
                       </div>
                    </div>

                    {/* Outcome & Details */}
                    <div className="flex items-center gap-8 shrink-0">
                       <div className="flex flex-col items-end gap-1">
                          <span className="text-xl font-black text-foreground tracking-tighter">{delivery.value}</span>
                          <div className="flex items-center gap-1.5">
                             <Clock className="w-3 h-3 text-muted-foreground" />
                             <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Entrega às {delivery.time}</span>
                          </div>
                       </div>

                       <button className="h-14 w-14 rounded-2xl bg-secondary hover:bg-primary hover:text-white transition-all flex items-center justify-center border border-border/40 group/btn">
                          <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                       </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div 
                className="flex flex-col items-center justify-center py-20 bg-secondary/10 rounded-[3rem] border border-dashed border-border"
              >
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
                  <Search className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">Nenhum registro encontrado</h3>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Tente buscar por um número de NF ou nome de cliente diferente.</p>
                <button 
                  onClick={() => setSearchTerm("")}
                  className="mt-6 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Pagination/Load More */}
        <div className="flex justify-center pt-8">
           <button className="px-12 py-4 rounded-[2rem] bg-secondary/50 border border-border/40 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:bg-secondary hover:text-foreground transition-all">
              Carregar Mais Registros
           </button>
        </div>
      </div>
    </div>
  );
}
