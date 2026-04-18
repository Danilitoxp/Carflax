import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Target, Plus, X, Trophy, ChevronLeft, ChevronRight, Gift, Star, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Campaign {
  id: string | number;
  type: "highlight" | "brand";
  name: string;
  description?: string;
  badge?: string;
  color?: string;
  icon?: React.ElementType;
  date?: string;
  status?: string;
  logo?: string;
}

interface PremioMes {
  id: string;
  mes: number;
  ano: number;
  nome: string;
  descricao: string | null;
  valor: number | null;
  imagem: string | null;
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function offsetMes(mes: number, ano: number, delta: number): { mes: number; ano: number } {
  let m = mes + delta;
  let a = ano;
  if (m > 12) { m -= 12; a += 1; }
  if (m < 1)  { m += 12; a -= 1; }
  return { mes: m, ano: a };
}

export function CampanhasView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);

  // Modal Prêmio do Mês
  const [isPremioModalOpen, setIsPremioModalOpen] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
  const [premioAtual, setPremioAtual] = useState<PremioMes | null>(null);
  const [proximosPremios, setProximosPremios] = useState<PremioMes[]>([]);
  const [loadingPremio, setLoadingPremio] = useState(false);

  // Card do mês atual (visível no grid)
  const [premioCard, setPremioCard] = useState<PremioMes | null>(null);

  useEffect(() => {
    const now = new Date();
    async function fetchData() {
      const [{ data: campanhasData }, { data: premioData }] = await Promise.all([
        supabase.from("campanhas").select("*").order("created_at", { ascending: false }),
        supabase.from("premio_mes").select("*").eq("mes", now.getMonth() + 1).eq("ano", now.getFullYear()).single(),
      ]);
      if (campanhasData) {
        setCampaigns(campanhasData.map((c) => ({
          id: c.id,
          type: "brand" as const,
          name: c.name,
          description: c.fornecedor || "",
          date: c.date ? new Date(c.date).toLocaleDateString("pt-BR") : "",
          status: c.status || "ativa",
          logo: c.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`,
          badge: c.periodo_fim ? `até ${new Date(c.periodo_fim).toLocaleDateString("pt-BR")}` : undefined,
        })));
      }
      if (premioData) setPremioCard(premioData);
    }
    fetchData();
  }, []);

  const carregarPremio = useCallback(async (mes: number, ano: number) => {
    setLoadingPremio(true);
    setPremioAtual(null);

    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();

    const [{ data: premio }, { data: proximos }] = await Promise.all([
      supabase.from("premio_mes").select("*").eq("mes", mes).eq("ano", ano).single(),
      supabase.from("premio_mes")
        .select("*")
        .or(`ano.gt.${anoAtual},and(ano.eq.${anoAtual},mes.gt.${mesAtual})`)
        .order("ano").order("mes")
        .limit(6),
    ]);

    if (premio) setPremioAtual(premio);
    setProximosPremios(proximos || []);
    setLoadingPremio(false);
  }, []);

  const abrirModalPremio = () => {
    const now = new Date();
    const ms = { mes: now.getMonth() + 1, ano: now.getFullYear() };
    setMesSelecionado(ms);
    setIsPremioModalOpen(true);
    carregarPremio(ms.mes, ms.ano);
  };

  const navegarMes = (delta: number) => {
    const novo = offsetMes(mesSelecionado.mes, mesSelecionado.ano, delta);
    setMesSelecionado(novo);
    carregarPremio(novo.mes, novo.ano);
  };

  const now = new Date();
  const mesAtual = now.getMonth() + 1;
  const anoAtual = now.getFullYear();
  const isMesAtual = mesSelecionado.mes === mesAtual && mesSelecionado.ano === anoAtual;

  return (
    <div className="h-full flex flex-col pt-4 px-6 pb-2 overflow-hidden bg-[#F8FAFC]">
      <style>{`
        @keyframes border-trace {
          0%, 100% { clip-path: inset(0 0 98% 0); }
          25%  { clip-path: inset(0 0 0 98%); }
          50%  { clip-path: inset(98% 0 0 0); }
          75%  { clip-path: inset(0 98% 0 0); }
        }
        .animate-border-trace { animation: border-trace 4s linear infinite; }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Campanhas</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Programas de Incentivo e Vendas</p>
        </div>
        <button
          onClick={() => setIsNewCampaignModalOpen(true)}
          className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-all shadow-sm flex items-center gap-2 uppercase tracking-wider active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Campanha
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-6">

          {/* Card Prêmio do Mês — sempre visível, abre modal */}
          <div
            onClick={abrirModalPremio}
            className="aspect-[4/5] rounded-xl p-4 flex flex-col border border-blue-200/50 transition-all duration-300 cursor-pointer group relative overflow-hidden bg-white shadow-xl shadow-blue-600/5 hover:shadow-md hover:border-blue-300"
          >
            <div className="absolute inset-0 z-0 pointer-events-none">
              <div className="absolute inset-0 border-2 border-blue-600 rounded-xl animate-border-trace opacity-60" />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 relative z-10">
              {premioCard?.imagem ? (
                <img src={premioCard.imagem} alt={premioCard.nome} className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform duration-500">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Prêmio do Mês</p>
                <h3 className="text-[11px] font-black text-slate-800 tracking-tight leading-tight line-clamp-3">
                  {premioCard?.nome ?? "Ver Prêmio"}
                </h3>
                {premioCard?.valor && (
                  <p className="text-[13px] font-black text-blue-600">
                    R$ {Number(premioCard.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
              <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                <span className="text-[8px] font-black text-blue-600 tracking-[0.2em] uppercase">★ Bata a meta</span>
              </div>
            </div>
          </div>

          {/* Cards de Campanhas */}
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              onClick={() => setSelectedCampaign(camp)}
              className="aspect-[4/5] rounded-xl p-4 flex flex-col border border-slate-200 transition-all duration-300 cursor-pointer group relative overflow-hidden bg-white shadow-sm hover:shadow-md hover:border-blue-300"
            >
              <div className="flex-1 bg-slate-50 rounded-lg p-4 flex items-center justify-center border border-slate-100 mb-3 transition-colors group-hover:bg-blue-50/50">
                <img src={camp.logo} className="max-h-12 w-auto object-contain group-hover:scale-110 transition-transform duration-500" alt={camp.name} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{camp.name}</h3>
                <p className="text-[8px] font-bold text-slate-400 tracking-widest leading-none">{camp.date}</p>
                {camp.description && (
                  <p className="text-[8px] font-semibold text-slate-500 truncate">{camp.description}</p>
                )}
                <div className="pt-0.5">
                  <span className="inline-flex px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[7px] font-black uppercase tracking-widest">
                    {camp.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL PRÊMIO DO MÊS ── */}
      {isPremioModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsPremioModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                  <Trophy className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Prêmio do Mês</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Bata a meta • Concorra ao sorteio</p>
                </div>
              </div>
              <button onClick={() => setIsPremioModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">

              {/* Seletor de Mês */}
              <div className="px-6 pt-5 pb-3 flex items-center justify-center gap-4">
                <button onClick={() => navegarMes(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-blue-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    {MESES[mesSelecionado.mes - 1]} {mesSelecionado.ano}
                  </span>
                  {isMesAtual && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-wider">Mês atual</span>
                  )}
                </div>
                <button onClick={() => navegarMes(+1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-blue-600">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Prêmio do Mês Selecionado */}
              <div className="px-6 pb-5">
                {loadingPremio ? (
                  <div className="bg-slate-50 rounded-xl p-6 flex items-center justify-center h-40">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : premioAtual ? (
                  <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 rounded-xl p-5 flex gap-5 items-center relative overflow-hidden">
                    <div className="absolute inset-0 border-2 border-blue-200 rounded-xl animate-border-trace opacity-30 pointer-events-none" />
                    {premioAtual.imagem ? (
                      <img src={premioAtual.imagem} alt={premioAtual.nome} className="w-28 h-28 object-contain shrink-0 rounded-lg bg-white border border-slate-100 p-2" />
                    ) : (
                      <div className="w-28 h-28 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                        <Gift className="w-10 h-10 text-blue-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">
                        {MESES[premioAtual.mes - 1]} {premioAtual.ano}
                      </p>
                      <h3 className="text-sm font-black text-slate-800 leading-tight mb-1">{premioAtual.nome}</h3>
                      {premioAtual.descricao && (
                        <p className="text-[11px] text-slate-500 leading-snug line-clamp-3 mb-2">{premioAtual.descricao}</p>
                      )}
                      {premioAtual.valor && (
                        <p className="text-lg font-black text-blue-600">
                          R$ {Number(premioAtual.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
                    <Gift className="w-8 h-8 text-slate-300" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nenhum prêmio definido para este mês</p>
                  </div>
                )}
              </div>

              {/* Vendedores Elegíveis */}
              <div className="px-6 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Vendedores Elegíveis</h4>
                  <span className="text-[9px] font-bold text-slate-400">≥ 97% da meta</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 text-center">
                  <Lock className="w-6 h-6 text-slate-300" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aguardando integração ERP</p>
                  <p className="text-[10px] text-slate-400">Os vendedores com ≥ 97% da meta aparecerão aqui automaticamente após a conexão com o sistema de metas.</p>
                </div>
              </div>

              {/* Próximos Prêmios */}
              {proximosPremios.length > 0 && (
                <div className="px-6 pb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Gift className="w-3.5 h-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Próximos Prêmios</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {proximosPremios.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => { setMesSelecionado({ mes: p.mes, ano: p.ano }); carregarPremio(p.mes, p.ano); }}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center text-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                      >
                        {p.imagem ? (
                          <img src={p.imagem} alt={p.nome} className="w-12 h-12 object-contain group-hover:scale-110 transition-transform" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                        <div>
                          <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider">{MESES[p.mes - 1].slice(0,3)} {p.ano}</p>
                          <p className="text-[10px] font-bold text-slate-700 leading-tight line-clamp-2">{p.nome}</p>
                          {p.valor && <p className="text-[10px] font-black text-blue-600 mt-0.5">R$ {Number(p.valor).toLocaleString("pt-BR")}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── MODAL RANKING CAMPANHA ── */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setSelectedCampaign(null)} />
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Ranking da Campanha</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{selectedCampaign.name} • {selectedCampaign.description}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCampaign(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide flex flex-col items-center justify-center gap-3 text-center">
              <Lock className="w-10 h-10 text-slate-200" />
              <p className="text-sm font-black text-slate-400 uppercase tracking-wider">Ranking pendente de integração ERP</p>
              <p className="text-[11px] text-slate-400 max-w-xs">O ranking de vendedores por fornecedor/marca será exibido aqui após a conexão com o sistema de faturamento (MySQL).</p>
            </div>
            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              <button onClick={() => setSelectedCampaign(null)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NOVA CAMPANHA ── */}
      {isNewCampaignModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setIsNewCampaignModalOpen(false)} />
          <div className="relative w-full max-w-[480px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Nova Campanha</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Cadastro de Incentivo</p>
                </div>
              </div>
              <button onClick={() => setIsNewCampaignModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-5 scrollbar-hide">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nome da Campanha</label>
                <input type="text" placeholder="Ex: Campanha IVM – Abril" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Fornecedor Responsável</label>
                <input type="text" placeholder="Ex: IVM, Sansil, Amanco..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Início</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Término</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50" />
                </div>
              </div>
            </div>
            <div className="p-8 border-t border-slate-100 shrink-0">
              <button onClick={() => setIsNewCampaignModalOpen(false)} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10">
                Salvar Campanha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
