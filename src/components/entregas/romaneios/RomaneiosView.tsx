import { 
  MapPin, 
  Navigation, 
  Link as LinkIcon, 
  Trash2, 
  CheckCircle2, 
  Plus, 
  Download,
  Clock,
  ChevronRight,
  User as UserIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Delivery {
  id: string;
  nf: string;
  client: string;
  address: string;
  status: "pending" | "completed" | "failed";
  time?: string;
  value: string;
  image?: string;
  priority?: "low" | "medium" | "high";
}

export function RomaneiosView() {
  const deliveries: Delivery[] = [
    {
      id: "1",
      nf: "121495",
      client: "ANA MARIA DE JESUS PIERRONI",
      address: "RUA UM, ESTRADA DA SERVIDÃO, NUMERO 37 - Várzea Paulista - SP",
      status: "completed",
      time: "16:20",
      value: "R$ 4.544,01",
      image: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?q=80&w=200&h=120&auto=format&fit=crop",
      priority: "high"
    },
    {
      id: "2",
      nf: "121412",
      client: "BARBI DO BRASIL LTDA",
      address: "RUADORIVAL SPONCHIADO, 530 - PQ EMPRESARIAL - Várzea Paulista - SP",
      status: "completed",
      time: "16:22",
      value: "R$ 821,70",
      image: "https://images.unsplash.com/photo-1553413077-190dd306264c?q=80&w=200&h=120&auto=format&fit=crop",
      priority: "medium"
    },
    {
      id: "3",
      nf: "121496",
      client: "JAQUELINE PAZELI",
      address: "RUA INAJÁ, 155 - COND CHACUR - Jundiaí - SP",
      status: "pending",
      value: "R$ 1.000,00",
      image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310f?q=80&w=200&h=120&auto=format&fit=crop",
      priority: "low"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide space-y-8 pb-10">
      {/* Floating Action Form */}
      <section className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-[3rem] p-4 md:p-1.5 shadow-2xl shadow-primary/[0.03] flex flex-col md:flex-row items-center gap-2">
        <div className="flex-1 flex items-center gap-2 w-full">
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 ml-2">
             <Plus className="w-6 h-6 text-primary" />
           </div>
           <input 
             type="text" 
             placeholder="Novo número de NF..."
             className="flex-1 bg-transparent border-none text-sm font-bold placeholder:text-muted-foreground/50 outline-none px-2"
           />
        </div>
        
        <div className="h-10 w-px bg-border/20 hidden md:block" />

        <div className="flex-1 w-full flex items-center gap-4 px-4 min-w-[240px]">
           <UserIcon className="w-4 h-4 text-muted-foreground" />
           <select className="flex-1 bg-transparent border-none text-sm font-bold text-foreground/70 outline-none cursor-pointer appearance-none">
             <option value="">Selecionar Motorista</option>
             <option value="nicholas">Nicholas Galbieri</option>
             <option value="danilo">Danilo Vieira</option>
           </select>
        </div>

        <button className="w-full md:w-auto px-10 py-4 rounded-[2rem] bg-primary text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:brightness-110 hover:translate-y-[-2px] active:translate-y-0 transition-all flex items-center justify-center gap-3">
          Lançar Entrega
          <ChevronRight className="w-4 h-4" />
        </button>
      </section>

      {/* Driver & Timeline Section */}
      <div className="space-y-6">
        <div className="bg-card border border-border/50 rounded-[2.5rem] overflow-hidden shadow-sm relative group">
          <div className="absolute top-0 right-0 p-8">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Em Trânsito</span>
             </div>
          </div>

          {/* New Driver Header Design */}
          <div className="p-10 pb-6 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="relative group/avatar">
                <div className="absolute -inset-2 bg-gradient-to-tr from-primary to-violet-500 rounded-3xl blur-lg opacity-20 group-hover/avatar:opacity-40 transition-opacity" />
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nicholas" 
                  className="w-20 h-20 rounded-[2rem] border-4 border-card relative z-10 shadow-xl object-cover"
                  alt="Motorista"
                />
                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-emerald-500 border-4 border-card rounded-2xl z-20 flex items-center justify-center shadow-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Motorista Principal</p>
                <h4 className="text-2xl font-black text-foreground uppercase tracking-tighter">Nicholas Galbieri</h4>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-4 py-1.5 rounded-xl bg-secondary text-foreground text-[9px] font-black tracking-widest uppercase border border-border/40">
                    ROM: ROM-250413
                  </span>
                  <span className="px-4 py-1.5 rounded-xl bg-secondary text-foreground text-[9px] font-black tracking-widest uppercase border border-border/40">
                    PLACA: ABC-1234
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <button className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl bg-secondary/50 hover:bg-primary transition-all overflow-hidden">
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-primary group-hover:bg-white transition-colors" />
                  <Navigation className="w-4 h-4 text-primary group-hover:text-white transition-colors" />
                  <span className="text-[10px] font-black uppercase tracking-[0.1em] group-hover:text-white transition-colors">Iniciar Rastreio</span>
               </button>
               <button className="p-4 rounded-2xl bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                  <LinkIcon className="w-5 h-5" />
               </button>
            </div>
          </div>

          <div className="px-10 pb-10">
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence>
                {deliveries.map((delivery, i) => (
                  <motion.div 
                    key={delivery.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + (i * 0.1) }}
                    className="relative group/card"
                  >
                    {/* Vertical Timeline Link */}
                    {i !== deliveries.length - 1 && (
                      <div className="absolute left-[34px] top-12 bottom-[-16px] w-[2px] bg-gradient-to-b from-primary/30 to-border/10 z-0" />
                    )}

                    <div className={cn(
                      "relative z-10 flex flex-col xl:flex-row items-center gap-6 p-6 rounded-[2.5rem] border transition-all duration-500",
                      delivery.status === "completed" 
                        ? "bg-secondary/10 border-border/40 hover:border-emerald-500/30" 
                        : "bg-primary/[0.02] border-primary/20 hover:border-primary shadow-lg shadow-primary/[0.02]"
                    )}>
                      {/* Priority Dot */}
                      <div className={cn(
                        "absolute top-4 right-4 w-1.5 h-1.5 rounded-full",
                        delivery.priority === "high" ? "bg-rose-500" : delivery.priority === "medium" ? "bg-amber-500" : "bg-emerald-500"
                      )} />

                      <div className="flex items-center gap-6 shrink-0">
                        <div className="w-12 h-12 rounded-full border-2 border-border/20 flex items-center justify-center bg-card shadow-inner group-hover/card:border-primary transition-colors">
                          {delivery.status === "completed" ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          ) : (
                            <Clock className="w-6 h-6 text-primary animate-pulse" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-sm font-black text-foreground tracking-tight">NF {delivery.nf}</span>
                          <div className="flex items-center gap-2">
                             <span className={cn(
                               "text-[8px] font-black uppercase tracking-widest",
                               delivery.status === "completed" ? "text-emerald-500" : "text-primary"
                             )}>
                               {delivery.status === "completed" ? `Finalizada às ${delivery.time}` : "Entrega em Espera"}
                             </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <h5 className="text-[12px] font-black text-foreground/90 uppercase tracking-tight group-hover/card:text-primary transition-colors">{delivery.client}</h5>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed max-w-lg">{delivery.address}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        {delivery.status === "completed" && delivery.image && (
                          <div className="w-32 h-16 rounded-2xl overflow-hidden border border-border/40 shadow-xl relative group/img">
                            <img src={delivery.image} className="w-full h-full object-cover grayscale group-hover/img:grayscale-0 transition-all duration-700" alt="Entrega" />
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                               <Download className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        )}
                        
                        <div className="text-right">
                          <span className="text-lg font-black text-foreground tracking-tighter">{delivery.value}</span>
                          <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover/card:opacity-100 transition-all translate-y-2 group-hover/card:translate-y-0">
                             <button className="p-2.5 rounded-xl bg-secondary/50 text-muted-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all">
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
