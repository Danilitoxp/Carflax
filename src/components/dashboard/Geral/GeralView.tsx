import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  Users, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HeroBanner } from "./HeroBanner";



function AlertItem({ type, title, description, time }: { type: 'danger' | 'warning' | 'info' | 'success', title: string, description: string, time: string }) {
  const colors = {
    danger: "bg-rose-50 border-rose-100 text-rose-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
    info: "bg-blue-50 border-blue-100 text-blue-700",
    success: "bg-emerald-50 border-emerald-100 text-emerald-700",
  };

  const icons = {
    danger: <AlertCircle className="w-4 h-4" />,
    warning: <AlertCircle className="w-4 h-4" />,
    info: <AlertCircle className="w-4 h-4" />,
    success: <CheckCircle2 className="w-4 h-4" />,
  };

  return (
    <div className={cn("p-3 rounded-lg border flex gap-3 items-start", colors[type])}>
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <h4 className="text-xs font-bold truncate">{title}</h4>
          <span className="text-[9px] font-medium opacity-70 shrink-0">{time}</span>
        </div>
        <p className="text-[11px] opacity-80 leading-tight mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function ActivityItem({ title, date, action }: { title: string, date: string, action: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/20 px-1 transition-colors">
      <div className="min-w-0 pr-4">
        <p className="text-xs font-bold text-foreground truncate">{title}</p>
        <p className="text-[10px] text-muted-foreground">{date}</p>
      </div>
      <button className="text-[10px] font-bold text-primary hover:underline shrink-0 uppercase tracking-wider">
        {action}
      </button>
    </div>
  );
}

export function GeralView() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide pt-4">
        {/* Simplified Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
           <div className="flex bg-white rounded-lg border border-border p-1 shadow-sm">
            {['Hoje', '7 dias', '30 dias', 'Este Mês'].map((p) => (
              <button key={p} className={cn(
                "px-4 py-1.5 text-[10px] font-bold rounded-md transition-all",
                p === 'Hoje' ? "bg-secondary text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
                {p}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 gap-2 text-[10px] font-bold px-4 rounded-lg bg-white shadow-sm border-border">
              <Filter className="w-3.5 h-3.5" />
              FILTRAR
            </Button>
            <Button className="h-9 bg-primary hover:bg-primary/90 text-white gap-2 text-[10px] font-bold px-4 rounded-lg shadow-sm">
              <Calendar className="w-3.5 h-3.5" />
              PERÍODO
            </Button>
          </div>
        </div>

        {/* Hero Banner instead of KPI Grid */}
        <HeroBanner />

        {/* Charts and Alerts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Main Chart Section */}
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-tight">Faturamento por Período</h3>
                  <p className="text-[10px] text-muted-foreground font-medium">Comparativo de performance diária</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground">Faturamento</span>
                  </div>
                </div>
              </div>
              
              {/* Mock Area Chart - Simple SVG for performance and no deps */}
              <div className="h-64 w-full relative group">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.15 }} />
                      <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0 }} />
                    </linearGradient>
                  </defs>
                  {/* Grid Lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line key={i} x1="0" y1={i * 50} x2="800" y2={i * 50} stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />
                  ))}
                  {/* Data Path */}
                  <path 
                    d="M0,180 L80,140 L160,160 L240,100 L320,120 L400,60 L480,80 L560,40 L640,90 L720,50 L800,70" 
                    fill="none" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth="3" 
                    className="transition-all duration-1000 ease-out"
                  />
                  <path 
                    d="M0,180 L80,140 L160,160 L240,100 L320,120 L400,60 L480,80 L560,40 L640,90 L720,50 L800,70 L800,200 L0,200 Z" 
                    fill="url(#grad)" 
                  />
                  {/* Points */}
                  {[0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 800].map((x, i) => (
                    <circle key={i} cx={x} cy={[180, 140, 160, 100, 120, 60, 80, 40, 90, 50, 70][i]} r="4" fill="white" stroke="hsl(var(--primary))" strokeWidth="2" className="cursor-pointer hover:r-6 transition-all" />
                  ))}
                </svg>
                {/* Labels */}
                <div className="flex justify-between mt-4">
                  {['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map(h => (
                    <span key={h} className="text-[10px] font-bold text-muted-foreground">{h}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-tight">Vendas por Categoria</h3>
                  <button className="text-[10px] font-bold text-primary uppercase">Ver todos</button>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Pneus & Rodas", value: 34500, percentage: 85, color: "bg-blue-500" },
                    { label: "Motores & Peças", value: 21200, percentage: 55, color: "bg-emerald-500" },
                    { label: "Acessórios", value: 12400, percentage: 32, color: "bg-amber-500" },
                    { label: "Lubrificantes", value: 8900, percentage: 22, color: "bg-rose-500" },
                  ].map((cat, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[11px] font-bold">
                        <span className="text-muted-foreground uppercase">{cat.label}</span>
                        <span className="text-foreground">R$ {cat.value.toLocaleString()}</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", cat.color)} 
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-tight">Vendas por Canal</h3>
                  <button className="text-[10px] font-bold text-primary uppercase">Filtros</button>
                </div>
                <div className="flex items-center justify-center h-48 relative">
                   {/* Simple CSS Circle Chart */}
                   <div className="relative w-32 h-32 rounded-full border-[12px] border-secondary flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-xl font-black text-foreground">R$ 77k</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Total</p>
                      </div>
                      {/* CSS Segments would be complex, use a simple visual representation or just list */}
                   </div>
                   <div className="ml-8 space-y-2">
                      {[
                        { label: "WhatsApp", val: "45%", dot: "bg-emerald-500" },
                        { label: "Loja Física", val: "30%", dot: "bg-blue-500" },
                        { label: "E-commerce", val: "25%", dot: "bg-amber-500" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", item.dot)} />
                          <span className="text-[11px] font-medium text-muted-foreground w-20">{item.label}</span>
                          <span className="text-[11px] font-bold text-foreground">{item.val}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Alerts & Activities */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 shadow-sm flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-tight flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  Alertas Operacionais
                </h3>
                <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[9px] font-black">4 CRÍTICOS</span>
              </div>
              <div className="space-y-3 flex-1">
                <AlertItem 
                  type="danger" 
                  title="Produtos sem estoque" 
                  description="8 itens de alta rotatividade estão com estoque zerado no CD principal." 
                  time="há 5min" 
                />
                <AlertItem 
                  type="warning" 
                  title="Pedidos atrasados" 
                  description="12 pedidos de venda estão com prazo de entrega expirado hoje." 
                  time="há 12min" 
                />
                <AlertItem 
                  type="danger" 
                  title="Problema Financeiro" 
                  description="Conciliação bancária do Bradesco não foi concluída corretamente." 
                  time="há 1h" 
                />
                <AlertItem 
                  type="info" 
                  title="Pendências Importantes" 
                  description="Aprovação de crédito pendente para Cliente: Carflax SP." 
                  time="há 2h" 
                />
              </div>
              <Button variant="ghost" className="w-full mt-4 text-[11px] font-bold hover:bg-secondary">VER TODOS OS ALERTAS</Button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-tight flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Atividades Recentes
                </h3>
              </div>
              <div className="space-y-1">
                <ActivityItem 
                  title="Novo Pedido #12458 - Cliente ABC" 
                  date="há 2 minutos por Maria Silva" 
                  action="VER" 
                />
                <ActivityItem 
                  title="Pagamento Confirmado - Pedido #12330" 
                  date="há 8 minutos pelo Sistema" 
                  action="RECIBO" 
                />
                <ActivityItem 
                  title="Estoque Atualizado - Filtro de Óleo X" 
                  date="há 15 minutos por João Carlos" 
                  action="DETALHES" 
                />
                <ActivityItem 
                  title="Novo Lead Qualificado - WhatsApp" 
                  date="há 22 minutos pelo Bot" 
                  action="ATENDER" 
                />
                <ActivityItem 
                  title="Nota Fiscal Emitida - Pedido #12290" 
                  date="há 45 minutos por Sistema" 
                  action="DANFE" 
                />
              </div>
              <Button variant="ghost" className="w-full mt-4 text-[11px] font-bold hover:bg-secondary">HISTÓRICO COMPLETO</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
