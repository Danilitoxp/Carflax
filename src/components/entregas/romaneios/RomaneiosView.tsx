import {
  MapPin,
  Navigation,
  Trash2,
  CheckCircle2,
  Plus,
  Clock,
  Link2,
  ChevronRight,
  User as UserIcon,
  Package,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { apiMotoristas, apiAdminSQL } from "@/lib/api";
import { supabase } from "@/lib/supabase";

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
  instrucoes?: string;
  driverName?: string;
  romaneio_id?: string;
  driverCode?: string;
  romNumber?: number;
}

export function RomaneiosView() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [motoristas, setMotoristas] = useState<{ COD: string; NOME: string }[]>([]);
  const [selectedMotorista, setSelectedMotorista] = useState<string>("");
  const [currentRomaneioId, setCurrentRomaneioId] = useState<string | null>(null);
  const [nfInput, setNfInput] = useState("");
  const [driverAvatars, setDriverAvatars] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  const now = new Date();
  const hoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    fetchData();
  }, [selectedMotorista]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const motoristasRes = await apiMotoristas();
      if (motoristasRes.success) {
        setMotoristas(motoristasRes.motoristas);
      }
      
      let romIds: string[] = [];

      // 1. Buscar romaneios de hoje
      const query = supabase.from("romaneios").select("id, driver, motorista_cod, rom_number").eq("date", hoje);
      
      if (selectedMotorista) {
        query.eq("motorista_cod", selectedMotorista);
      }

      const { data: roms } = await query;

      if (roms && roms.length > 0) {
        romIds = roms.map(r => r.id);
        if (selectedMotorista && roms.length === 1) {
          setCurrentRomaneioId(roms[0].id);
        }
      } else {
        setCurrentRomaneioId(null);
      }

      // 2. Buscar entregas vinculadas aos romaneios encontrados
      if (romIds.length > 0) {
        const { data: lancados } = await supabase
          .from("entregas")
          .select("*, romaneios(driver, motorista_cod, rom_number)")
          .in("romaneio_id", romIds);

        if (lancados) {
          setDeliveries(lancados.map(d => ({
            id: d.id,
            nf: d.nf,
            client: d.client,
            address: d.address,
            status: d.status,
            value: `R$ ${Number(d.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            instrucoes: d.instructions || "",
            driverName: d.romaneios?.driver,
            driverCode: d.romaneios?.motorista_cod,
            romaneio_id: d.romaneio_id,
            romNumber: d.romaneios?.rom_number
          })));
        }
      } else {
        setDeliveries([]);
      }


      // Buscar fotos dos usuários/motoristas
      const { data: users } = await supabase.from("usuarios").select("operator_code, avatar");
      if (users) {
        const avatarMap: Record<string, string> = {};
        users.forEach(u => {
          if (u.operator_code) avatarMap[u.operator_code] = u.avatar;
        });
        setDriverAvatars(avatarMap);
      }
    } catch (error) {
      console.error("Erro ao buscar entregas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLancar = async () => {
    try {
      const sql = `
        SELECT 
          GER_NUMDOC as NF,
          GER_NOMCON as CLIENTE,
          GER_ENDCON as ENDERECO,
          GER_BAICON as BAIRRO,
          GER_CIDCON as CIDADE,
          GER_VLRCON as VALOR,
          GER_MENEX2 as OBS
        FROM MOVGER 
        WHERE GER_NUMDOC = '${nfInput}'
        LIMIT 1
      `;
      
      const res = await apiAdminSQL(sql);
      
      if (res.success && res.data && res.data.length > 0) {
        const e = res.data[0];
        
        const formattedValue = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(e.VALOR || 0));
        const motorista = motoristas.find(m => m.COD === selectedMotorista);
        const driverName = motorista ? motorista.NOME : (selectedMotorista || "Geral");

        let romId = currentRomaneioId;

        // 1. Tentar encontrar o romaneio no banco se não estiver no estado local
        if (!romId) {
          const { data: existingRom } = await supabase
            .from("romaneios")
            .select("id")
            .eq("motorista_cod", selectedMotorista || "geral")
            .eq("date", hoje)
            .maybeSingle();
          
          if (existingRom) {
            romId = existingRom.id;
            setCurrentRomaneioId(romId);
          }
        }

        // 2. Se realmente não existir, cria um novo
        if (!romId) {
          const { data: newRom, error: romErr } = await supabase
            .from("romaneios")
            .insert([{ 
              driver: driverName, 
              motorista_cod: selectedMotorista || "geral",
              date: hoje, 
              status: 'em_andamento' 
            }])
            .select()
            .single();
          
          if (romErr) throw romErr;
          romId = newRom.id;
          setCurrentRomaneioId(romId);
        }

        // 3. Preparar a entrega
        const newDelivery: Delivery = {
          id: e.NF,
          nf: e.NF,
          client: e.CLIENTE,
          address: `${e.ENDERECO}, ${e.BAIRRO} - ${e.CIDADE}`,
          status: "pending",
          value: formattedValue,
          instrucoes: e.OBS || "",
          romaneio_id: romId
        };

        const cleanValue = Number(String(e.VALOR).replace(',', '.')) || 0;

        const { error: insError } = await supabase
          .from("entregas")
          .insert([{
            romaneio_id: romId,
            nf: e.NF,
            client: e.CLIENTE,
            address: `${e.ENDERECO}, ${e.BAIRRO} - ${e.CIDADE}`,
            value: cleanValue,
            status: "pending",
            instructions: e.OBS || ""
          }]);

        if (insError) throw insError;
        
        setDeliveries(prev => {
          if (prev.some(d => d.nf === e.NF)) return prev;
          return [newDelivery, ...prev];
        });

        setNfInput("");
      } else {
        alert("NF não encontrada no banco de dados.");
      }
    } catch (error) {
      console.error("Erro ao lançar NF:", error);
      alert("Erro ao conectar com o servidor.");
    }
  };

  const handleDeleteDelivery = async (nf: string, romaneioIdToDel?: string) => {
    if (!romaneioIdToDel) {
      alert("Não foi possível excluir: ID do romaneio ausente.");
      return;
    }
    if (!confirm(`Deseja remover a NF ${nf} do romaneio?`)) return;
    
    try {
      // Remover da tabela entregas
      const { error } = await supabase
        .from("entregas")
        .delete()
        .eq("nf", nf)
        .eq("romaneio_id", romaneioIdToDel);
      
      if (error) throw error;
      
      setDeliveries(prev => prev.filter(d => d.nf !== nf));
    } catch (error) {
      console.error("Erro ao remover do banco:", error);
      alert("Erro ao remover a entrega do banco de dados.");
      setDeliveries(prev => prev.filter(d => d.nf !== nf));
    }
  };

  const [selectedNfItems, setSelectedNfItems] = useState<string | null>(null);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/motorista?v=${selectedMotorista || "geral"}`;
    navigator.clipboard.writeText(url);
    alert("Link do motorista copiado para o clipboard!");
  };

  return (
    <div className="flex-1 flex flex-col gap-4 pb-6 px-0 overflow-hidden bg-background">
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tight leading-none">Romaneios Diários</h2>
            <p className="text-muted-foreground text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
              Monitoramento de Entregas em Tempo Real
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-1.5 flex items-center gap-2 shadow-sm">
          <div className="flex-1 flex items-center gap-2 px-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
              <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <input
              type="text"
              value={nfInput}
              onChange={(e) => setNfInput(e.target.value)}
              placeholder="Digite o número da NF para lançar..."
              className="flex-1 bg-transparent border-none text-[11px] font-bold text-foreground placeholder:text-muted-foreground/30 outline-none"
            />
          </div>

          <div className="w-px h-6 bg-border" />

          <div className="flex-1 flex items-center gap-2 px-2">
            <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <select 
              value={selectedMotorista}
              onChange={(e) => setSelectedMotorista(e.target.value)}
              className="flex-1 bg-transparent border-none text-[11px] font-black text-muted-foreground outline-none cursor-pointer appearance-none uppercase tracking-tight"
            >
              <option value="" className="bg-card">Selecionar Motorista</option>
              {motoristas.map(m => (
                <option key={m.COD} value={m.COD} className="bg-card">{m.NOME}</option>
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
        {loading ? (
          <div className="space-y-3">
            <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-secondary dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 bg-secondary dark:bg-slate-800 rounded" />
                  <div className="h-2 w-1/6 bg-secondary/50 dark:bg-slate-800/50 rounded" />
                </div>
              </div>
              <div className="space-y-2 border-t border-border pt-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="h-2 w-1/3 bg-secondary/30 dark:bg-slate-800/30 rounded" />
                    <div className="h-2 w-1/4 bg-secondary/30 dark:bg-slate-800/30 rounded" />
                    <div className="h-2 w-16 bg-secondary/30 dark:bg-slate-800/30 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : deliveries.length > 0 ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-secondary/20 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(() => {
                  const motoristaAtivo = motoristas.find(m => m.COD === selectedMotorista);
                  return (
                    <>
                      <div className="relative">
                        <img
                          src={driverAvatars[selectedMotorista] || driverAvatars[deliveries[0]?.driverCode || ""] || `https://api.dicebear.com/7.x/avataaars/svg?seed=${motoristaAtivo?.NOME || "geral"}`}
                          className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm object-cover bg-white"
                          alt="Motorista"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center shadow-sm">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-[12px] font-black text-foreground uppercase tracking-tight leading-none flex items-center gap-2">
                            {selectedMotorista 
                              ? (motoristaAtivo ? motoristaAtivo.NOME : "STATUS DA FROTA")
                              : (deliveries[0]?.driverName ? deliveries[0].driverName : "STATUS DA FROTA")
                            }
                            {(selectedMotorista || deliveries.length > 0) && (() => {
                              const dateParts = hoje.split('-');
                              const formattedDate = `${dateParts[2]}${dateParts[1]}${dateParts[0]}`;
                              const sequence = String(deliveries[0]?.romNumber || 0).padStart(3, '0');
                              return (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 text-[9px] font-black tracking-tight">
                                  RM-{formattedDate}-{sequence}
                                </span>
                              );
                            })()}
                          </h4>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 text-[8px] font-black tracking-widest uppercase">
                            {deliveries.length} ENTREGAS HOJE
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            {selectedMotorista 
                              ? (motoristaAtivo ? `MOTORISTA CÓD: ${motoristaAtivo.COD}` : "Monitorando movimentações do dia")
                              : (deliveries[0]?.driverCode ? `MOTORISTA CÓD: ${deliveries[0].driverCode}` : "Monitorando movimentações do dia")
                            }
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCopyLink}
                  className="h-8 px-3 bg-card border border-border text-muted-foreground rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-secondary transition-all flex items-center gap-2 shadow-sm active:scale-95"
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
                  <tr className="border-b border-border">
                    <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                    <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">NF</th>
                    <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cliente / Endereço</th>
                    <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Valor</th>
                    <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {delivery.status === "completed" ? (
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-100/50">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center border border-amber-100/50">
                              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
                            </div>
                          )}
                          <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest",
                            delivery.status === "completed" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          )}>
                            {delivery.status === "completed" ? delivery.time : "AGUARD."}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-black text-foreground tracking-tighter">#{delivery.nf}</span>
                      </td>
                      <td className="py-3 px-4 max-w-[400px]">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-foreground uppercase tracking-tight leading-none mb-0.5">{delivery.client}</span>
                            {!selectedMotorista && delivery.driverName && (
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-secondary dark:bg-slate-800 text-muted-foreground font-bold uppercase tracking-tighter">
                                {delivery.driverName.split(' ')[0]} {delivery.driverCode ? `[${delivery.driverCode}]` : ""}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 opacity-60">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-[9px] font-bold text-muted-foreground uppercase truncate tracking-tight">{delivery.address}</span>
                          </div>
                          {delivery.instrucoes && (
                            <div className="flex items-center gap-1.5 mt-1.5 p-1 px-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-100/50 dark:border-amber-900/50 rounded-md self-start">
                              <Navigation className="w-2.5 h-2.5 text-amber-500 dark:text-amber-400" />
                              <span className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest italic">{delivery.instrucoes}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[11px] font-black text-emerald-600 tracking-tighter">{delivery.value}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 transition-all">
                          <button 
                            onClick={() => setSelectedNfItems(delivery.nf)}
                            className="p-1.5 rounded-md hover:bg-blue-50 text-slate-300 hover:text-blue-600 transition-colors"
                            title="Ver Itens"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDelivery(delivery.nf, delivery.romaneio_id)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500" 
                            title="Excluir"
                          >
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
          <div className="bg-card border border-border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Navigation className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-[14px] font-black text-foreground uppercase">Nenhum Romaneio Ativo</h3>
            <p className="text-[11px] font-bold text-muted-foreground max-w-[200px] mt-1 uppercase">Lance uma NF acima para iniciar o monitoramento de entregas.</p>
          </div>
        )}
      </div>

      <ItemsModal 
        nf={selectedNfItems} 
        onClose={() => setSelectedNfItems(null)} 
      />
    </div>
  );
}

// ── MODAL DE ITENS DA NF ──────────────────────────────────────────────────
function ItemsModal({ nf, onClose }: { nf: string | null, onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (nf) fetchItems();
  }, [nf]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const sql = `
        SELECT 
          COD_ITEM as CODIGO,
          ITEM as DESCRICAO,
          QTD_ITEM as QTD,
          VALOR_UNITARIO as PRECO
        FROM VW_FATURAMENTO
        WHERE DOCUMENTO = '${nf}' OR DOCUMENTO LIKE '%${nf}'
      `;
      const res = await apiAdminSQL(sql);
      if (res.success) setItems(res.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!nf) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between bg-card">
          <div>
            <h3 className="text-xl font-black text-foreground uppercase tracking-tight leading-none">Itens da NF #{nf}</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2 flex items-center gap-2">
              <Package className="w-3 h-3 text-blue-500" />
              Detalhamento de produtos e quantidades
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultando Banco...</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cód.</th>
                  <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Produto</th>
                  <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Qtd.</th>
                  <th className="py-2.5 px-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-right">Preço</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-secondary/20 transition-colors group">
                    <td className="py-3 px-4 text-[11px] font-bold text-muted-foreground font-mono italic">{item.CODIGO}</td>
                    <td className="py-3 px-4 text-[11px] font-black text-foreground uppercase tracking-tight">{item.DESCRICAO}</td>
                    <td className="py-3 px-4 text-[11px] font-black text-blue-600 dark:text-blue-400 text-center">{Number(item.QTD).toFixed(0)}</td>
                    <td className="py-3 px-4 text-[11px] font-bold text-foreground/80 text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.PRECO || 0))}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      Nenhum item encontrado para esta NF.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
