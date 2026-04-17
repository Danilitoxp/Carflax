import { useState, useEffect } from "react";
import { Gift, Target, TrendingUp, Medal, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { animate } from "framer-motion";

function CountUp({ value, duration = 3, prefix = "", suffix = "", decimalPlaces = 0 }: { value: number, duration?: number, prefix?: string, suffix?: string, decimalPlaces?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const from = 0;
    const controls = animate(from, value, {
      duration: duration,
      ease: "easeOut",
      onUpdate: (latest: number) => setDisplayValue(latest)
    });
    return () => controls.stop();
  }, [value, duration]);

  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  }).format(displayValue);

  return <span>{prefix}{formatted}{suffix}</span>;
}


export function HighlightCard() {
  // ... (existing code remains same)
  return (
    <div className="relative h-[340px] overflow-hidden rounded-[32px] group cursor-pointer shadow-md transition-all hover:scale-[1.02]">
      <img
        src="https://funcionarioscarflax.vercel.app/images/joao.jpg"
        alt="João Silva"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#032D9C] via-[#032D9C]/40 to-transparent opacity-90" />
      <div className="absolute bottom-6 inset-x-6 text-center space-y-4">
        <div className="space-y-0.5">
          <h4 className="text-xl font-bold text-white tracking-tight drop-shadow-md">João Silva</h4>
          <p className="text-[10px] font-bold text-white/80 uppercase tracking-[0.2em] drop-shadow-sm">Lead Developer</p>
        </div>
        <button className="w-full bg-white/90 backdrop-blur-md text-black text-xs font-bold py-3 rounded-full hover:bg-white transition-all shadow-lg active:scale-95">
          Ver Trajetória
        </button>
      </div>
    </div>
  );
}

export function SalesMetricsCard({ isCompact }: { isCompact?: boolean }) {
  const metrics = [
    { label: "Meta", value: 331, prefix: "R$ ", suffix: "k", icon: Target },
    { label: "Faltante", value: 83, prefix: "R$ ", suffix: "k", icon: TrendingUp },
    { label: "Faturado", value: 223, prefix: "R$ ", suffix: "k", icon: Clock },
    { label: "Aberto", value: 24, prefix: "R$ ", suffix: "k", icon: Clock },
    { label: "Equilíbrio", value: 195, prefix: "R$ ", suffix: "k", icon: Medal },
    { label: "Total", value: 247, prefix: "R$ ", suffix: "k", icon: TrendingUp },
    { label: "Dias", value: 10, icon: Target },
    { label: "Diário", value: 8, prefix: "R$ ", suffix: "k", icon: TrendingUp },
    { label: "Tx Conv.", value: 55.4, suffix: "%", icon: Medal, decimalPlaces: 1 },
    { label: "Ticket M.", value: 1.7, prefix: "R$ ", suffix: "k", icon: Medal, decimalPlaces: 1 },
    { label: "Margem", value: 33.5, suffix: "%", icon: Medal, decimalPlaces: 1 },
  ];

  return (
    <div className={cn(
      "bg-card border border-border/50 rounded-[32px] shadow-xl shadow-black/5 relative overflow-hidden flex flex-col items-center",
      isCompact ? "p-3" : "p-4"
    )}>
      {/* Ultra Compact Percentage Circle */}
      <div className={cn(
        "relative flex items-center justify-center",
        isCompact ? "w-24 h-24 mb-1" : "w-28 h-28 mb-3"
      )}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 112 112">
          <defs>
            <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#032D9C" />
              <stop offset="100%" stopColor="#0053FC" />
            </linearGradient>
          </defs>
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/5"
          />
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="transparent"
            stroke="url(#circleGradient)"
            strokeWidth="12"
            strokeDasharray={301}
            strokeDashoffset={301 * (1 - 0.748)}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "font-black text-foreground tracking-tighter",
            isCompact ? "text-lg" : "text-xl"
          )}>
            <CountUp value={127} suffix="%" />
          </span>
        </div>
      </div>

      {/* Selling Today - Compact */}
      <div className="text-center mb-3">
        <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em] mb-0.5">Vendido Hoje</p>
        <h3 className={cn(
          "font-black text-foreground tracking-tighter",
          isCompact ? "text-xl" : "text-2xl"
        )}>
          <CountUp value={15074.09} prefix="R$ " decimalPlaces={2} />
        </h3>
      </div>

      {/* Meta Mini Bar - Compact */}
      <div className={cn("w-full px-1", isCompact ? "mb-4" : "mb-6")}>
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Meta Mensal</span>
          <span className="text-[10px] font-black text-primary">74.8%</span>
        </div>
        <div className={cn("w-full bg-secondary/50 rounded-full overflow-hidden border border-border/50 shadow-inner", isCompact ? "h-2.5" : "h-3.5")}>
          <div className="h-full bg-gradient-to-r from-[#032D9C] to-[#0053FC] rounded-full transition-all duration-1000 ease-out" style={{ width: '74.8%' }} />
        </div>
      </div>

      {/* Metrics Grid - Optimized */}
      <div className="grid grid-cols-2 gap-1.5 w-full">
        {metrics.map((m, i) => (
          <div key={i} className={cn(
            "rounded-xl bg-secondary/30 border border-border/50 flex items-center gap-2 transition-all hover:bg-secondary/40",
            isCompact ? "p-1.5" : "p-2"
          )}>
            <m.icon className={cn("text-primary/70 shrink-0", isCompact ? "w-3 h-3" : "w-3.5 h-3.5")} />
            <div className="min-w-0 flex-1">
              <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-tighter truncate leading-none mb-0.5">{m.label}</p>
              <p className={cn("font-black text-foreground truncate leading-none", isCompact ? "text-[10px]" : "text-xs")}>
                <CountUp 
                    value={m.value} 
                    prefix={m.prefix} 
                    suffix={m.suffix} 
                    decimalPlaces={m.decimalPlaces || 0} 
                    duration={3}
                />
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BirthdayList({ isCompact }: { isCompact?: boolean }) {
  const [activeTab, setActiveTab] = useState(0); // 0: Birthdays, 1: Events

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev === 0 ? 1 : 0));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const limit = isCompact ? 2 : 6;

  const birthdays = [
    { name: "João Pedro", date: "07/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=felix" },
    { name: "Mateus Ronald", date: "10/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane" },
    { name: "Ana Maria", date: "12/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=vera" },
    { name: "Lucas Silva", date: "15/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=lucas" },
    { name: "Bia Souza", date: "18/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=bia" },
    { name: "Caio Rocha", date: "20/04", img: "https://api.dicebear.com/7.x/avataaars/svg?seed=caio" },
  ].slice(0, limit);

  const events = [
    { name: "Reunião Geral", date: "25/04", type: "Reunião", icon: Clock },
    { name: "Treinamento Técnico", date: "28/04", type: "Workshop", icon: Target },
    { name: "Alinhamento Vendas", date: "30/04", type: "Equipe", icon: Target },
    { name: "Inauguração", date: "02/05", type: "Evento", icon: Target },
    { name: "Café com CEO", date: "05/05", type: "Social", icon: Clock },
    { name: "Workshop Design", date: "08/05", type: "Workshop", icon: Target },
  ].slice(0, limit);

  return (
    <div className={cn(
      "bg-card border border-border/50 rounded-[32px] p-4 shadow-xl shadow-black/5 flex flex-col transition-all duration-500 flex-1 min-h-[160px]"
    )}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[9px] font-black text-foreground uppercase tracking-[0.2em]">
          {activeTab === 0 ? "Aniversariantes" : "Eventos"}
        </h4>
        
        {/* Pagination Dots */}
        <div className="flex gap-1 py-1 px-1.5 rounded-full bg-secondary/30 border border-border/50">
          <button 
            onClick={() => setActiveTab(0)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              activeTab === 0 ? "bg-primary w-3" : "bg-primary/20 hover:bg-primary/40"
            )}
          />
          <button 
            onClick={() => setActiveTab(1)}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              activeTab === 1 ? "bg-primary w-3" : "bg-primary/20 hover:bg-primary/40"
            )}
          />
        </div>
      </div>
      
      <div className="relative flex-1 overflow-y-auto scrollbar-hide">
        {activeTab === 0 ? (
          <div className="flex flex-col gap-1.5">
            {birthdays.map((person, i) => (
              <div key={i} className="bg-secondary/30 border border-border/50 p-2 rounded-xl flex items-center gap-2.5 transition-all hover:bg-secondary/50 cursor-pointer group">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-primary overflow-hidden border border-border/10 group-hover:scale-105 transition-transform">
                    <img src={person.img} alt={person.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-pink-500 rounded flex items-center justify-center border-2 border-background shadow-sm">
                    <Gift className="w-2 h-2 text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <p className="text-[9px] font-black text-foreground truncate">{person.name}</p>
                  <div className="px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    <span className="text-[8px] font-bold text-primary">{person.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {events.map((event, i) => {
              const [day, month] = event.date.split("/");
              const monthMap: Record<string, string> = { "04": "ABR", "05": "MAI", "06": "JUN" };
              return (
                <div key={i} className="bg-secondary/30 border border-border/50 p-2 rounded-xl flex items-center gap-2.5 transition-all hover:bg-secondary/50 cursor-pointer group">
                  <div className="w-8 h-8 rounded-lg bg-card border border-border/50 overflow-hidden flex flex-col shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <div className="bg-primary h-2.5 w-full flex items-center justify-center">
                      <span className="text-[6px] font-black text-white">{monthMap[month] || "EV"}</span>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-[10px] font-black text-foreground">{day}</span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-foreground truncate">{event.name}</p>
                        <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest">{event.type}</p>
                    </div>
                    <div className="px-1.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      <span className="text-[8px] font-bold text-primary">{event.date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
