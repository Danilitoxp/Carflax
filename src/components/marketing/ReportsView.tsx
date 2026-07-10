import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  ChevronDown,
  Download,
  Timer,
  ShoppingBag,
  Percent,
  Award,
  Target,
  MapPin,
  Megaphone,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
} from "lucide-react";
import { marketingService, type ReportsAnalytics } from "@/lib/marketing-service";
import { cn } from "@/lib/utils";
import { MiniCalendar } from "@/components/ui/MiniCalendar";

const EMPTY_ANALYTICS: ReportsAnalytics = {
  totals: {
    leads: 0, quotesCount: 0, quotesValue: 0, salesCount: 0, salesValue: 0,
    avgTicket: 0, convByCount: 0, convByValue: 0, convByQuote: 0, avgResponseMinutes: null,
  },
  previous: { leads: 0, salesCount: 0, salesValue: 0 },
  bySeller: [],
  byOrigin: [],
  byCampaign: [],
  byTemperature: [],
  dailySeries: [],
};

type TabId = "overview" | "sellers" | "sources" | "trend";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Visão Geral" },
  { id: "sellers", label: "Atendentes" },
  { id: "sources", label: "Origem & Campanha" },
  { id: "trend", label: "Tendência" },
];

const TEMP_STYLE: Record<string, string> = {
  Quente: "bg-rose-500",
  Morno: "bg-amber-500",
  Frio: "bg-blue-500",
};

/** Delta percentual vs período anterior. Retorna null quando não há base. */
function pctDelta(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const formatResponseTime = (minutes: number | null): string => {
  if (minutes === null) return "—";
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

const slaColor = (minutes: number | null) =>
  minutes === null ? "text-muted-foreground"
    : minutes < 3 ? "text-emerald-500"
    : minutes < 5 ? "text-amber-500"
    : "text-rose-500";

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  // Filtro inicia no mês atual: do dia 1 até hoje.
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const [hourlyData, setHourlyData] = useState<number[]>(new Array(24).fill(0));
  const [analytics, setAnalytics] = useState<ReportsAnalytics>(EMPTY_ANALYTICS);

  const peakHour = useMemo(() => {
    let maxVal = -1, maxH = -1;
    hourlyData.forEach((val, h) => { if (val > maxVal) { maxVal = val; maxH = h; } });
    return { hour: maxH, count: maxVal };
  }, [hourlyData]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [reports, hourlyLeads] = await Promise.all([
          marketingService.getReportsAnalytics(startDate, endDate || undefined),
          marketingService.getHourlyLeads(startDate, endDate || undefined, {}),
        ]);
        setAnalytics(reports);
        setHourlyData(hourlyLeads);
      } catch (err) {
        console.error("Erro ao carregar relatórios:", err);
        setAnalytics(EMPTY_ANALYTICS);
      } finally {
        setLoading(false);
      }
    }
    if (!startDate || !endDate) return;
    loadData();
  }, [startDate, endDate]);

  const { totals, previous, bySeller, byOrigin, byCampaign, byTemperature, dailySeries } = analytics;
  const maxOriginLeads = Math.max(...byOrigin.map((o) => o.leads), 1);
  const maxCampaignLeads = Math.max(...byCampaign.map((c) => c.leads), 1);
  const totalTempLeads = byTemperature.reduce((s, t) => s + t.leads, 0);
  const hasData = totals.leads > 0 || totals.salesCount > 0 || totals.quotesCount > 0;

  // Funil: Leads -> Orçamentos -> Vendas, com % de queda entre etapas.
  const funnel = [
    { label: "Leads", value: totals.leads, color: "bg-blue-500", pctOfTop: 100 },
    { label: "Orçamentos", value: totals.quotesCount, color: "bg-indigo-500", pctOfTop: totals.leads > 0 ? (totals.quotesCount / totals.leads) * 100 : 0 },
    { label: "Vendas", value: totals.salesCount, color: "bg-emerald-500", pctOfTop: totals.leads > 0 ? (totals.salesCount / totals.leads) * 100 : 0 },
  ];

  const dateLabel =
    endDate !== null
      ? `${startDate?.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })} até ${endDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}`
      : startDate
      ? `${startDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}...`
      : "Selecione o período...";

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background">
      <div className="max-w-6xl w-full mx-auto flex flex-col min-h-0 flex-1 px-8 pt-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shrink-0 px-1">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-primary rounded-full" />
              Desempenho de Marketing
            </h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
              Conversão, orçamentos, tempo de atendimento e origem dos leads
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-start md:justify-end">
            <div className="relative">
              <button
                onClick={() => setIsDateModalOpen(!isDateModalOpen)}
                className={cn(
                  "h-10 px-4 rounded-xl border text-[10px] font-black uppercase tracking-tight flex items-center gap-2 transition-all outline-none",
                  startDate && endDate
                    ? "bg-blue-600/10 dark:bg-blue-500/20 border-blue-600/20 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "bg-card border-border text-muted-foreground hover:border-slate-300 dark:hover:border-slate-700 shadow-sm",
                  isDateModalOpen && "ring-4 ring-blue-500/5 border-blue-500/50"
                )}
              >
                <Calendar className="w-3.5 h-3.5 opacity-40 shrink-0" />
                <span className="truncate max-w-[200px]">{dateLabel}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform duration-300 opacity-40 shrink-0", isDateModalOpen && "rotate-180")} />
              </button>
              {isDateModalOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDateModalOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 z-50">
                    <MiniCalendar
                      mode="range"
                      onSelectRange={(start, end) => {
                        setStartDate(start);
                        setEndDate(end);
                        if (start && end) setIsDateModalOpen(false);
                      }}
                      initialStartDate={startDate}
                      initialEndDate={endDate}
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={async () => {
                if (exporting || !startDate || !endDate) return;
                setExporting(true);
                try {
                  const result = await marketingService.exportLeadsXlsx(startDate, endDate);
                  if (!result) alert("Nenhum lead encontrado no período selecionado.");
                } catch (err) {
                  console.error("Erro ao exportar:", err);
                  alert("Erro ao gerar relatório. Tente novamente.");
                } finally {
                  setExporting(false);
                }
              }}
              disabled={exporting}
              className={cn(
                "w-10 h-10 border rounded-xl transition-all active:scale-95 shadow-sm flex items-center justify-center group",
                exporting ? "bg-blue-600/10 border-blue-600/20 cursor-wait" : "bg-card border-border hover:bg-secondary text-muted-foreground"
              )}
              title="Exportar Planilha de Leads"
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4 group-hover:text-blue-600 transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex items-center gap-1 border-b border-border mt-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-4 py-3 text-[11px] font-black uppercase tracking-wider transition-colors",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-1">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest text-primary">Gerando Relatórios...</span>
            </div>
          ) : !hasData ? (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-3xl bg-secondary flex items-center justify-center">
                <Target className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-black uppercase tracking-tight">Sem dados no período</p>
              <p className="text-xs text-muted-foreground max-w-xs">Selecione outro intervalo de datas para visualizar as métricas.</p>
            </div>
          ) : activeTab === "overview" ? (
            <div className="space-y-5">
              {/* KPI Row — com comparativo vs período anterior */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KpiCard label="Leads" value={totals.leads.toLocaleString("pt-BR")} delta={pctDelta(totals.leads, previous.leads)} icon={<Users className="w-5 h-5" />} accent="text-blue-500 bg-blue-500/10" />
                <KpiCard label="Orçamentos" value={totals.quotesCount.toLocaleString("pt-BR")} hint={formatCurrency(totals.quotesValue)} icon={<ShoppingBag className="w-5 h-5" />} accent="text-indigo-500 bg-indigo-500/10" />
                <KpiCard label="Vendas" value={totals.salesCount.toLocaleString("pt-BR")} hint={formatCurrency(totals.salesValue)} delta={pctDelta(totals.salesValue, previous.salesValue)} icon={<DollarSign className="w-5 h-5" />} accent="text-emerald-500 bg-emerald-500/10" />
                <KpiCard label="Ticket Médio" value={formatCurrency(totals.avgTicket)} icon={<TrendingUp className="w-5 h-5" />} accent="text-rose-500 bg-rose-500/10" />
                <KpiCard label="1ª Resposta" value={formatResponseTime(totals.avgResponseMinutes)} valueClass={slaColor(totals.avgResponseMinutes)} icon={<Timer className="w-5 h-5" />} accent="text-amber-500 bg-amber-500/10" />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider -mt-3 px-1">
                Variação comparada ao período anterior de mesma duração
              </p>

              {/* Conversão */}
              <section className="space-y-2.5">
                <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary" /> Taxas de Conversão
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <ConversionCard title="Por Quantidade" formula="Vendas ÷ Leads" percent={totals.convByCount} detail={`${totals.salesCount} de ${totals.leads} leads`} color="blue" />
                  <ConversionCard title="Por Orçamento" formula="Vendas ÷ Orçamentos enviados" percent={totals.convByQuote} detail={`${totals.salesCount} de ${totals.quotesCount} orçamentos`} color="indigo" />
                  <ConversionCard title="Por Valor" formula="R$ vendido ÷ R$ orçado" percent={totals.convByValue} detail={`${formatCurrency(totals.salesValue)} de ${formatCurrency(totals.quotesValue)}`} color="emerald" />
                </div>
              </section>

              {/* Funil */}
              <section className="space-y-2.5">
                <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" /> Funil de Conversão
                </h2>
                <div className="bg-card border border-border rounded-3xl p-4 shadow-sm space-y-2">
                  {funnel.map((stage, i) => (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-foreground">{stage.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          <span className="font-black text-foreground">{stage.value.toLocaleString("pt-BR")}</span>
                          {i > 0 && <span> · {stage.pctOfTop.toFixed(1)}% dos leads</span>}
                        </span>
                      </div>
                      <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-700", stage.color)} style={{ width: `${Math.max(stage.pctOfTop, stage.value > 0 ? 3 : 0)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          ) : activeTab === "sellers" ? (
            <section className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Desempenho por Atendente
              </h2>
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        <th className="text-left py-3 px-5">Atendente</th>
                        <th className="text-right py-3 px-3">Leads</th>
                        <th className="text-right py-3 px-3">Orçam.</th>
                        <th className="text-right py-3 px-3">Vendas</th>
                        <th className="text-right py-3 px-3">Faturamento</th>
                        <th className="text-right py-3 px-3">Conversão</th>
                        <th className="text-right py-3 px-5">1ª Resp.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bySeller.map((s) => (
                        <tr key={s.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <SellerAvatar name={s.name} avatar={s.avatar} />
                              <span className="font-bold text-foreground whitespace-nowrap">{s.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-semibold">{s.leads}</td>
                          <td className="py-3 px-3 text-right tabular-nums">
                            <span className="font-semibold">{s.quotesCount}</span>
                            {s.quotesValue > 0 && <span className="block text-[10px] text-muted-foreground">{formatCurrency(s.quotesValue)}</span>}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums font-semibold text-emerald-500">{s.salesCount}</td>
                          <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrency(s.salesValue)}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={cn(
                              "inline-block px-2 py-0.5 rounded-lg text-[11px] font-black tabular-nums",
                              s.convRate >= 20 ? "bg-emerald-500/10 text-emerald-500"
                                : s.convRate >= 8 ? "bg-amber-500/10 text-amber-500"
                                : "bg-secondary text-muted-foreground"
                            )}>
                              {s.convRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className={cn("py-3 px-5 text-right tabular-nums font-bold", slaColor(s.avgResponseMinutes))}>
                            {formatResponseTime(s.avgResponseMinutes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : activeTab === "sources" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Origem */}
                <section className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 mb-5">
                    <MapPin className="w-4 h-4 text-primary" /> Leads por Origem
                  </h2>
                  <div className="space-y-3">
                    {byOrigin.map((o) => {
                      const pct = totals.leads > 0 ? (o.leads / totals.leads) * 100 : 0;
                      return (
                        <div key={o.origin}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-foreground">{o.origin}</span>
                            <span className="text-muted-foreground tabular-nums">
                              <span className="font-black text-foreground">{o.leads}</span> · {pct.toFixed(0)}%
                              {o.salesCount > 0 && <span className="text-emerald-500 font-bold"> · {o.salesCount} venda{o.salesCount > 1 ? "s" : ""}</span>}
                            </span>
                          </div>
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500" style={{ width: `${(o.leads / maxOriginLeads) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Temperatura */}
                <section className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                  <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 mb-5">
                    <Flame className="w-4 h-4 text-primary" /> Qualidade dos Leads
                  </h2>
                  <div className="space-y-3">
                    {byTemperature.map((t) => {
                      const pct = totalTempLeads > 0 ? (t.leads / totalTempLeads) * 100 : 0;
                      return (
                        <div key={t.temperature}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-foreground">{t.temperature}</span>
                            <span className="text-muted-foreground tabular-nums">
                              <span className="font-black text-foreground">{t.leads}</span> · {pct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-500", TEMP_STYLE[t.temperature] || "bg-blue-500")} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Campanha */}
              <section className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 mb-5">
                  <Megaphone className="w-4 h-4 text-primary" /> Desempenho por Campanha
                </h2>
                <div className="space-y-3">
                  {byCampaign.map((c) => {
                    const conv = c.leads > 0 ? (c.salesCount / c.leads) * 100 : 0;
                    return (
                      <div key={c.campaign}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-foreground truncate max-w-[60%]">{c.campaign}</span>
                          <span className="text-muted-foreground tabular-nums">
                            <span className="font-black text-foreground">{c.leads}</span> leads
                            {c.salesCount > 0 && <span className="text-emerald-500 font-bold"> · {c.salesCount} venda{c.salesCount > 1 ? "s" : ""} ({conv.toFixed(0)}%)</span>}
                            {c.salesValue > 0 && <span className="text-foreground font-bold"> · {formatCurrency(c.salesValue)}</span>}
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500" style={{ width: `${(c.leads / maxCampaignLeads) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tendência diária: leads x vendas */}
              <section className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Tendência no Período
                  </h2>
                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Leads</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Vendas</span>
                  </div>
                </div>
                {(() => {
                  const maxVal = Math.max(...dailySeries.map((d) => Math.max(d.leads, d.sales)), 1);
                  const showLabelEvery = Math.ceil(dailySeries.length / 12);
                  return (
                    <div className="h-56 flex items-end gap-1">
                      {dailySeries.map((d, i) => (
                        <div key={d.date} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group/bar min-w-0">
                          <div className="flex-1 w-full flex items-end justify-center gap-0.5 relative">
                            <div className="w-1/2 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all min-h-[2px]" style={{ height: `${(d.leads / maxVal) * 100}%` }} />
                            <div className="w-1/2 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all min-h-[2px]" style={{ height: `${(d.sales / maxVal) * 100}%` }} />
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-950 border border-white/10 px-2 py-1 rounded-lg text-[9px] font-black text-white opacity-0 group-hover/bar:opacity-100 transition-all z-20 whitespace-nowrap">
                              {new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {d.leads} leads · {d.sales} vendas
                            </div>
                          </div>
                          <span className="text-[7px] font-black uppercase tracking-tighter opacity-50 truncate w-full text-center">
                            {i % showLabelEvery === 0 ? new Date(d.date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </section>

              {/* Fluxo por horário */}
              <section className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col">
                <h2 className="text-sm font-black uppercase tracking-tight flex items-center gap-2 mb-5">
                  <TrendingUp className="w-4 h-4 text-primary" /> Fluxo de Leads por Horário
                </h2>
                <div className="flex-1 h-52 flex items-end gap-1.5">
                  {(() => {
                    const day = (startDate || new Date()).getDay();
                    const isSaturday = day === 6;
                    const startH = isSaturday ? 8 : day === 0 ? 0 : 7;
                    const endH = isSaturday ? 12 : day === 0 ? 23 : 17;
                    const filtered = hourlyData.map((val, h) => ({ val, h })).filter((d) => d.h >= startH && d.h <= endH);
                    const maxLeads = Math.max(...filtered.map((d) => d.val), 1);
                    return filtered.map(({ val, h }) => (
                      <div key={h} className="flex-1 h-full flex flex-col justify-end items-center gap-2 group/bar">
                        <div className="flex-1 w-full flex flex-col justify-end relative">
                          <div
                            className={cn(
                              "w-full rounded-full transition-all duration-500 relative min-h-[4px]",
                              val > 0 ? "bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 cursor-pointer" : "bg-secondary/35"
                            )}
                            style={{ height: `${val > 0 ? Math.max((val / maxLeads) * 100, 8) : 4}%` }}
                          >
                            {val > 0 && (
                              <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-950 border border-white/10 px-2 py-1 rounded-lg text-[9px] font-black text-white opacity-0 group-hover/bar:opacity-100 transition-all z-20 whitespace-nowrap">
                                {val} {val === 1 ? "lead" : "leads"} • {h}h
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-tighter opacity-50">{h}h</span>
                      </div>
                    ));
                  })()}
                </div>
                <div className="mt-4 pt-3 border-t border-border/40 text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">
                  {peakHour.hour !== -1 && peakHour.count > 0
                    ? `Pico às ${peakHour.hour}h · ${peakHour.count} ${peakHour.count === 1 ? "lead" : "leads"}`
                    : "Nenhum lead registrado no período."}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function SellerAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  const [broken, setBroken] = useState(false);
  const showImg = avatar && !broken;
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-secondary flex items-center justify-center border border-border">
      {showImg ? (
        <img src={avatar} alt={name} className="w-full h-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className="text-[10px] font-black text-muted-foreground">{initials(name)}</span>
      )}
    </div>
  );
}

function KpiCard({ label, value, hint, icon, accent, valueClass, delta }: {
  label: string; value: string; hint?: string; icon: React.ReactNode; accent: string; valueClass?: string; delta?: number | null;
}) {
  const showDelta = delta !== undefined && delta !== null;
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", accent)}>{icon}</div>
        {showDelta && (
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-0.5",
            positive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta as number).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-lg font-black tracking-tight mt-0.5", valueClass)}>{value}</p>
      {hint && <p className="text-[11px] font-bold text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function ConversionCard({ title, formula, percent, detail, color }: {
  title: string; formula: string; percent: number; detail: string; color: "blue" | "indigo" | "emerald";
}) {
  const bar = color === "blue" ? "from-blue-600 to-indigo-500" : color === "indigo" ? "from-indigo-600 to-violet-500" : "from-emerald-600 to-teal-500";
  const text = color === "blue" ? "text-blue-500" : color === "indigo" ? "text-indigo-500" : "text-emerald-500";
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs font-black uppercase tracking-tight text-foreground">{title}</p>
        <p className={cn("text-xl font-black tabular-nums", text)}>{percent.toFixed(1)}%</p>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{formula}</p>
      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden my-2">
        <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", bar)} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
      <p className="text-[11px] font-semibold text-muted-foreground">{detail}</p>
    </div>
  );
}
