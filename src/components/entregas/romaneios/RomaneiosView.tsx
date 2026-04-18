import {
  MapPin,
  Navigation,
  Link as LinkIcon,
  Trash2,
  CheckCircle2,
  Plus,
  FileText,
  Clock,
  ChevronRight,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [deliveries] = useState<Delivery[]>([
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
  ]);

  return (
    <div className="flex-1 flex flex-col gap-4 pb-6 px-0 overflow-hidden bg-[#F8FAFC]">
      {/* TOOLBAR CONTROLS */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Romaneios Diários</h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              Monitoramento de Entregas em Tempo Real
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
              <FileText className="w-3.5 h-3.5" />
              Relatório Geral
            </button>
          </div>
        </div>

        {/* LANÇAMENTO FORM (Tiny Design) */}
        <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center gap-2 shadow-sm">
          <div className="flex-1 flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100/50">
              <Plus className="w-4 h-4 text-blue-600" />
            </div>
            <input
              type="text"
              placeholder="Digite o número da NF para lançar..."
              className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-700 placeholder:text-slate-300 outline-none"
            />
          </div>

          <div className="w-px h-6 bg-slate-100" />

          <div className="flex-1 flex items-center gap-2 px-2">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            <select className="flex-1 bg-transparent border-none text-[11px] font-black text-slate-500 outline-none cursor-pointer appearance-none uppercase tracking-tight">
              <option value="">Selecionar Motorista</option>
              <option value="nicholas">Nicholas Galbieri</option>
              <option value="danilo">Danilo Vieira</option>
            </select>
          </div>

          <button className="h-9 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-600/10 flex items-center gap-2 active:scale-95">
            Lançar Entrega
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
        {/* DRIVER ACTIVE ROMANEIO (Tiny Style) */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Nicholas"
                  className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm object-cover"
                  alt="Motorista"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Nicholas Galbieri</h4>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black tracking-widest uppercase">
                    EM TRÂNSITO
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase border-r border-slate-200 pr-2 tracking-tight">ROM-250413</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">PLACA: ABC-1234</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="h-8 px-4 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10">
                <Navigation className="w-3.5 h-3.5" />
                Rastrear
              </button>
              <button className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all">
                <LinkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">NF</th>
                  <th className="py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente / Endereço</th>
                  <th className="py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Valor</th>
                  <th className="py-2.5 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {delivery.status === "completed" ? (
                          <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center border border-amber-100/50">
                            <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                          </div>
                        )}
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          delivery.status === "completed" ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {delivery.status === "completed" ? delivery.time : "AGUARD."}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-black text-slate-700 tracking-tighter">#{delivery.nf}</span>
                    </td>
                    <td className="py-3 px-4 max-w-[400px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none mb-0.5">{delivery.client}</span>
                        <div className="flex items-center gap-1.5 opacity-60">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-[9px] font-bold text-slate-500 uppercase truncate tracking-tight">{delivery.address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[11px] font-black text-emerald-600 tracking-tighter">{delivery.value}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5 transition-all">
                        {delivery.image && (
                          <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600" title="Ver Comprovante">
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button className="p-1.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
