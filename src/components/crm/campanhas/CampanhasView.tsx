import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { apiElegiveisParaSorteio, apiCampaignRanking, type MetaVendedor, type RankingVendedor } from "@/lib/api";
import { uploadImage } from "@/lib/uploadImage";
import { Target, Plus, X, Trophy, ChevronLeft, ChevronRight, Gift, Star, AlertCircle, Pencil, Trash2 } from "lucide-react";
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
  fornecedor?: string;
  data_ini?: string;
  data_fim?: string;
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
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [formData, setFormData] = useState({ name: "", fornecedor: "", data_ini: "", data_fim: "", logo: "" });
  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Modal Prêmio do Mês
  const [isPremioModalOpen, setIsPremioModalOpen] = useState(false);
  const [mesSelecionado, setMesSelecionado] = useState({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear() });
  const [premioAtual, setPremioAtual] = useState<PremioMes | null>(null);
  const [proximosPremios, setProximosPremios] = useState<PremioMes[]>([]);
  const [loadingPremio, setLoadingPremio] = useState(false);
  const [elegiveis, setElegiveis] = useState<MetaVendedor[] | null>(null);
  const [loadingElegiveis, setLoadingElegiveis] = useState(false);
  const [erroApi, setErroApi] = useState(false);

  // Ranking da campanha selecionada
  const [rankingCampanha, setRankingCampanha] = useState<RankingVendedor[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);

  // Card do mês atual (visível no grid)
  const [premioCard, setPremioCard] = useState<PremioMes | null>(null);

  useEffect(() => {
    const now = new Date();
    async function fetchData() {
      try {
        const [campanhasRes, premioRes] = await Promise.all([
          supabase.from("campanhas").select("*"),
          supabase.from("premio_mes").select("*").eq("mes", now.getMonth() + 1).eq("ano", now.getFullYear()).maybeSingle(),
        ]);

        if (campanhasRes.error) console.error("Campanhas erro:", campanhasRes.error);
        if (premioRes.error) console.error("Premio erro:", premioRes.error);

        const campanhasData = campanhasRes.data;
        const premioData = premioRes.data;

        if (premioData) setPremioCard(premioData);
        const hoje = new Date(); hoje.setHours(0,0,0,0);
        setCampaigns((campanhasData ?? []).map((c) => {
          const fim = c.periodo_fim ? new Date(c.periodo_fim) : null;
          const ini = c.date ? new Date(c.date) : null;
          const status = fim && fim < hoje ? "encerrada" : ini && ini > hoje ? "futura" : "ativa";
          const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
          const dateRange = ini && fim ? `${fmtDate(ini)} → ${fmtDate(fim)}` : ini ? fmtDate(ini) : fim ? `até ${fmtDate(fim)}` : "";
          return {
            id: c.id, type: "brand" as const, name: c.name, description: "",
            date: dateRange, status,
            logo: c.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`,
            fornecedor: c.fornecedor || c.name, data_ini: c.date || undefined, data_fim: c.periodo_fim || undefined,
          };
        }));
      } catch (err) {
        console.error("fetchData erro:", err);
      } finally {
        setLoadingCampaigns(false);
      }

      // Fornecedores/marcas em background para o autocomplete
      fetch("https://marketing-gestao-de-tempo.velbav.easypanel.host/api/fornecedores?type=marca")
        .then(r => r.json()).then(d => { if (d?.fornecedores?.length) setFornecedores(d.fornecedores); })
        .catch(() => {});
    }
    fetchData();
  }, []);

  const carregarPremio = useCallback(async (mes: number, ano: number) => {
    setLoadingPremio(true);
    setLoadingElegiveis(true);
    setErroApi(false);
    setPremioAtual(null);
    setElegiveis(null);

    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();
    const mesano = `${String(mes).padStart(2, "0")}${ano}`;

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

    // Busca elegíveis na API do ERP (≥97% da meta)
    try {
      const elig = await apiElegiveisParaSorteio(mesano);
      setElegiveis(elig);
    } catch (err) {
      console.error("[Campanhas] Erro ao buscar elegíveis:", err);
      setErroApi(true);
      setElegiveis([]);
    }
    setLoadingElegiveis(false);
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

  const abrirRankingCampanha = async (camp: Campaign) => {
    setSelectedCampaign(camp);
    setRankingCampanha([]);
    setLoadingRanking(true);
    try {
      const ranking = await apiCampaignRanking({
        fornecedor: camp.fornecedor || camp.name,
        data_ini: camp.data_ini,
        data_fim: camp.data_fim,
      });
      setRankingCampanha(ranking);
    } catch (err) {
      console.error("[Campanhas] Erro ao buscar ranking:", err);
      setRankingCampanha([]);
    }
    setLoadingRanking(false);
  };

  const mapCampaign = (c: any) => {
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const fim = c.periodo_fim ? new Date(c.periodo_fim) : null;
    const ini = c.date ? new Date(c.date) : null;
    const status = fim && fim < hoje ? "encerrada" : ini && ini > hoje ? "futura" : "ativa";
    const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const dateRange = ini && fim ? `${fmtDate(ini)} → ${fmtDate(fim)}` : ini ? fmtDate(ini) : fim ? `até ${fmtDate(fim)}` : "";
    return {
      id: c.id, type: "brand" as const, name: c.name, description: "",
      date: dateRange, status, logo: c.logo || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`,
      fornecedor: c.fornecedor || c.name, data_ini: c.date || undefined, data_fim: c.periodo_fim || undefined,
    } as Campaign;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview imediato
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Guarda o File para upload no save
    setFormData(f => ({ ...f, _imageFile: file } as any));
  };


  const abrirNovaCampanha = () => {
    setFormData({ name: "", fornecedor: "", data_ini: "", data_fim: "", logo: "" });
    setImagePreview("");
    setIsNewCampaignModalOpen(true);
  };

  const salvarNovaCampanha = async () => {
    if (!formData.name.trim()) return;
    setSavingCampaign(true);
    const imageFile = (formData as any)._imageFile as File | undefined;
    const logoUrl = imageFile ? await uploadImage(imageFile, "campanhas") : null;
    const { error } = await supabase.from("campanhas").insert({
      name: formData.name.trim(),
      fornecedor: formData.fornecedor || null,
      date: formData.data_ini || null,
      periodo_fim: formData.data_fim || null,
      logo: logoUrl,
      type: "highlight",
      status: "ativa",
    });
    setSavingCampaign(false);
    if (error) { console.error("[Campanhas] Erro ao criar:", error); alert(`Erro ao criar campanha: ${error.message}`); return; }
    setIsNewCampaignModalOpen(false);
    const { data: lista } = await supabase.from("campanhas").select("*");
    if (lista) setCampaigns(lista.map(mapCampaign));
  };

  const abrirEdicao = (camp: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    const logoAtual = camp.logo?.startsWith("data:") ? camp.logo : "";
    setFormData({ name: camp.name, fornecedor: camp.fornecedor || "", data_ini: camp.data_ini || "", data_fim: camp.data_fim || "", logo: logoAtual });
    setImagePreview(logoAtual);
    setEditingCampaign(camp);
  };

  const salvarEdicao = async () => {
    if (!editingCampaign || !formData.name.trim()) return;
    setSavingCampaign(true);
    const imageFile = (formData as any)._imageFile as File | undefined;
    const logoUrl = imageFile
      ? await uploadImage(imageFile, "campanhas")
      : (editingCampaign.logo?.startsWith("http") ? editingCampaign.logo : null);
    const { error } = await supabase.from("campanhas").update({
      name: formData.name.trim(),
      fornecedor: formData.fornecedor || null,
      date: formData.data_ini || null,
      periodo_fim: formData.data_fim || null,
      logo: logoUrl,
    }).eq("id", editingCampaign.id);
    setSavingCampaign(false);
    if (error) { console.error("[Campanhas] Erro ao editar:", error); alert(`Erro ao salvar: ${error.message}`); return; }
    const updated = mapCampaign({
      id: editingCampaign.id,
      name: formData.name.trim(),
      fornecedor: formData.fornecedor || null,
      date: formData.data_ini || null,
      periodo_fim: formData.data_fim || null,
      logo: logoUrl,
    });
    setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? updated : c));
    setEditingCampaign(null);
  };

  const confirmarExclusao = async () => {
    if (confirmDeleteId === null) return;
    const { error } = await supabase.from("campanhas").delete().eq("id", confirmDeleteId);
    if (error) { console.error("[Campanhas] Erro ao excluir:", error); alert(`Erro ao excluir: ${error.message}`); return; }
    setCampaigns((prev) => prev.filter((c) => c.id !== confirmDeleteId));
    setConfirmDeleteId(null);
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
          onClick={abrirNovaCampanha}
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

          {/* Skeletons enquanto carrega */}
          {loadingCampaigns && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse">
              <div className="h-3/5 bg-slate-100 m-3 rounded-lg" />
              <div className="px-4 space-y-2">
                <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                <div className="h-2 bg-slate-100 rounded w-1/2" />
                <div className="h-4 bg-slate-100 rounded w-1/4 mt-1" />
              </div>
            </div>
          ))}

          {/* Cards de Campanhas */}
          {!loadingCampaigns && campaigns.map((camp) => (
            <div
              key={camp.id}
              onClick={() => abrirRankingCampanha(camp)}
              className="aspect-[4/5] rounded-xl p-4 flex flex-col border border-slate-200 transition-all duration-300 cursor-pointer group relative overflow-hidden bg-white shadow-sm hover:shadow-md hover:border-blue-300"
            >
              {/* Ações editar/excluir */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => abrirEdicao(camp, e)}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(camp.id); }}
                  className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-400 hover:text-red-500 hover:border-red-200 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 bg-slate-50 rounded-lg p-4 flex items-center justify-center border border-slate-100 mb-3 transition-colors group-hover:bg-blue-50/50 relative overflow-hidden">
                <img
                  src={camp.logo}
                  alt={camp.name}
                  onLoad={(e) => {
                    e.currentTarget.style.opacity = "1";
                    const skeleton = e.currentTarget.parentElement?.querySelector(".img-skeleton") as HTMLElement;
                    if (skeleton) skeleton.style.display = "none";
                  }}
                  style={{ opacity: 0, transition: "opacity 0.3s", position: "relative", zIndex: 1 }}
                  className="max-h-12 w-auto object-contain group-hover:scale-110 transition-transform duration-500"
                />
                <div className="img-skeleton absolute inset-0 bg-slate-100 animate-pulse rounded-lg" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{camp.name}</h3>
                <p className="text-[8px] font-bold text-slate-400 tracking-widest leading-none">{camp.date}</p>
                <div className="pt-0.5">
                  <span className={cn(
                    "inline-flex px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border",
                    camp.status === "ativa" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    camp.status === "futura" ? "bg-blue-50 text-blue-600 border-blue-100" :
                    "bg-slate-50 text-slate-400 border-slate-200"
                  )}>
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
                  {elegiveis && !loadingElegiveis && (
                    <span className="ml-auto text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                      {elegiveis.length} elegíveis
                    </span>
                  )}
                </div>

                {loadingElegiveis ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="bg-slate-100 rounded-xl h-20 animate-pulse" />
                    ))}
                  </div>
                ) : erroApi ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-[11px] text-amber-700 font-semibold">API não disponível. Verifique se o servidor ERP está rodando.</p>
                  </div>
                ) : elegiveis && elegiveis.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                    <p className="text-[11px] font-bold text-slate-400">Nenhum vendedor atingiu 97% da meta neste mês ainda.</p>
                  </div>
                ) : elegiveis && elegiveis.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {elegiveis.map((v) => {
                      const pct = parseFloat(v.PERC_META_BATIDA);
                      const borderColor = pct >= 100 ? "border-emerald-400" : "border-amber-400";
                      const pctColor = pct >= 100 ? "text-emerald-600" : "text-amber-600";
                      return (
                        <div key={v.COD_VENDEDOR} className={cn("bg-white border-2 rounded-xl p-3 flex flex-col items-center text-center gap-1", borderColor)}>
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-black">
                            {v.NOME_VENDEDOR.split(" ").map(n => n[0]).slice(0,2).join("")}
                          </div>
                          <p className="text-[10px] font-black text-slate-800 leading-tight line-clamp-2">{v.NOME_VENDEDOR}</p>
                          <p className={cn("text-[11px] font-black", pctColor)}>{pct.toFixed(1)}%</p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
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
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {loadingRanking ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
              ) : rankingCampanha.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 text-center h-40">
                  <AlertCircle className="w-8 h-8 text-slate-200" />
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {erroApi ? "API não disponível" : "Nenhum dado de faturamento encontrado para este fornecedor"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-12 px-4 mb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="col-span-1">Pos</div>
                    <div className="col-span-7">Vendedor</div>
                    <div className="col-span-2 text-right">Qtd</div>
                    <div className="col-span-2 text-right">Faturado</div>
                  </div>
                  {rankingCampanha.map((v, i) => (
                    <div key={v.COD_VENDEDOR} className="grid grid-cols-12 items-center bg-white hover:bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-100 transition-all">
                      <div className="col-span-1">
                        <div className={cn(
                          "w-6 h-6 rounded flex items-center justify-center text-[10px] font-black",
                          i === 0 ? "bg-amber-400 text-amber-900" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-slate-50 text-slate-400"
                        )}>{i + 1}</div>
                      </div>
                      <div className="col-span-7 pl-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{v.NOME_VENDEDOR}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-[10px] font-semibold text-slate-500">{v.QTD_VENDAS}</span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-[11px] font-black text-emerald-600">
                          {parseFloat(v.FATURADO).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
              <button onClick={() => setSelectedCampaign(null)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98]">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NOVA / EDITAR CAMPANHA ── */}
      {(isNewCampaignModalOpen || editingCampaign) && (() => {
        const isEdit = !!editingCampaign;
        const onClose = () => isEdit ? setEditingCampaign(null) : setIsNewCampaignModalOpen(false);
        const onSave = () => isEdit ? salvarEdicao() : salvarNovaCampanha();
        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="fixed inset-0" onClick={onClose} />
            <div className="relative w-full max-w-[480px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
              <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                    {isEdit ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{isEdit ? "Editar Campanha" : "Nova Campanha"}</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{isEdit ? editingCampaign.name : "Cadastro de Incentivo"}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"><X className="w-5 h-5" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-5 scrollbar-hide">
                {/* Imagem */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Logo / Imagem</label>
                  <label className="flex flex-col items-center justify-center gap-2 w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all relative overflow-hidden">
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" className="absolute inset-0 w-full h-full object-contain p-3" />
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <Plus className="w-4 h-4 text-slate-400" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clique para enviar imagem</span>
                        <span className="text-[9px] text-slate-300">JPG, PNG, SVG</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  {imagePreview && (
                    <button onClick={() => { setImagePreview(""); setFormData(f => ({ ...f, logo: "" })); }} className="text-[9px] font-bold text-red-400 hover:text-red-600 uppercase tracking-wider">
                      Remover imagem
                    </button>
                  )}
                </div>

                {/* Nome */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Nome da Campanha <span className="text-red-400">*</span></label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Campanha IVM – Abril 2026" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all" />
                </div>

                {/* Fornecedor */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Fornecedor</label>
                  <select
                    value={formData.fornecedor}
                    onChange={(e) => setFormData(f => ({ ...f, fornecedor: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all appearance-none"
                  >
                    <option value="">Selecionar fornecedor...</option>
                    {fornecedores.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                {/* Período */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Início</label>
                    <input type="date" value={formData.data_ini} onChange={(e) => setFormData(f => ({ ...f, data_ini: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">Término</label>
                    <input type="date" value={formData.data_fim} onChange={(e) => setFormData(f => ({ ...f, data_fim: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-600/50" />
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 shrink-0">
                <button onClick={onSave} disabled={savingCampaign || !formData.name.trim()} className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg shadow-blue-600/10">
                  {savingCampaign ? "Salvando..." : isEdit ? "Salvar Alterações" : "Criar Campanha"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── CONFIRMAÇÃO EXCLUIR ── */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center border border-red-100">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Excluir campanha?</h3>
              <p className="text-[11px] text-slate-400 mt-1">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Cancelar</button>
              <button onClick={confirmarExclusao} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
