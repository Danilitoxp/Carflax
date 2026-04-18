import { Info } from "lucide-react";

export function HeroBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl w-full bg-white border border-border shadow-sm p-8 flex flex-col md:flex-row items-center gap-8 group">
      <div className="flex-1 space-y-3 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100 mb-2">
          <Info className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Informativo Carflax</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
          Painel de Gestão e <span className="text-blue-600">Comunicação</span>
        </h1>
        <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
          Acompanhe os principais indicadores da sua equipe em tempo real. Consulte metas, comunicados internos e atividades recentes em uma plataforma unificada e eficiente.
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

