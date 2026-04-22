import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface RFMCell {
  label: string;
  color: string;
  description: string;
}

interface RFMDataPoint {
  cliente_id: string;
  nome_cliente: string;
  recencia_score: number; // 1-5
  fv_score: number; // 1-5 (average of F and V)
}

interface RFMMatrixProps {
  data?: RFMDataPoint[];
  onCellClick?: (label: string, clients: RFMDataPoint[]) => void;
}

const RFM_MAP: Record<string, RFMCell> = {
  "1-5": { label: "Não posso perdê-los", color: "bg-[#FF6B5B]", description: "Eram ótimos clientes e pararam de comprar." },
  "2-5": { label: "Em risco", color: "#FFC107", description: "Clientes que compravam muito e não compram há algum tempo." },
  "3-5": { label: "Clientes leais", color: "#45D09E", description: "Compram com frequência e valores altos." },
  "4-5": { label: "Clientes leais", color: "#45D09E", description: "" },
  "5-5": { label: "Campeões", color: "#5D9CEC", description: "Compram recentemente, com frequência e altos valores." },

  "1-4": { label: "Em risco", color: "#FFC107", description: "" },
  "2-4": { label: "Em risco", color: "#FFC107", description: "" },
  "3-4": { label: "Clientes leais", color: "#45D09E", description: "" },
  "4-4": { label: "Clientes leais", color: "#45D09E", description: "" },
  "5-4": { label: "Clientes leais", color: "#45D09E", description: "" },

  "1-3": { label: "Em risco", color: "#FFC107", description: "" },
  "2-3": { label: "Em risco", color: "#FFC107", description: "" },
  "3-3": { label: "Precisam de atenção", color: "#6C757D", description: "Frequência e recência média." },
  "4-3": { label: "Lealdade potencial", color: "#B8D4F5", description: "Novos clientes com bom potencial." },
  "5-3": { label: "Lealdade potencial", color: "#B8D4F5", description: "" },

  "1-2": { label: "Precisam de atenção", color: "#6C757D", description: "" },
  "2-2": { label: "Hibernando", color: "#E0E0E0", description: "Última compra há muito tempo e pouco valor." },
  "3-2": { label: "Prestes a Hibernar", color: "#BDBDBD", description: "Baixa recência e frequência." },
  "4-2": { label: "Lealdade potencial", color: "#B8D4F5", description: "" },
  "5-2": { label: "Lealdade potencial", color: "#B8D4F5", description: "" },

  "1-1": { label: "Precisam de atenção", color: "#6C757D", description: "" },
  "2-1": { label: "Perdido", color: "#212529", description: "Clientes que não compram há muito tempo." },
  "3-1": { label: "Prestes a Hibernar", color: "#BDBDBD", description: "" },
  "4-1": { label: "Promissor", color: "#7F7BFF", description: "Compraram recentemente mas não gastaram muito." },
  "5-1": { label: "Recentes", color: "#E0E0E0", description: "Compraram recentemente pela primeira vez." },
};

// Grid keys mapped as [Recency, FM]
const GRID_KEYS = [
  ["1-5", "2-5", "3-5", "4-5", "5-5"], // Y=5
  ["1-4", "2-4", "3-4", "4-4", "5-4"], // Y=4
  ["1-3", "2-3", "3-3", "4-3", "5-3"], // Y=3
  ["1-2", "2-2", "3-2", "4-2", "5-2"], // Y=2
  ["1-1", "2-1", "3-1", "4-1", "5-1"], // Y=1
];

const LEGEND = [
  { label: "Não posso perdê-los", color: "bg-[#FF6B5B]" },
  { label: "Em risco", color: "bg-[#FFC107]" },
  { label: "Clientes leais", color: "bg-[#45D09E]" },
  { label: "Campeões", color: "bg-[#5D9CEC]" },
  { label: "Precisam de atenção", color: "bg-[#6C757D]" },
  { label: "Lealdade potencial", color: "bg-[#B8D4F5]" },
  { label: "Perdido", color: "bg-[#212529]" },
  { label: "Hibernando", color: "bg-[#E0E0E0]" },
  { label: "Prestes a Hibernar", color: "bg-[#BDBDBD]" },
  { label: "Promissor", color: "bg-[#7F7BFF]" },
  { label: "Recentes", color: "bg-[#E0E0E0]" },
];

export function RFMMatrix({ data = [], onCellClick }: RFMMatrixProps) {
  const cellCounts = useMemo(() => {
    const counts: Record<string, RFMDataPoint[]> = {};
    data.forEach(item => {
      const key = `${item.recencia_score}-${item.fv_score}`;
      if (!counts[key]) counts[key] = [];
      counts[key].push(item);
    });
    return counts;
  }, [data]);

  return (
    <div className="flex flex-col lg:flex-row gap-12 items-start justify-center p-8 bg-card border border-border rounded-3xl shadow-xl animate-in fade-in zoom-in duration-500">
      {/* Chart Area */}
      <div className="relative flex flex-col items-center">
        <div className="absolute -left-16 top-1/2 -rotate-90 origin-center whitespace-nowrap text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          Frequência e Valor (média)
        </div>

        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          Recência
        </div>

        <div className="relative p-2 bg-background border border-border rounded-xl">
          {/* Arrow Y */}
          <div className="absolute -left-4 -top-4 bottom-0 w-px bg-muted-foreground/30">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-muted-foreground/30" />
          </div>
          {/* Arrow X */}
          <div className="absolute -left-4 -bottom-4 right-0 h-px bg-muted-foreground/30">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full border-4 border-transparent border-l-muted-foreground/30" />
          </div>

          <div className="grid grid-cols-5 gap-2">
            {GRID_KEYS.map((row, yIdx) => (
              row.map((key, xIdx) => {
                const cell = RFM_MAP[key];
                const yVal = 5 - yIdx;
                const xVal = xIdx + 1;
                const clientsInCell = cellCounts[key] || [];
                const count = clientsInCell.length;

                return (
                  <div
                    key={`${xIdx}-${yIdx}`}
                    onClick={() => onCellClick?.(cell.label, clientsInCell)}
                    className={cn(
                      "w-20 h-20 sm:w-24 sm:h-24 rounded-lg flex flex-col items-center justify-center p-2 text-center transition-all hover:scale-105 hover:shadow-lg cursor-pointer group relative",
                      cell.color.startsWith("bg-") ? cell.color : ""
                    )}
                    style={!cell.color.startsWith("bg-") ? { backgroundColor: cell.color } : {}}
                  >
                    {xIdx === 0 && (
                      <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">{yVal}</span>
                    )}
                    {yIdx === 4 && (
                      <span className="absolute left-1/2 -bottom-6 -translate-x-1/2 text-[10px] font-bold text-muted-foreground">{xVal}</span>
                    )}

                    <span className="text-xl font-black text-white/90 group-hover:scale-110 transition-transform tabular-nums">
                      {count}
                    </span>
                    <span className="text-[7px] font-black uppercase text-white/60 tracking-tighter mt-1 leading-tight">
                      {count === 1 ? "Cliente" : "Clientes"}
                    </span>

                    {/* Tooltip on Hover */}
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-2 z-20 pointer-events-none">
                      <span className="text-[8px] font-black text-white uppercase leading-tight">
                        {cell.label}
                      </span>
                    </div>
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </div>

      {/* Legend Area */}
      <div className="flex flex-col gap-4 min-w-[240px]">
        <h3 className="text-xs font-black text-foreground uppercase tracking-widest border-b border-border pb-3 mb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Segmentação RFV
        </h3>
        <div className="grid grid-cols-1 gap-1">
          {LEGEND.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3 p-2 hover:bg-secondary/50 rounded-xl transition-all cursor-pointer group">
              <div className={cn("w-5 h-5 rounded-md shrink-0 shadow-sm transition-transform group-hover:scale-110", item.color)} />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight group-hover:text-foreground transition-colors">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
          <p className="text-[9px] font-bold text-primary uppercase tracking-widest mb-2">Resumo da Carteira</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-muted-foreground uppercase">Base Total</span>
              <span className="text-xs font-black text-foreground">{data.length}</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
