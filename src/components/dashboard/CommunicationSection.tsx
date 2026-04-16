import { Plus, Clock, ThumbsUp, ThumbsDown, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HeroBanner } from "./HeroBanner";

const categories = ["Todos", "Empresa", "Social", "Eventos", "Avisos"];

const communications = [
  {
    id: 1,
    title: "🎉 Feliz Aniversário, Mateus Ronald! 🎂",
    content: "Hoje celebramos a vida do(a) nosso(a) colega Mateus Ronald! A família Carflax se alegra em compartilhar esse momento especial ao seu lado, reconhecendo toda a dedicação, profissionalismo e energia que você contribui no dia a dia. Desejamos que este novo ciclo venha acompanhado de muita saúde, conquistas e momentos inesquecíveis.",
    category: "Social",
    author: "RH Corporate",
    date: "há 7 dias",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mateus",
    likes: 7,
    dislikes: 0
  },
  {
    id: 2,
    title: "Atualização da Política de Home Office 2026",
    content: "Estamos atualizando nossas diretrizes para permitir maior flexibilidade aos colaboradores. Confira os novos modelos de trabalho híbrido disponíveis a partir do próximo mês no portal do RH.",
    category: "Empresa",
    author: "Diretoria",
    date: "há 2 horas",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Office",
    likes: 12,
    dislikes: 0
  },
  {
    id: 3,
    title: "Novos Benefícios: Plano de Saúde Ampliado",
    content: "A partir do próximo trimestre, todos os colaboradores terão acesso ao novo plano de saúde Platinum. Fiquem atentos aos seus e-mails para o formulário de atualização de dependentes.",
    category: "Avisos",
    author: "Benefícios",
    date: "há 1 dia",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Health",
    likes: 24,
    dislikes: 0
  }
];

export function CommunicationCard({ data }: { data: typeof communications[0] }) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col md:flex-row min-h-[250px] group transition-all duration-500 hover:border-primary/30 shadow-lg dark:shadow-2xl dark:shadow-black/20">
      {/* Visual Side (Image) */}
      <div className="md:w-64 bg-gradient-to-br from-[#032D9C] to-[#0053FC] flex items-center justify-center p-6 relative overflow-hidden shrink-0">
        <div className="w-32 h-32 rounded-full border-4 border-white/20 p-1 relative z-10 transition-transform duration-500 group-hover:scale-110 shadow-xl shadow-black/20">
          <img 
            src={data.image} 
            alt={data.title} 
            className="w-full h-full rounded-full object-cover bg-white/10"
          />
        </div>
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        </div>
      </div>

      {/* Content Side */}
      <div className="flex-1 p-6 flex flex-col relative bg-card transition-colors duration-300">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 tracking-tight line-clamp-1">
            {data.title}
          </h3>
          <button className="text-muted-foreground/30 hover:text-primary transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mb-6 flex-1">
          <p className="text-muted-foreground text-sm leading-relaxed font-medium line-clamp-3">
            {data.content}
          </p>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-5 py-2 bg-[#0053FC]/10 dark:bg-[#0053FC]/20 border border-[#0053FC]/20 rounded-full group/like cursor-pointer transition-all hover:bg-[#0053FC] hover:text-white shadow-sm hover:scale-105 active:scale-95">
              <ThumbsUp className="w-4 h-4 text-[#0053FC] group-hover/like:text-white transition-all group-hover/like:-rotate-12" />
              <span className="text-xs font-bold text-[#0053FC] group-hover/like:text-white transition-colors">{data.likes}</span>
            </button>
            <button className="flex items-center gap-2 px-5 py-2 bg-slate-500/5 dark:bg-slate-500/10 border border-slate-500/20 rounded-full group/dislike cursor-pointer transition-all hover:bg-slate-800 dark:hover:bg-slate-700 hover:text-white shadow-sm hover:scale-105 active:scale-95">
              <ThumbsDown className="w-4 h-4 text-slate-500 group-hover/dislike:text-white transition-all group-hover/dislike:rotate-12" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400/90 group-hover/dislike:text-white transition-colors">{data.dislikes}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground/60 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">{data.date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommunicationSection() {
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filtered = activeCategory === "Todos" 
    ? communications 
    : communications.filter(c => c.category === activeCategory);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* FIXED TOP PART: Banner + Filters */}
      <div className="p-4 md:px-6 md:pt-6 md:pb-2 space-y-2 shrink-0 bg-background/50 backdrop-blur-md z-20">
        <HeroBanner />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center p-1 bg-secondary/50 rounded-2xl border border-border w-fit">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300",
                  activeCategory === cat 
                    ? "bg-card text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <Button className="gap-2 bg-[#0053FC] hover:bg-[#0053FC]/90 text-white rounded-xl py-6 px-8 font-bold transition-all border-none shadow-md active:scale-95">
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span className="tracking-tight">Novo Comunicado</span>
          </Button>
        </div>
      </div>

      {/* SCROLLABLE BOTTOM PART: Cards */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-12 scrollbar-hide">
        <div className="flex flex-col gap-2 max-h-min pt-0">
          {filtered.map((item) => (
            <CommunicationCard key={item.id} data={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
