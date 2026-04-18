import { useState } from "react";
import {
  Search,
  CheckCircle2,
  Calendar,
  Download,
  FileText,
  ChevronDown,
  Truck,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/MiniCalendar";
import type { Delivery } from "../romaneios/RomaneiosView";

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
  const [selectedPeriod, setSelectedPeriod] = useState("Hoje: 17 de Abr, 2026");
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);

  const [romaneiosHistory, setRomaneiosHistory] = useState<RomaneioConcluido[]>([]);

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
    <div className="flex-1 flex flex-col gap-4 pt-0 pb-6 px-0 overflow-hidden bg-[#F8FAFC]">
      {/* COMPACT TOOLBAR */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Entregas Concluídas</h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              Histórico Agrupado por Romaneios Finalizados
            </p>
          </div>

          <button className="h-8 px-3 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm shadow-blue-600/10 active:scale-95">
            <FileText className="w-3.5 h-3.5" />
            Exportar Geral
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="flex flex-col md:flex-row items-center gap-2">
          <div className="flex-1 w-full relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar Romaneio, NF, Motorista ou Cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all"
            />
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
              className="flex items-center justify-between gap-3 h-10 px-4 rounded-xl bg-white border border-slate-200 text-[10px] font-black text-slate-500 hover:border-blue-200 transition-all min-w-[200px]"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span className="uppercase tracking-tight">{selectedPeriod}</span>
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isDateMenuOpen && "rotate-180")} />
            </button>

            {isDateMenuOpen && (
              <div className="absolute top-full right-0 mt-2 z-[100] animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-1 overflow-hidden">
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
        {filteredRomaneios.length > 0 ? (
          filteredRomaneios.map((rom) => (
            <div key={rom.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              {/* Romaneio Header Group */}
              <div className="p-3 px-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100/50">
                      <Truck className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-900 tracking-tighter uppercase leading-none">{rom.id}</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{rom.date}</span>
                    </div>
                  </div>

                  <div className="h-6 w-px bg-slate-200" />

                  <div className="flex items-center gap-2">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{rom.driver}</span>
                  </div>

                  <div className="h-6 w-px bg-slate-200" />

                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Entregas:</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-black">{rom.deliveredCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none block mb-0.5">Total Romaneio</span>
                    <span className="text-[11px] font-black text-emerald-600 tracking-tighter leading-none">{rom.totalValue}</span>
                  </div>
                  <button className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-all">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nested Table for Deliveries */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white">
                    <th className="py-2.5 px-6 text-[8px] font-black text-slate-300 uppercase tracking-widest">NF</th>
                    <th className="py-2.5 px-6 text-[8px] font-black text-slate-300 uppercase tracking-widest">Destinatário / Endereço</th>
                    <th className="py-2.5 px-6 text-[8px] font-black text-slate-300 uppercase tracking-widest">Concluída</th>
                    <th className="py-2.5 px-6 text-[8px] font-black text-slate-300 uppercase tracking-widest text-right">Valor Parcial</th>
                    <th className="py-2.5 px-6 text-[8px] font-black text-slate-300 uppercase tracking-widest text-center">Docs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rom.deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="py-2.5 px-6">
                        <span className="text-[10px] font-black text-slate-600 tracking-tighter">#{delivery.nf}</span>
                      </td>
                      <td className="py-2.5 px-6">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-none mb-0.5">{delivery.client}</span>
                          <span className="text-[8px] font-bold text-slate-400 truncate max-w-[400px] uppercase tracking-tighter opacity-70 group-hover:opacity-100 transition-opacity">
                            {delivery.address}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-6">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{delivery.time}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-6 text-right">
                        <span className="text-[10px] font-black text-emerald-600 tracking-tighter">{delivery.value}</span>
                      </td>
                      <td className="py-2.5 px-6 text-center">
                        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all scale-90">
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
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl opacity-40">
            <Search className="w-10 h-10 text-slate-300 mb-3" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nenhum romaneio concluído encontrado</span>
          </div>
        )}
      </div>

    </div>
  );
}
