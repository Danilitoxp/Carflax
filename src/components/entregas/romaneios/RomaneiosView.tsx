import {
  MapPin,
  Navigation,
  Trash2,
  CheckCircle2,
  Plus,
  Clock,
  RefreshCw,
  Link2,
  ChevronRight,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { apiEntregasRomaneios, apiMotoristas, apiEntregasDetalhes } from "@/lib/api";
import type { EntregaResumo } from "@/lib/api";

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
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [motoristas, setMotoristas] = useState<{ COD: string; NOME: string }[]>([]);
  const [selectedMotorista, setSelectedMotorista] = useState("");
  const [nfInput, setNfInput] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entregasRes, motoristasRes] = await Promise.all([
        apiEntregasRomaneios(),
        apiMotoristas()
      ]);

      if (entregasRes.success) {
        const mapped = entregasRes.data.map((e: EntregaResumo) => ({
          id: e.NF,
          nf: e.NF,
          client: e.CLIENTE,
          address: `${e.ENDERECO}, ${e.BAIRRO} - ${e.CIDADE}`,
          status: "pending" as const,
          value: "R$ 0,00", // Valor não vem na VW_ROMANEIOS por padrão em Gestão-de-Tempo
        }));
        setDeliveries(mapped);
      }

      if (motoristasRes.success) {
        setMotoristas(motoristasRes.motoristas);
      }
    } catch (error) {
      console.error("Erro ao buscar entregas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLancar = async () => {
    if (!nfInput) return;
    try {
      setLoading(true);
      const res = await apiEntregasDetalhes(nfInput);
      
      if (res.success && res.data) {
        const e = res.data;
        const newDelivery: Delivery = {
          id: e.NF,
          nf: e.NF,
          client: e.CLIENTE,
          address: `${e.ENDERECO}, ${e.BAIRRO} - ${e.CIDADE}`,
          status: "pending",
          value: "R$ 0,00",
        };
        
        setDeliveries(prev => {
          // Evitar duplicados
          if (prev.some(d => d.nf === e.NF)) return prev;
          return [newDelivery, ...prev];
        });

        alert(`NF ${nfInput} lançada com sucesso!`);
        setNfInput("");
      } else {
        alert("NF não encontrada no banco de dados.");
      }
    } catch (error) {
      console.error("Erro ao lançar NF:", error);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/motorista?v=${selectedMotorista || "geral"}`;
    navigator.clipboard.writeText(url);
    alert("Link do motorista copiado para o clipboard!");
  };

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
            <button 
              onClick={fetchData}
              className="h-8 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              {loading ? "Carregando..." : "Importar de Hoje"}
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
              value={nfInput}
              onChange={(e) => setNfInput(e.target.value)}
              placeholder="Digite o número da NF para lançar..."
              className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-700 placeholder:text-slate-300 outline-none"
            />
          </div>

          <div className="w-px h-6 bg-slate-100" />

          <div className="flex-1 flex items-center gap-2 px-2">
            <UserIcon className="w-3.5 h-3.5 text-slate-400" />
            <select 
              value={selectedMotorista}
              onChange={(e) => setSelectedMotorista(e.target.value)}
              className="flex-1 bg-transparent border-none text-[11px] font-black text-slate-500 outline-none cursor-pointer appearance-none uppercase tracking-tight"
            >
              <option value="">Selecionar Motorista</option>
              {motoristas.map(m => (
                <option key={m.COD} value={m.COD}>{m.NOME}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleLancar}
            disabled={!nfInput}
            className="h-9 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-600/10 flex items-center gap-2 active:scale-95"
          >
            Lançar Entrega
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-4">
        {/* DRIVER ACTIVE ROMANEIO (Tiny Style) */}
        {deliveries.length > 0 ? (
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
                    <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Status da Frota</h4>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-black tracking-widest uppercase">
                      {deliveries.length} ENTREGAS HOJE
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Monitorando movimentações do dia</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopyLink}
                  className="h-8 px-3 bg-white border border-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Copiar Link Motorista
                </button>
                <button className="h-8 px-4 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10">
                  <Navigation className="w-3.5 h-3.5" />
                  Rastrear Tudo
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
        ) : (
          <div className="bg-white border border-slate-200 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <Navigation className="w-6 h-6 text-slate-300" />
            </div>
            <h3 className="text-[14px] font-black text-slate-900 uppercase">Nenhum Romaneio Ativo</h3>
            <p className="text-[11px] font-bold text-slate-400 max-w-[200px] mt-1 uppercase">Lance uma NF acima para iniciar o monitoramento de entregas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
