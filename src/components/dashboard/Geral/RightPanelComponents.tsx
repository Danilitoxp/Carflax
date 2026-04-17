import { useState, useEffect } from "react";
import { Gift, Target, TrendingUp, Medal, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, animate, AnimatePresence } from "framer-motion";

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

export function SalesMetricsCard() {
  const metrics = [
    { label: "Meta", value: 331, prefix: "R$ ", suffix: "k", icon: Target },
    { label: "Faltante", value: 83, prefix: "R$ ", suffix: "k", icon: TrendingUp },
    { label: "Faturado", value: 223, prefix: "R$ ", suffix: "k", icon: Clock },
    { label: "Aberto", value: 24, prefix: "R$ ", suffix: "k", icon: Clock },
    { label: "Equilíbrio", value: 195, prefix: "R$ ", suffix: "k", icon: Medal },
    { label: "Total", value: 247, prefix: "R$ ", suffix: "k", icon: TrendingUp },
    { label: "Dias Rest.", value: 10, icon: Target },
    { label: "Diário", value: 8, prefix: "R$ ", suffix: "k", icon: TrendingUp },
    { label: "Tx Conv.", value: 55.4, suffix: "%", icon: Medal, decimalPlaces: 1 },
    { label: "Ticket M.", value: 1.7, prefix: "R$ ", suffix: "k", icon: Medal, decimalPlaces: 1 },
    { label: "Margem", value: 33.5, suffix: "%", icon: Medal, decimalPlaces: 1 },
  ];

  return (
    <div className="bg-card border border-border/50 rounded-[32px] p-4 shadow-xl shadow-black/5 relative overflow-hidden flex flex-col items-center">
      {/* Ultra Compact Percentage Circle */}
      <div className="relative w-28 h-28 flex items-center justify-center mb-3">
        <svg className="w-full h-full -rotate-90">
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
            strokeWidth="14"
            className="text-muted/5"
          />
          <circle
            cx="56"
            cy="56"
            r="48"
            fill="transparent"
            stroke="url(#circleGradient)"
            strokeWidth="14"
            strokeDasharray={301}
            strokeDashoffset={0}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out shadow-2xl"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-foreground tracking-tighter">
            <CountUp value={127} suffix="%" />
          </span>
        </div>
      </div>

      {/* Selling Today - Compact */}
      <div className="text-center mb-4">
        <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-1">Vendido Hoje</p>
        <h3 className="text-2xl font-black text-foreground tracking-tighter">
          <CountUp value={15074.09} prefix="R$ " decimalPlaces={2} />
        </h3>
      </div>

      {/* Meta Mini Bar - Compact */}
      <div className="w-full mb-6 px-1">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Meta Mensal</span>
          <span className="text-[11px] font-black text-primary">74.8%</span>
        </div>
        <div className="w-full h-3.5 bg-secondary/50 rounded-full overflow-hidden border border-border/50 shadow-inner">
          <div className="h-full bg-gradient-to-r from-[#032D9C] to-[#0053FC] rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,83,252,0.3)]" style={{ width: '74.8%' }} />
        </div>
      </div>

      {/* 2-Column Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {metrics.map((m, i) => (
          <div key={i} className="p-2.5 rounded-2xl bg-secondary/30 border border-border/50 flex items-center gap-3 transition-all hover:bg-secondary/50">
            <m.icon className="w-4 h-4 text-primary/70 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter truncate">{m.label}</p>
              <p className="text-xs font-black text-foreground truncate">
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
      "bg-card border border-border/50 rounded-[32px] p-5 shadow-xl shadow-black/5 mt-2 flex flex-col transition-all duration-500",
      !isCompact ? "flex-1 min-h-[400px]" : "min-h-[180px]"
    )}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">
          {activeTab === 0 ? "Aniversariantes do Mês" : "Próximos Eventos"}
        </h4>
        
        {/* Pagination Dots */}
        <div className="flex gap-1.5 px-2 py-1 rounded-full bg-secondary/30 border border-border/50">
          <button 
            onClick={() => setActiveTab(0)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              activeTab === 0 ? "bg-primary w-4" : "bg-primary/20 hover:bg-primary/40"
            )}
          />
          <button 
            onClick={() => setActiveTab(1)}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              activeTab === 1 ? "bg-primary w-4" : "bg-primary/20 hover:bg-primary/40"
            )}
          />
        </div>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 0 ? (
            <motion.div 
              key="birthdays"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col gap-2 h-full"
            >
              {birthdays.map((person, i) => (
                <div key={i} className="bg-secondary/30 border border-border/50 p-2.5 rounded-2xl flex items-center gap-3 transition-all hover:bg-secondary/50 cursor-pointer group">
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-primary overflow-hidden border border-border/10 group-hover:scale-105 transition-transform">
                      <img src={person.img} alt={person.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-pill bg-pink-500 rounded-lg flex items-center justify-center border-2 border-background shadow-sm">
                      <Gift className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 flex items-center justify-between">
                    <p className="text-[10px] font-black text-foreground truncate">{person.name}</p>
                    <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      <span className="text-[9px] font-bold text-primary">{person.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="events"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col gap-2 h-full"
            >
              {events.map((event, i) => {
                const [day, month] = event.date.split("/");
                const monthMap: Record<string, string> = { "04": "ABR", "05": "MAI", "06": "JUN" };
                return (
                  <div key={i} className="bg-secondary/30 border border-border/50 p-2.5 rounded-2xl flex items-center gap-3 transition-all hover:bg-secondary/50 cursor-pointer group">
                    <div className="w-10 h-10 rounded-xl bg-card border border-border/50 overflow-hidden flex flex-col shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                      <div className="bg-primary h-3.5 w-full flex items-center justify-center">
                        <span className="text-[7px] font-black text-white">{monthMap[month] || "EVENT"}</span>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <span className="text-sm font-black text-foreground">{day}</span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 flex items-center justify-between">
                      <div>
                          <p className="text-[10px] font-black text-foreground truncate">{event.name}</p>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{event.type}</p>
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                        <span className="text-[9px] font-bold text-primary">{event.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
