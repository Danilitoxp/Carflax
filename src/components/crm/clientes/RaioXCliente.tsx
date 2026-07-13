import { useMemo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Wallet,
  Percent,
  Clock,
  Repeat,
  ShoppingCart,
  Flame,
  TrendingUp,
  TrendingDown,
  Target,
  UserSquare2,
  Gauge,
  Phone,
  History,
  Sparkles,
  Boxes,
  PackageX,
  PackagePlus,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  UserPlus,
  Trophy,
  CircleSlash,
  GitCommitVertical,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  apiMixCliente,
  apiHistoricoCliente,
  type MixMarca,
  type MixMarcaStatus,
  type HistoricoEvento,
  type HistoricoEventoTipo,
} from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  registrarContato,
  TIPO_LABEL,
  RESULTADO_LABEL,
  type ContatoTipo,
  type ContatoResultado,
} from "@/lib/contatos-service";

// Estilo por tipo de evento na timeline
const EVENTO_STYLE: Record<HistoricoEventoTipo, { cor: string; icon: typeof UserPlus }> = {
  entrada: { cor: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20", icon: UserPlus },
  auge: { cor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Trophy },
  crescimento: { cor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: ArrowUpRight },
  queda: { cor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20", icon: ArrowDownRight },
  marca_perdida: { cor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20", icon: PackageX },
  parou: { cor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20", icon: CircleSlash },
};
import { fmtBRL, fmtBRLCompact, fmtPct, fmtData, acaoSugerida, scoreOportunidade } from "./frv-utils";
import type { ClienteFRVCalc, AcaoTom } from "./frv-utils";

// Apresentação da ação sugerida por tom (lógica vem pura do motor)
const ACAO_TOM: Record<AcaoTom, { tom: string; icon: typeof Phone }> = {
  critico: { tom: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20", icon: Phone },
  atencao: { tom: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", icon: TrendingDown },
  oportunidade: { tom: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: Sparkles },
  neutro: { tom: "bg-secondary text-muted-foreground border-border", icon: Repeat },
};

// Estilo por status de marca no mix
const MIX_STATUS: Record<MixMarcaStatus, { label: string; cor: string; icon: typeof PackageX }> = {
  perdida: { label: "Perdida", cor: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20", icon: PackageX },
  nova: { label: "Nova", cor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: PackagePlus },
  caindo: { label: "Caindo", cor: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20", icon: ArrowDownRight },
  crescendo: { label: "Crescendo", cor: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: ArrowUpRight },
  estavel: { label: "Estável", cor: "text-muted-foreground bg-secondary border-border", icon: Minus },
};

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Perfil de cadência (régua individual de compra)
function perfilCadencia(dias: number | null): { label: string; cor: string } {
  if (dias == null) return { label: "Sem padrão", cor: "text-muted-foreground" };
  if (dias <= 7) return { label: "Compra semanal", cor: "text-emerald-600 dark:text-emerald-400" };
  if (dias <= 15) return { label: "Compra quinzenal", cor: "text-emerald-600 dark:text-emerald-400" };
  if (dias <= 30) return { label: "Compra mensal", cor: "text-blue-600 dark:text-blue-400" };
  if (dias <= 60) return { label: "Compra bimestral", cor: "text-amber-600 dark:text-amber-400" };
  if (dias <= 90) return { label: "Compra trimestral", cor: "text-amber-600 dark:text-amber-400" };
  return { label: "Compra eventual", cor: "text-rose-600 dark:text-rose-400" };
}

function probabilidadeRecompra(c: ClienteFRVCalc): { label: string; cor: string } {
  if (c.status === "inativo" || c.risco_abandono >= 60) return { label: "Baixa", cor: "text-rose-600 dark:text-rose-400" };
  if (c.status === "atencao" || c.risco_abandono >= 30) return { label: "Média", cor: "text-amber-600 dark:text-amber-400" };
  return { label: "Alta", cor: "text-emerald-600 dark:text-emerald-400" };
}

function Metric({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Wallet;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3.5 relative overflow-hidden">
      <div className={cn("absolute right-0 top-0 p-2 opacity-[0.06]", accent)}>
        <Icon className="w-11 h-11" />
      </div>
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="text-lg font-black text-foreground tabular-nums mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-[9px] font-bold text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-[10px] font-bold tabular-nums" style={{ color: p.color }}>
          {p.name}: {p.name === "Pedidos" ? p.value : fmtBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

export function RaioXCliente({
  cliente,
  janelaMeses,
  onClose,
  userProfile,
  onContatoRegistrado,
}: {
  cliente: ClienteFRVCalc | null;
  janelaMeses: number;
  onClose: () => void;
  userProfile?: { id?: string; name?: string };
  onContatoRegistrado?: () => void;
}) {
  const [mix, setMix] = useState<MixMarca[] | null>(null);
  const [mixLoading, setMixLoading] = useState(false);
  const [mixErro, setMixErro] = useState(false);

  const [historico, setHistorico] = useState<HistoricoEvento[] | null>(null);
  const [histLoading, setHistLoading] = useState(false);

  // Registro de contato
  const [showForm, setShowForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [ctTipo, setCtTipo] = useState<ContatoTipo>("ligacao");
  const [ctResultado, setCtResultado] = useState<ContatoResultado>("realizado");
  const [ctObs, setCtObs] = useState("");

  // Fecha no ESC
  useEffect(() => {
    if (!cliente) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cliente, onClose]);

  // Reseta o formulário de contato ao trocar de cliente
  useEffect(() => {
    setShowForm(false);
    setSalvo(false);
    setCtTipo("ligacao");
    setCtResultado("realizado");
    setCtObs("");
  }, [cliente]);

  // Carrega o mix de produtos (por marca) sob demanda ao abrir o cliente
  useEffect(() => {
    if (!cliente) {
      setMix(null);
      return;
    }
    let ativo = true;
    setMixLoading(true);
    setMixErro(false);
    setMix(null);
    apiMixCliente(cliente.cliente_id)
      .then((resp) => {
        if (ativo) setMix(resp.marcas);
      })
      .catch((err) => {
        console.error("Erro ao carregar mix do cliente:", err);
        if (ativo) setMixErro(true);
      })
      .finally(() => {
        if (ativo) setMixLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [cliente]);

  // Carrega a timeline histórica sob demanda
  useEffect(() => {
    if (!cliente) {
      setHistorico(null);
      return;
    }
    let ativo = true;
    setHistLoading(true);
    setHistorico(null);
    apiHistoricoCliente(cliente.cliente_id)
      .then((resp) => {
        if (ativo) setHistorico(resp.eventos);
      })
      .catch((err) => {
        console.error("Erro ao carregar histórico do cliente:", err);
        if (ativo) setHistorico([]);
      })
      .finally(() => {
        if (ativo) setHistLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [cliente]);

  const mixResumo = useMemo(() => {
    if (!mix) return null;
    return {
      perdidas: mix.filter((m) => m.status === "perdida").length,
      novas: mix.filter((m) => m.status === "nova").length,
      caindo: mix.filter((m) => m.status === "caindo").length,
      ativas: mix.filter((m) => m.valor_atual > 0).length,
    };
  }, [mix]);

  const derivado = useMemo(() => {
    if (!cliente) return null;
    const serieChart = cliente.serie.map((p) => {
      const [ano, m] = p.mes.split("-");
      return { label: `${NOMES_MES[Number(m) - 1]}/${ano.slice(2)}`, valor: p.valor, pedidos: p.pedidos };
    });

    // Últimos 12m vs 12m anteriores (potencial perdido)
    const ord = [...cliente.serie].sort((a, b) => a.mes.localeCompare(b.mes));
    const ult12 = ord.slice(-12).reduce((s, p) => s + p.valor, 0);
    const ant12 = ord.slice(-24, -12).reduce((s, p) => s + p.valor, 0);
    const potencialPerdido = Math.max(0, ant12 - ult12);

    const anos = Math.max(1, janelaMeses / 12);
    const mediaMensal = cliente.valor_total / janelaMeses;
    const mediaAnual = cliente.valor_total / anos;

    // Tempo como cliente
    let tempoCliente = "—";
    if (cliente.primeira_compra) {
      const dias = Math.floor((Date.now() - new Date(cliente.primeira_compra).getTime()) / 86400000);
      const meses = Math.floor(dias / 30);
      tempoCliente = meses >= 12 ? `${(meses / 12).toFixed(1).replace(".", ",")} anos` : `${meses} meses`;
    }

    return { serieChart, ult12, ant12, potencialPerdido, mediaMensal, mediaAnual, tempoCliente };
  }, [cliente, janelaMeses]);

  if (!cliente || !derivado) return null;

  const cadencia = perfilCadencia(cliente.intervalo_medio_dias);
  const acao = acaoSugerida(cliente);
  const acaoUI = ACAO_TOM[acao.tom];
  const prob = probabilidadeRecompra(cliente);
  const score = scoreOportunidade(cliente);

  const handleSalvarContato = async () => {
    if (!cliente || salvando) return;
    setSalvando(true);
    try {
      await registrarContato({
        cliente_id: cliente.cliente_id,
        cliente_nome: cliente.nome_cliente,
        vendedor_cod: cliente.cod_vendedor || null,
        vendedor_nome: cliente.nome_vendedor || null,
        tipo: ctTipo,
        resultado: ctResultado,
        observacao: ctObs.trim() || null,
        valor_potencial: derivado.potencialPerdido || null,
        score_no_contato: score,
        autor_id: userProfile?.id || null,
        autor_nome: userProfile?.name || null,
      });
      setSalvo(true);
      setShowForm(false);
      setCtObs("");
      onContatoRegistrado?.();
    } catch {
      // erro já logado no serviço
    } finally {
      setSalvando(false);
    }
  };
  const AcaoIcon = acaoUI.icon;
  const crescendo = cliente.tendencia >= 0;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      {/* Painel */}
      <div className="relative w-full max-w-2xl h-full bg-background border-l border-border shadow-2xl overflow-y-auto scrollbar-hide animate-in slide-in-from-right duration-300">
        {/* Cabeçalho */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <UserSquare2 className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-foreground leading-tight truncate max-w-[300px]">{cliente.nome_cliente}</h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight"
                  style={{ backgroundColor: `${cliente.segmento.cor}1a`, color: cliente.segmento.cor }}
                >
                  {cliente.segmento.label}
                </span>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                {cliente.cliente_id}
                {cliente.empresa && ` · ${cliente.empresa}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors shrink-0">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Próxima ação sugerida + Score de oportunidade */}
          <div className={cn("rounded-2xl border p-4 flex items-start gap-3", acaoUI.tom)}>
            <div className="w-9 h-9 rounded-xl bg-background/40 flex items-center justify-center shrink-0">
              <AcaoIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Próxima ação sugerida</p>
              <p className="text-sm font-black leading-tight mt-0.5">{acao.titulo}</p>
              <p className="text-[11px] font-medium opacity-90 mt-1">{acao.detalhe}</p>
            </div>
            <div className="text-center shrink-0 pl-2 border-l border-current/20">
              <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Oport.</p>
              <p className="text-2xl font-black tabular-nums leading-none mt-0.5">{score}</p>
              <p className="text-[8px] font-bold opacity-60">de 100</p>
            </div>
          </div>

          {/* Registrar contato */}
          <div>
            {!showForm && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setSalvo(false);
                }}
                className={cn(
                  "w-full flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all",
                  salvo
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-sm"
                )}
              >
                {salvo ? <CheckCircle2 className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                {salvo ? "Contato registrado" : "Registrar contato"}
              </button>
            )}

            {showForm && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Registrar contato</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Tipo</label>
                    <select
                      value={ctTipo}
                      onChange={(e) => setCtTipo(e.target.value as ContatoTipo)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {(Object.keys(TIPO_LABEL) as ContatoTipo[]).map((t) => (
                        <option key={t} value={t}>{TIPO_LABEL[t]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Resultado</label>
                    <select
                      value={ctResultado}
                      onChange={(e) => setCtResultado(e.target.value as ContatoResultado)}
                      className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {(Object.keys(RESULTADO_LABEL) as ContatoResultado[]).map((r) => (
                        <option key={r} value={r}>{RESULTADO_LABEL[r]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <textarea
                  value={ctObs}
                  onChange={(e) => setCtObs(e.target.value)}
                  placeholder="Observação (opcional)…"
                  rows={2}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-muted-foreground/60"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSalvarContato}
                    disabled={salvando}
                    className="flex-1 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-[11px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    {salvando ? "Salvando…" : "Salvar contato"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="rounded-xl border border-border bg-card px-4 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Raio-X: indicadores principais */}
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
              <Gauge className="w-3.5 h-3.5 text-primary" /> Raio-X
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <Metric label="Última compra" value={fmtData(cliente.ultima_compra)} sub={`${cliente.recencia_dias} dias atrás`} icon={Clock} accent="text-blue-500" />
              <Metric label="Cadência" value={cadencia.label.replace("Compra ", "")} sub={cliente.intervalo_medio_dias ? `~${cliente.intervalo_medio_dias} dias` : "sem padrão"} icon={Repeat} accent="text-cyan-500" />
              <Metric label="Vendedor" value={cliente.nome_vendedor || "—"} sub={`Cliente há ${derivado.tempoCliente}`} icon={UserSquare2} accent="text-violet-500" />
              <Metric label={`Faturamento ${janelaMeses}m`} value={fmtBRLCompact(cliente.valor_total)} sub={`Média ${fmtBRLCompact(derivado.mediaMensal)}/mês`} icon={Wallet} accent="text-emerald-500" />
              <Metric label="Ticket médio" value={fmtBRLCompact(cliente.ticket_medio)} sub={`${cliente.frequencia} pedidos`} icon={ShoppingCart} accent="text-amber-500" />
              <Metric label="Margem" value={`${cliente.margem_pct.toFixed(1).replace(".", ",")}%`} sub={fmtBRLCompact(cliente.margem_total)} icon={Percent} accent="text-emerald-500" />
            </div>
          </div>

          {/* Scores RFV */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: "Recência", v: cliente.r_score },
              { label: "Frequência", v: cliente.f_score },
              { label: "Valor", v: cliente.v_score },
              { label: "Margem", v: cliente.m_score },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-primary tabular-nums leading-none mt-1">{s.v}</p>
                <p className="text-[8px] font-bold text-muted-foreground mt-0.5">de 5</p>
              </div>
            ))}
          </div>

          {/* Inteligência comercial */}
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Inteligência comercial
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {/* Risco */}
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Flame className="w-3 h-3" /> Risco de perda</p>
                  <span className="text-sm font-black tabular-nums text-foreground">{cliente.risco_abandono}<span className="text-[9px] text-muted-foreground">/100</span></span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", cliente.risco_abandono >= 60 ? "bg-rose-500" : cliente.risco_abandono >= 30 ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: `${cliente.risco_abandono}%` }}
                  />
                </div>
              </div>
              {/* Prob recompra */}
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Repeat className="w-3 h-3" /> Prob. recompra</p>
                <p className={cn("text-lg font-black mt-1", prob.cor)}>{prob.label}</p>
                {cliente.proxima_compra && (
                  <p className="text-[9px] font-bold text-muted-foreground mt-0.5">Prevista {fmtData(cliente.proxima_compra)}</p>
                )}
              </div>
              {/* Potencial perdido */}
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1"><Target className="w-3 h-3" /> Potencial perdido</p>
                <p className={cn("text-lg font-black tabular-nums mt-1", derivado.potencialPerdido > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                  {fmtBRLCompact(derivado.potencialPerdido)}
                </p>
                <p className="text-[9px] font-bold text-muted-foreground mt-0.5">
                  12m: {fmtBRLCompact(derivado.ult12)} vs {fmtBRLCompact(derivado.ant12)}
                </p>
              </div>
              {/* Tendência */}
              <div className="bg-card border border-border rounded-2xl p-3.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  {crescendo ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} Tendência (6m)
                </p>
                <p className={cn("text-lg font-black mt-1", crescendo ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {crescendo ? "Crescendo" : "Caindo"}
                </p>
                {(cliente.faturamento_anterior > 0 || cliente.faturamento_atual > 0) && (
                  <p className="text-[9px] font-bold text-muted-foreground mt-0.5">Período: {fmtPct(cliente.variacao_pct)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Evolução */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-primary" /> Evolução ({janelaMeses} meses)
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={derivado.serieChart} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="raioxFat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                  <XAxis dataKey="label" tick={{ fontSize: 8, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis yAxisId="l" tick={{ fontSize: 8, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => fmtBRLCompact(v).replace("R$ ", "")} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 8, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<ChartTip />} />
                  <Bar yAxisId="r" name="Pedidos" dataKey="pedidos" fill="hsl(var(--muted-foreground))" opacity={0.25} radius={[3, 3, 0, 0]} barSize={8} />
                  <Area yAxisId="l" name="Faturamento" type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#raioxFat)" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mix de produtos (por marca) */}
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
              <Boxes className="w-3.5 h-3.5 text-primary" /> Mix de produtos por marca
              <span className="font-bold normal-case tracking-normal text-muted-foreground/70">· 12m vs 12m ant.</span>
            </p>

            {mixLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-xl" />
                ))}
              </div>
            )}

            {mixErro && (
              <div className="rounded-2xl border border-dashed border-border p-3.5 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Não foi possível carregar o mix</p>
              </div>
            )}

            {!mixLoading && !mixErro && mix && mix.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-3.5 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sem marcas registradas no período</p>
              </div>
            )}

            {!mixLoading && !mixErro && mix && mix.length > 0 && mixResumo && (
              <>
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                  <div className="bg-card border border-border rounded-2xl p-2.5 text-center">
                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Ativas</p>
                    <p className="text-lg font-black text-foreground tabular-nums leading-none mt-1">{mixResumo.ativas}</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-2.5 text-center">
                    <p className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Caindo</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums leading-none mt-1">{mixResumo.caindo}</p>
                  </div>
                  <div className="bg-card border border-border rounded-2xl p-2.5 text-center">
                    <p className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Perdidas</p>
                    <p className="text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums leading-none mt-1">{mixResumo.perdidas}</p>
                  </div>
                </div>

                {/* Lista de marcas (perdidas e em queda primeiro) */}
                <div className="space-y-1.5">
                  {[...mix]
                    .sort((a, b) => {
                      const ordem: Record<MixMarcaStatus, number> = { perdida: 0, caindo: 1, crescendo: 2, nova: 3, estavel: 4 };
                      if (ordem[a.status] !== ordem[b.status]) return ordem[a.status] - ordem[b.status];
                      return b.valor_anterior + b.valor_atual - (a.valor_anterior + a.valor_atual);
                    })
                    .map((m) => {
                      const st = MIX_STATUS[m.status];
                      const StIcon = st.icon;
                      return (
                        <div key={m.marca} className="flex items-center gap-3 bg-card border border-border rounded-xl px-3 py-2">
                          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", st.cor)}>
                            <StIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-foreground uppercase tracking-tight truncate">{m.marca}</p>
                            <p className="text-[9px] font-bold text-muted-foreground tabular-nums">
                              {fmtBRLCompact(m.valor_anterior)} → {fmtBRLCompact(m.valor_atual)}
                            </p>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight border shrink-0", st.cor)}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </>
            )}
          </div>

          {/* Trajetória / linha do tempo */}
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <GitCommitVertical className="w-3.5 h-3.5 text-primary" /> Trajetória do cliente
            </p>

            {histLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-xl" />
                ))}
              </div>
            )}

            {!histLoading && historico && historico.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-3.5 text-center">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sem histórico suficiente</p>
              </div>
            )}

            {!histLoading && historico && historico.length > 0 && (
              <div className="relative">
                {historico.map((ev, i) => {
                  const st = EVENTO_STYLE[ev.tipo];
                  const EvIcon = st.icon;
                  return (
                    <div key={`${ev.ano}-${i}`} className="flex gap-3 pb-3 last:pb-0 relative">
                      {i < historico.length - 1 && <div className="absolute left-[13px] top-7 -bottom-0 w-px bg-border" />}
                      <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0 border z-10", st.cor)}>
                        <EvIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-muted-foreground tabular-nums">{ev.ano}</span>
                          <p className="text-[11px] font-black text-foreground uppercase tracking-tight">{ev.titulo}</p>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground mt-0.5">{ev.detalhe}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
