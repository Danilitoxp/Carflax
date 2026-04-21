import { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  Calendar,
  Download,
  FileText,
  ChevronDown,
  Truck,
  User as UserIcon,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import type { Delivery } from "../romaneios/RomaneiosView";
import { supabase } from "@/lib/supabase";

interface RomaneioConcluido {
  id: string;
  driver: string;
  date: string;
  deliveredCount: number;
  totalValue: string;
  deliveries: Delivery[];
}

export function ConcluidasView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("Últimas 50 entregas");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const [romaneiosHistory, setRomaneiosHistory] = useState<RomaneioConcluido[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar entregas concluídas no Supabase
      const { data, error } = await supabase
        .from("entregas")
        .select("*, romaneios(*)")
        .eq("status", "completed")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const groups: Record<string, RomaneioConcluido> = {};
        
        data.forEach((e: any) => {
          const romId = e.romaneio_id || "sem-romaneio";
          if (!groups[romId]) {
            const romDate = e.romaneios?.date || e.updated_at.split('T')[0];
            const dateParts = romDate.split('-');
            const formattedDateCode = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;
            const romNum = String(e.romaneios?.rom_number || 0).padStart(3, '0');

            groups[romId] = {
              id: e.romaneios?.rom_number ? `RM-${formattedDateCode}-${romNum}` : `RESIDUAL-${romId.slice(0,4)}`,
              driver: e.romaneios?.driver || "Motorista Externo",
              date: new Date(romDate).toLocaleDateString("pt-BR"),
              deliveredCount: 0,
              totalValue: "R$ 0,00",
              deliveries: []
            };
          }
          
          const val = Number(e.value || 0);
          groups[romId].deliveries.push({
            id: e.id,
            nf: e.nf,
            client: e.client,
            address: e.address,
            status: "completed",
            time: new Date(e.updated_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
            value: `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            instrucoes: e.instructions || ""
          });
          
          groups[romId].deliveredCount++;
          
          // Somar valor total
          const currentTotal = parseFloat(groups[romId].totalValue.replace("R$ ", "").replace(".", "").replace(",", ".")) || 0;
          const newTotal = currentTotal + val;
          groups[romId].totalValue = `R$ ${newTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        });

        setRomaneiosHistory(Object.values(groups));
      }
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRomaneios = romaneiosHistory.filter(rom =>
    rom.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rom.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rom.deliveries.some(d =>
      d.nf.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.client.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const handleRangeSelect = (start: Date, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);

    if (start && end) {
      const startStr = start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      const endStr = end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
      setSelectedPeriod(`${startStr} até ${endStr}`);
      setIsDateMenuOpen(false);
    } else {
      setSelectedPeriod(`${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}...`);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 pt-0 pb-6 px-0 overflow-hidden bg-background">
      {/* COMPACT TOOLBAR */}
      <div className="flex flex-col gap-3 shrink-0 px-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight leading-none">Entregas Concluídas</h2>
            <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Histórico Agrupado por Romaneios Finalizados
            </p>
          </div>

          <button 
            onClick={fetchData}
            className="h-8 px-3 bg-secondary/50 border border-border text-foreground rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-secondary transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            {loading ? "Carregando..." : "Atualizar"}
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col md:flex-row items-center gap-2">
          <div className="flex-1 w-full relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar Romaneio, NF, Motorista ou Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/40 border border-border rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all"
            />
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className="flex items-center justify-between gap-3 h-10 px-4 rounded-xl bg-secondary/40 border border-border text-[10px] font-black text-muted-foreground hover:border-blue-500/30 transition-all min-w-[200px]"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span className="uppercase tracking-tight">{selectedPeriod}</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/50 transition-transform", isDateMenuOpen && "rotate-180")} />
            </button>

            {isDateMenuOpen && (
              <div className="absolute top-full right-0 mt-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-card border border-border rounded-2xl shadow-2xl p-1 overflow-hidden">
                  <MiniCalendar
                    mode="range"
                    onSelectRange={handleRangeSelect}
                    initialStartDate={startDate}
                    initialEndDate={endDate}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GROUPED LIST OF ROMANEIOS */}
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-secondary" />
                    <div className="space-y-2">
                      <div className="h-3 w-32 bg-secondary/50 rounded" />
                      <div className="h-2 w-16 bg-secondary/30 rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-20 bg-secondary/50 rounded" />
                </div>
                <div className="space-y-2 border-t border-border pt-4">
                  {[1, 2].map(j => (
                    <div key={j} className="flex items-center justify-between py-2">
                      <div className="h-2 w-1/4 bg-secondary/20 rounded" />
                      <div className="h-2 w-1/3 bg-secondary/20 rounded" />
                      <div className="h-2 w-12 bg-secondary/20 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredRomaneios.length > 0 ? (
          filteredRomaneios.map((rom) => (
            <div key={rom.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:border-blue-500/20 transition-all">
              {/* Romaneio Header Group */}
              <div className="p-3 px-4 bg-secondary/30 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center border border-blue-600/10">
                      <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-foreground tracking-tighter uppercase leading-none">{rom.id}</span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{rom.date}</span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-border" />

                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] font-black text-foreground/70 uppercase tracking-tight">{rom.driver}</span>
                  </div>

                  <div className="h-6 w-px bg-border" />

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Entregas:</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary text-foreground text-[9px] font-black">{rom.deliveredCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none block mb-0.5">Total Romaneio</span>
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none">{rom.totalValue}</span>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-all">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nested Table for Deliveries */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/10">
                    <th className="py-2.5 px-6 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">NF</th>
                    <th className="py-2.5 px-6 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">Destinatário / Endereço</th>
                    <th className="py-2.5 px-6 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">Concluída</th>
                    <th className="py-2.5 px-6 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest text-right">Valor Parcial</th>
                    <th className="py-2.5 px-6 text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest text-center">Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rom.deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-secondary/40 transition-colors group">
                      <td className="py-2.5 px-6">
                        <span className="text-[10px] font-black text-muted-foreground tracking-tighter">#{delivery.nf}</span>
                      </td>
                      <td className="py-2.5 px-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-foreground uppercase tracking-tight leading-none mb-0.5">{delivery.client}</span>
                          <span className="text-[8px] font-bold text-muted-foreground truncate max-w-[400px] uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
                            {delivery.address}
                          </span>
                          {delivery.instrucoes && (
                            <div className="flex items-center gap-1.5 mt-1.5 p-1 px-2 bg-amber-500/10 border border-amber-500/20 rounded-md self-start">
                              <span className="text-[7.5px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest italic">{delivery.instrucoes}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-6">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{delivery.time}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-6 text-right">
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">{delivery.value}</span>
                      </td>
                      <td className="py-2.5 px-6 text-center">
                        <button className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-blue-500 transition-all scale-90">
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-card/30 border border-border rounded-xl opacity-40">
            <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">
              {loading ? "Carregando histórico..." : "Nenhum romaneio concluído encontrado"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
