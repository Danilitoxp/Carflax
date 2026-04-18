import { Target, Zap, BarChart3, CheckCircle2, Clock, Rocket, Cpu, Globe, ShieldCheck, TrendingUp, Layers, MousePointer2 } from "lucide-react";

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl w-full bg-white border border-border shadow-sm p-8 flex flex-col md:flex-row items-center gap-8 group">
      {/* Decorative Icons Background - Better Distribution */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top Edge */}
        <Target className="absolute top-4 left-[10%] w-12 h-12 text-blue-600/5 -rotate-12" />
        <Rocket className="absolute top-6 right-[10%] w-9 h-9 text-blue-500/5 rotate-45" />
        <Globe className="absolute top-20 right-[35%] w-12 h-12 text-blue-400/5 rotate-12" />
        <MousePointer2 className="absolute top-10 left-[45%] w-8 h-8 text-slate-400/5 rotate-12" />

        {/* Center/Middle Sides */}
        <BarChart3 className="absolute top-1/2 left-[5%] w-14 h-14 text-indigo-600/5 -translate-y-1/2 -rotate-6" />
        <TrendingUp className="absolute top-1/2 right-[5%] w-14 h-14 text-indigo-500/5 -translate-y-1/2 rotate-6" />
        <Clock className="absolute top-10 right-[45%] w-10 h-10 text-slate-400/5 rotate-12" />

        {/* Bottom Edge */}
        <Zap className="absolute bottom-6 left-[15%] w-10 h-10 text-amber-500/5 rotate-12" />
        <Cpu className="absolute bottom-10 right-[20%] w-16 h-16 text-slate-600/5 -rotate-12" />
        <ShieldCheck className="absolute bottom-20 left-[40%] w-10 h-10 text-emerald-500/5 -rotate-6" />
        <CheckCircle2 className="absolute bottom-4 right-[40%] w-8 h-8 text-emerald-600/5 rotate-12" />
        <Layers className="absolute bottom-8 right-[5%] w-12 h-12 text-blue-600/5 -rotate-12" />
      </div>

      <div className="flex-1 space-y-3 text-center md:text-left relative z-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
          Carflax <span className="text-blue-600">HUB</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
          Sua produtividade em um só lugar. Tenha acesso ágil a metas e indicadores, comunique-se de forma direta com sua equipe e organize suas tarefas diárias com ferramentas integradas e inteligentes. 
          Escalabilidade e eficiência para o seu dia a dia.
        </p>
      </div>
      
      <div className="shrink-0 hidden lg:block">
        <div className="relative w-48 h-48 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center border border-blue-100/50 shadow-inner overflow-hidden group/rocket">
           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_2px_2px,_rgba(0,0,0,0.1)_1px,_transparent_0)] bg-[size:12px_12px]" />
           
           {/* Animated Rocket Wrapper */}
           <div className="relative animate-rocket-float">
             <svg 
               viewBox="0 0 24 24" 
               className="w-24 h-24 text-blue-600 drop-shadow-[0_10px_15px_rgba(37,99,235,0.3)] transition-all duration-500 group-hover:scale-110 group-hover:-rotate-12"
               fill="none" 
               stroke="currentColor" 
               strokeWidth="1.5" 
               strokeLinecap="round" 
               strokeLinejoin="round"
             >
               <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
               <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
               <path d="M9 12H4s.5-1 1-4c2 1 3 2 4 4Z" />
               <path d="M12 15v5c1 2 4 1 4 1s1-3 1-4c-2-1-3-2-5-2Z" />
               <path d="M15 9h.01" />
             </svg>
             
             {/* Small Flame Particles (Simplified) */}
             <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1.5 h-3 bg-amber-400 rounded-full animate-bounce delay-75" />
                <div className="w-2 h-5 bg-orange-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-3 bg-amber-400 rounded-full animate-bounce delay-150" />
             </div>
           </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rocket-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        .animate-rocket-float {
          animation: rocket-float 3s ease-in-out infinite;
        }
      `}} />

      {/* Subtle decorative elements */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl opacity-50" />
    </div>
  )
}

