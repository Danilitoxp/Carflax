import { TrendingUp, Wallet, Eye, CheckSquare, Download } from "lucide-react"
import { cn } from "@/lib/utils"

const stats = [
  {
    title: "Ganhos Totais",
    value: "R$ 15.020",
    change: "+30.6%",
    icon: Wallet,
    color: "blue",
  },
  {
    title: "Visualizaes",
    value: "290K+",
    change: "+30.6%",
    icon: Eye,
    color: "amber",
  },
  {
    title: "Tarefas Totais",
    value: "839",
    change: "Novo",
    icon: CheckSquare,
    color: "emerald",
  },
  {
    title: "Downloads",
    value: "2,067",
    change: "+10.2%",
    icon: Download,
    color: "rose",
  },
]

export function StatCards() {
  return (
    <div className="flex flex-col gap-6">
      {stats.map((stat, i) => (
        <div key={i} className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className={cn(
              "p-2.5 rounded-xl",
              stat.color === "blue" ? "bg-blue-500/10 text-blue-500" :
              stat.color === "amber" ? "bg-amber-500/10 text-amber-500" :
              stat.color === "emerald" ? "bg-emerald-500/10 text-emerald-500" :
              "bg-rose-500/10 text-rose-500"
            )}>
              <stat.icon className="w-5 h-5" />
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
            </button>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
            <div className="flex items-end justify-between">
              <h4 className="text-2xl font-bold text-foreground">{stat.value}</h4>
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                <TrendingUp className="w-3 h-3" />
                {stat.change}
              </div>
            </div>
          </div>

          {/* Sparkline placeholder animation */}
          <div className="mt-4 h-1 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                stat.color === "blue" ? "bg-blue-500" :
                stat.color === "amber" ? "bg-amber-500" :
                stat.color === "emerald" ? "bg-emerald-500" :
                "bg-rose-500"
              )} 
              style={{ width: `${60 + (i * 10) % 30}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  )
}
