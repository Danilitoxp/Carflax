import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";

export function HighlightCard() {
  return (
    <div className="relative h-[340px] overflow-hidden rounded-[32px] group cursor-pointer shadow-md transition-all hover:scale-[1.02]">
      {/* Background Image - Real Employee Photo */}
      <img 
        src="https://funcionarioscarflax.vercel.app/images/joao.jpg" 
        alt="João Silva" 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      
      {/* Deep Brand Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#032D9C] via-[#032D9C]/40 to-transparent opacity-90" />

      {/* Glassmorphism Bottom Content */}
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

const birthdays = [
  { name: "Mariana Souza", date: "Hoje", img: "advah" },
  { name: "Joo Pedro", date: "18 de Abril", img: "felix" },
  { name: "Ana Beatriz", date: "21 de Abril", img: "jane" },
];

export function BirthdayList() {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 transition-all shadow-xl shadow-black/5">
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-[0.15em]">Aniversariantes</h4>
        <div className="p-2 bg-primary/5 rounded-lg">
          <Gift className="w-4 h-4 text-primary" />
        </div>
      </div>

      <div className="space-y-5">
        {birthdays.map((person, i) => {
          const isToday = person.date === "Hoje";
          return (
            <div
              key={i}
              className="flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-full p-0.5 transition-transform group-hover:scale-105",
                  isToday ? "bg-gradient-to-tr from-[#032D9C] to-[#0053FC]" : "bg-border/30"
                )}>
                  <div className="w-full h-full rounded-full bg-card flex items-center justify-center overflow-hidden border-2 border-card">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${person.img}&backgroundColor=F3F4F6`}
                      alt={person.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight group-hover:text-[#0053FC] transition-colors">
                    {person.name}
                  </p>
                  <p className={cn(
                    "text-[10px] font-medium transition-colors",
                    isToday ? "text-[#0053FC]" : "text-muted-foreground"
                  )}>
                    {person.date}
                  </p>
                </div>
              </div>
              
              {isToday && (
                <div className="px-2 py-0.5 rounded-full bg-[#0053FC]/10 text-[#0053FC] text-[9px] font-bold uppercase tracking-wider animate-pulse">
                  Hoje
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button className="w-full mt-8 py-3.5 rounded-xl bg-[#0053FC] hover:bg-[#0053FC]/90 text-white text-[10px] font-bold transition-all shadow-md active:scale-[0.98] uppercase tracking-[0.15em] border-none">
        Ver calendário completo
      </button>
    </div>
  );
}
