import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play, Pause, Square, RefreshCw, ShieldCheck, Clock, Send, AlertTriangle, Save, ListPlus, Coffee, Megaphone,
} from "lucide-react";
import {
  apiCampanhaStatus, apiCampanhaSaveConfig, apiCampanhaBuild, apiCampanhaControl,
  type CampanhaEnvioStatus, type CampanhaEnvioConfig,
} from "@/lib/api";

const DIAS = [
  { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" }, { v: 4, l: "Qui" },
  { v: 5, l: "Sex" }, { v: 6, l: "Sáb" }, { v: 0, l: "Dom" },
];

const STATUS_INFO: Record<string, { label: string; cls: string }> = {
  running: { label: "Enviando", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  paused: { label: "Pausado", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  idle: { label: "Parado", cls: "bg-muted text-muted-foreground border-border" },
};

const PUBLICO_LABEL: Record<string, string> = {
  trafego_pago: "Leads do tráfego pago (Meta, Google, Instagram…)",
};

// Ícone e textos por tipo — hoje só café da manhã, mas o painel é genérico.
const TIPO_UI: Record<string, { icon: React.ElementType; titulo: string; subtitulo: string }> = {
  cafe_manha: {
    icon: Coffee,
    titulo: "Café da manhã",
    subtitulo: "Convida os leads que vieram do tráfego para um café da manhã na loja.",
  },
};

export function CampanhaEnvioPanel({ tipo }: { tipo: string }) {
  const [data, setData] = useState<CampanhaEnvioStatus | null>(null);
  const [cfg, setCfg] = useState<CampanhaEnvioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await apiCampanhaStatus(tipo);
      setData(res);
      if (!dirty.current) setCfg(res.campanha);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao carregar status.");
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const patch = (p: Partial<CampanhaEnvioConfig>) => {
    dirty.current = true;
    setCfg((c) => (c ? { ...c, ...p } : c));
  };

  const salvar = async () => {
    if (!cfg) return;
    setBusy("save");
    setMsg(null);
    try {
      await apiCampanhaSaveConfig(tipo, cfg);
      dirty.current = false;
      setMsg("Configuração salva.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(null);
    }
  };

  const montarFila = async () => {
    setBusy("build");
    setMsg(null);
    try {
      const r = await apiCampanhaBuild(tipo);
      setMsg(`Fila montada: ${r.pending} leads prontos para receber o convite.`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao montar a fila.");
    } finally {
      setBusy(null);
    }
  };

  const controlar = async (action: "start" | "pause" | "stop") => {
    setBusy(action);
    setMsg(null);
    try {
      await apiCampanhaControl(tipo, action);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha na ação.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const ui = TIPO_UI[tipo] || { icon: Megaphone, titulo: cfg?.nome || "Campanha", subtitulo: "" };
  const Icon = ui.icon;
  const status = data?.campanha.status || "idle";
  const info = STATUS_INFO[status] || STATUS_INFO.idle;
  const c = data?.contadores || { pending: 0, sent: 0, failed: 0 };
  const enviadosHoje = data?.campanha.sent_today || 0;
  const cap = data?.campanha.daily_cap || 0;
  const publicoLbl = PUBLICO_LABEL[cfg?.publico || ""] || cfg?.publico || "";

  return (
    <div className="max-w-5xl w-full mx-auto px-6 md:px-8 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">{cfg?.nome || ui.titulo}</h1>
            <p className="text-sm text-muted-foreground font-medium">{ui.subtitulo}</p>
          </div>
        </div>
        <span className={`px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${info.cls}`}>
          {info.label}
        </span>
      </div>

      {/* Banner público + anti-ban */}
      <div className="flex gap-3 p-4 rounded-2xl bg-sky-500/5 border border-sky-500/20">
        <ShieldCheck className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
          Público: <b>{publicoLbl}</b>. Modo seguro: respeita horário comercial, um{" "}
          <b>intervalo aleatório</b> entre mensagens, um <b>teto diário</b> e variações de texto.
          Quem responder "parar/sair" é removido automaticamente e não recebe outras campanhas.
        </p>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={Clock} label="Na fila" value={c.pending} color="text-sky-500" />
        <Stat icon={Send} label="Enviados hoje" value={`${enviadosHoje}/${cap}`} color="text-emerald-500" />
        <Stat icon={Megaphone} label="Total enviados" value={c.sent} color="text-primary" />
        <Stat icon={AlertTriangle} label="Falhas" value={c.failed} color="text-rose-500" />
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <button onClick={montarFila} disabled={!!busy}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border font-bold text-xs hover:border-primary/40 transition-all disabled:opacity-50">
          <ListPlus className="w-4 h-4" /> Montar fila (tráfego pago)
        </button>

        {status !== "running" ? (
          <button onClick={() => controlar("start")} disabled={!!busy || c.pending === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-black text-xs hover:opacity-90 transition-all disabled:opacity-50">
            <Play className="w-4 h-4" /> {status === "paused" ? "Retomar" : "Iniciar envio"}
          </button>
        ) : (
          <button onClick={() => controlar("pause")} disabled={!!busy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-black text-xs hover:opacity-90 transition-all disabled:opacity-50">
            <Pause className="w-4 h-4" /> Pausar
          </button>
        )}

        <button onClick={() => controlar("stop")} disabled={!!busy || status === "idle"}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border font-bold text-xs hover:border-rose-500/40 hover:text-rose-500 transition-all disabled:opacity-50">
          <Square className="w-4 h-4" /> Parar
        </button>

        <button onClick={load} disabled={!!busy}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-secondary border border-border font-bold text-xs hover:border-primary/40 transition-all disabled:opacity-50 ml-auto">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {msg && (
        <div className="text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5">
          {msg}
        </div>
      )}

      {/* Configuração */}
      {cfg && (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Configuração</h2>

          <Field label="Nome da campanha">
            <input type="text" value={cfg.nome}
              onChange={(e) => patch({ nome: e.target.value })} className={inputCls} placeholder="Café da manhã Carflax" />
          </Field>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label="Teto por dia">
              <input type="number" min={1} max={500} value={cfg.daily_cap}
                onChange={(e) => patch({ daily_cap: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Intervalo mín (s)">
              <input type="number" min={20} max={3600} value={cfg.min_gap_seconds}
                onChange={(e) => patch({ min_gap_seconds: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Intervalo máx (s)">
              <input type="number" min={20} max={7200} value={cfg.max_gap_seconds}
                onChange={(e) => patch({ max_gap_seconds: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Hora início">
              <input type="number" min={0} max={23} value={cfg.hora_inicio}
                onChange={(e) => patch({ hora_inicio: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Hora fim">
              <input type="number" min={1} max={24} value={cfg.hora_fim}
                onChange={(e) => patch({ hora_fim: Number(e.target.value) })} className={inputCls} />
            </Field>
            <Field label="Não repetir por (dias)">
              <input type="number" min={1} max={3650} value={cfg.reask_days}
                onChange={(e) => patch({ reask_days: Number(e.target.value) })} className={inputCls} />
            </Field>
          </div>

          <Field label="Dias de envio">
            <div className="flex flex-wrap gap-2 pt-1">
              {DIAS.map((d) => {
                const on = cfg.dias_semana.includes(d.v);
                return (
                  <button key={d.v} type="button"
                    onClick={() => patch({
                      dias_semana: on ? cfg.dias_semana.filter((x) => x !== d.v) : [...cfg.dias_semana, d.v],
                    })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      on ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border opacity-70"
                    }`}>
                    {d.l}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Variações de mensagem (uma por linha) — use {nome}. Inclua a data/hora do café no texto.">
            <textarea
              value={cfg.templates.join("\n")}
              onChange={(e) => patch({ templates: e.target.value.split("\n") })}
              rows={6}
              className={`${inputCls} font-mono text-[11px] leading-relaxed resize-y`}
              placeholder="Oi {nome}! Vem tomar um café da manhã com a gente na Carflax dia XX/XX às 9h ☕"
            />
          </Field>

          <div className="flex justify-end">
            <button onClick={salvar} disabled={busy === "save"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:opacity-90 transition-all disabled:opacity-50">
              <Save className="w-4 h-4" /> {busy === "save" ? "Salvando..." : "Salvar configuração"}
            </button>
          </div>
        </div>
      )}

      {/* Últimos envios */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">Últimos envios</h2>
        {data && data.recentes.length > 0 ? (
          <div className="divide-y divide-border/50">
            {data.recentes.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-bold truncate">{r.nome || r.remote_jid.split("@")[0]}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {r.remote_jid.split("@")[0]}{r.error ? ` · ${r.error}` : ""}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                  r.status === "sent" ? "bg-emerald-500/10 text-emerald-500"
                    : r.status === "failed" ? "bg-rose-500/10 text-rose-500"
                    : r.status === "opted_out" ? "bg-slate-500/10 text-slate-400"
                    : "bg-sky-500/10 text-sky-500"
                }`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-medium py-4 text-center">
            Nenhum envio ainda. Monte a fila e inicie o envio.
          </p>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">{label}</label>
      {children}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl bg-secondary flex items-center justify-center ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-lg font-black leading-tight">{value}</p>
      </div>
    </div>
  );
}
