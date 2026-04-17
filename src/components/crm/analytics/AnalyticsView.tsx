import { Package, Zap, ArrowUpRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalyticsView() {
  const statusDist = [
    { label: "Emitido", value: 10, color: "from-blue-600 to-blue-400", shadow: "shadow-blue-500/20" },
    { label: "Enviado", value: 3, color: "from-[#9C6ADE] to-[#B68DED]", shadow: "shadow-purple-500/20" },
    { label: "Negociação", value: 2, color: "from-[#F5C71A] to-[#FFD94D]", shadow: "shadow-yellow-500/20" },
    { label: "Aguard. Pedido", value: 1, color: "from-[#D35400] to-[#E67E22]", shadow: "shadow-orange-500/20" },
    { label: "Venda", value: 28, color: "from-emerald-600 to-emerald-400", shadow: "shadow-emerald-500/20" },
    { label: "Perdido", value: 14, color: "from-[#C0392B] to-[#E74C3C]", shadow: "shadow-rose-500/20" },
  ];

  const lossReasons = [
    { label: "PREÇO ALTO", value: 4, color: "from-rose-600 to-rose-400" },
    { label: "FALTA DE ESTOQUE", value: 2, color: "from-orange-600 to-orange-400" },
    { label: "DESISTIU", value: 2, color: "from-amber-600 to-amber-400" },
    { label: "PRAZO DE ENTREGA", value: 1, color: "from-orange-500/80 to-orange-300/80" },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Distribution */}
        <div className="lg:col-span-5 bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors" />
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Distribuição por Status
          </h3>
          <div className="space-y-6">
            {statusDist.map((s, i) => (
              <div key={i} className="flex items-center gap-5 group/item">
                <span className="w-24 text-[11px] font-black text-muted-foreground uppercase tracking-tighter text-right shrink-0 group-hover/item:text-foreground transition-colors">{s.label}</span>
                <div className="flex-1 h-4 bg-secondary/20 rounded-full overflow-hidden relative shadow-inner">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000 delay-300 bg-gradient-to-r shadow-lg", s.color, s.shadow)} 
                    style={{ width: `${(s.value / 30) * 100}%` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                </div>
                <span className="w-8 text-[11px] font-black text-foreground/40 text-center">{s.value}</span>
              </div>
            ))}
            <div className="flex justify-between pl-28 pr-10 pt-4 border-t border-border/10">
              {[0, 10, 20, 30].map(v => (
                <span key={v} className="text-[9px] font-black text-muted-foreground/20">{v}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Loss Reasons */}
        <div className="lg:col-span-4 bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-rose-500/10 transition-colors" />
          <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Principais Motivos de Perda
          </h3>
          <div className="space-y-6">
            {lossReasons.map((r, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center pr-2">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">{r.label}</span>
                  <span className="text-[10px] font-black text-rose-500/60">{r.value} ocorrências</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-4 bg-secondary/20 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000 delay-500 bg-gradient-to-r", r.color)} 
                      style={{ width: `${(r.value / 4) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Summary */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm h-full relative overflow-hidden group">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-8">Performance Geral</h3>
            <div className="space-y-7">
              {[
                { label: "Pipeline", value: "R$ 34.248", icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Conversão", value: "73.7%", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "Ticket Médio", value: "R$ 4.850", icon: ArrowUpRight, color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "Vendas", value: "28", icon: Send, color: "text-primary", bg: "bg-primary/10" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between group/row">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-hover/row:scale-110", item.bg)}>
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">{item.label}</span>
                  </div>
                  <span className="text-sm font-black text-foreground tracking-tighter">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="mt-10 p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 text-center">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Crescimento Mensal</p>
              <p className="text-xl font-black text-emerald-500">+17.3%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Trend Chart */}
      <div className="h-[400px] bg-card border border-border/50 rounded-[2.5rem] p-10 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="flex items-center justify-between mb-12 relative z-10">
          <div>
            <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter flex items-center gap-3">
              Fluxo de Propostas
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] tracking-widest">REAL TIME</span>
            </h3>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1 opacity-60">Volume diário de orçamentos emitidos</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-secondary/30 p-1.5 rounded-2xl border border-border/40">
              {['DIA', 'SEM', 'MÊS'].map(m => (
                <button key={m} className={cn("px-5 py-2 text-[9px] font-black rounded-xl transition-all", m === 'DIA' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{m}</button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="absolute inset-x-10 bottom-12 flex items-end gap-3 h-56 relative z-10">
          {[32, 45, 28, 65, 52, 38, 72, 58, 42, 68, 55, 82, 63, 75, 48, 54, 38, 62, 45, 78].map((v, i) => (
            <div key={i} className="flex-1 group/bar relative h-full flex flex-col justify-end">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-card border border-border/50 px-3 py-1.5 rounded-xl text-[10px] font-black text-primary opacity-0 group-hover/bar:opacity-100 transition-all -translate-y-2 group-hover/bar:translate-y-0 shadow-xl z-20">
                {v}
              </div>
              <div
                className={cn(
                  "w-full rounded-t-2xl transition-all duration-700 bg-gradient-to-t relative overflow-hidden",
                  i === 11 ? "from-primary to-blue-300 shadow-[0_0_30px_rgba(0,129,255,0.4)]" : "from-primary/10 to-primary/40 group-hover/bar:from-primary/30 group-hover/bar:to-primary"
                )}
                style={{ height: `${v}%` }}
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row - New Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Top Vendedores (Conversão)</h3>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground/40" />
          </div>
          <div className="space-y-5">
            {[
              { name: "GUILHERME SANTANA", rate: "84%", sales: 12 },
              { name: "TATIANE MARIA", rate: "79%", sales: 18 },
              { name: "MATEUS RONALD", rate: "72%", sales: 9 },
            ].map((v, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/10 border border-border/20 group hover:bg-secondary/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">{i+1}</div>
                  <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{v.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-black text-emerald-500">{v.rate}</span>
                  <p className="text-[9px] font-black text-muted-foreground uppercase opacity-40">{v.sales} vendas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0081FF] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h3 className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] mb-4">Meta Mensal da Equipe</h3>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl font-black text-white tracking-tighter">78%</span>
              <span className="text-sm font-black text-white/60 uppercase tracking-widest">Concluída</span>
            </div>
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-white rounded-full w-[78%] shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
            </div>
            <p className="text-[11px] font-bold text-white/80 leading-relaxed italic">
              "Faltam apenas R$ 12.400 para atingirmos o recorde histórico de faturamento."
            </p>
          </div>
          <Zap className="absolute bottom-[-20%] right-[-5%] w-48 h-48 text-white/5 rotate-12 transition-transform group-hover:scale-110" />
        </div>
      </div>
    </div>
  );
}
