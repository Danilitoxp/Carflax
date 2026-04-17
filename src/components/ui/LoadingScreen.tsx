import { ShieldCheck } from "lucide-react";

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[300] bg-background flex flex-col items-center justify-center">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      
      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Logo Container */}
        <div className="relative">
          <div className="w-24 h-24 bg-card border border-border/50 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10">
            <ShieldCheck className="w-12 h-12 text-[#0053FC]" />
          </div>
          
          {/* Pulsing Rings */}
          <div className="absolute inset-0 bg-[#0053FC]/20 rounded-[2.5rem] animate-ping opacity-20" />
          <div className="absolute inset-0 bg-[#0053FC]/10 rounded-[2.5rem] animate-ping opacity-10 [animation-delay:0.5s]" />
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center gap-3">
          <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">Carflax</h2>
          
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#0053FC] rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-[#0053FC] rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-[#0053FC] rounded-full animate-bounce" />
          </div>
          
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em] mt-2">
            Configurando seu ambiente
          </p>
        </div>
      </div>
    </div>
  );
}
