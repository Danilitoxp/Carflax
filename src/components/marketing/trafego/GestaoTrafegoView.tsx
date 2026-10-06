import { Fragment, useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Plus, ArrowsClockwise, ArrowSquareOut, CalendarBlank, Coins, UsersThree, Target, Megaphone,
  MagnifyingGlass, Funnel, Storefront, ChartBar, DotsThreeVertical, Warning, CaretDown,
} from "@phosphor-icons/react";
import {
  apiTrafegoCampanhas,
  apiTrafegoFechamento,
  apiTrafegoStatus,
  apiTrafegoOrcamento,
  apiTrafegoCriarGoogle,
  apiTrafegoCriarMeta,
  type TrafegoCampanha,
  type TrafegoListaResponse,
  type TrafegoPlataforma,
} from "@/lib/api";
import { BotaoApresentar } from "./BotaoApresentar";
import { ProgramacaoModal } from "./Programacao";
import { PainelDiario } from "./PainelDiario";
import { LogoGoogle, LogoMeta } from "./LogosMarca";
import { ImpactoAjusteModal } from "./ImpactoAjuste";
import "./gestao-trafego.css";
import "./gestao-trafego-v2.css";

// ── Formatação ──────────────────────────────────────────────────────────────
const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = (v: number) => "R$ " + Math.round(v).toLocaleString("pt-BR");
const int = (v: number) => Math.round(v).toLocaleString("pt-BR");
const DIAS_MES = 30.4;

const hojeSP = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
function periodoDe(p: Periodo) {
  const fim = hojeSP();
  if (p === "mes") return { inicio: `${fim.slice(0, 7)}-01`, fim };
  // Mês fechado escolhido no seletor: do dia 1 ao último dia.
  const ref = p.slice(2);
  const [a, m] = ref.split("-").map(Number);
  return { inicio: `${ref}-01`, fim: `${ref}-${String(new Date(a, m, 0).getDate()).padStart(2, "0")}` };
}

// "m:AAAA-MM" = um mês fechado inteiro.
type Periodo = "mes" | `m:${string}`;

function nomeMesAtual() {
  const [a, m] = hojeSP().split("-").map(Number);
  const nome = new Date(a, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

/** Os 12 meses anteriores ao atual, do mais recente ao mais antigo. */
function mesesFechados() {
  const [a, m] = hojeSP().split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(a, m - 2 - i, 1);
    const ref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const nome = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return { ref, nome: nome.charAt(0).toUpperCase() + nome.slice(1) };
  });
}

const TIPOS: Record<string, string> = {
  SEARCH: "Pesquisa",
  PERFORMANCE_MAX: "Performance Max",
  DISPLAY: "Display",
  VIDEO: "Vídeo",
  SMART: "Inteligente",
  LOCAL: "Local",
  DEMAND_GEN: "Demand Gen",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_LEADS: "Cadastros",
  OUTCOME_SALES: "Vendas",
  MESSAGES: "Mensagens",
  REACH: "Alcance",
  LINK_CLICKS: "Cliques",
  POST_ENGAGEMENT: "Engajamento",
};
const LANCES: Record<string, string> = {
  MAXIMIZE_CONVERSIONS: "Max. conversões",
  TARGET_CPA: "CPA desejado",
  TARGET_SPEND: "Max. cliques",
  TARGET_IMPRESSION_SHARE: "Parcela de impr.",
  MAXIMIZE_CONVERSION_VALUE: "Max. valor",
  TARGET_ROAS: "ROAS desejado",
  MANUAL_CPC: "CPC manual",
  CONVERSATIONS: "Conversas",
  REACH: "Alcance",
  LINK_CLICKS: "Cliques",
  THRUPLAY: "ThruPlay",
  IMPRESSIONS: "Impressões",
};
// Nome curto da campanha: "[CARFLAX] [PESQUISA] [HIDRAULICA] 07-2025" → "Pesquisa • Hidráulica".
const ACENTOS: Record<string, string> = {
  HIDRAULICA: "Hidráulica", CABREUVA: "Cabreúva", ELETRICA: "Elétrica", JUNDIAI: "Jundiaí", MATERIAIS: "Materiais",
};
function nomeCurto(nome: string) {
  const partes = [...nome.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()).filter((p) => !/^carflax$/i.test(p));
  if (partes.length < 2) return nome;
  return partes.map((p) => ACENTOS[p.toUpperCase()] || (p.length <= 4 ? p.toUpperCase() : p.charAt(0) + p.slice(1).toLowerCase())).join(" • ");
}
const ESTRATEGIA: Record<string, string> = {
  MAXIMIZE_CONVERSIONS: "Max. conversões", TARGET_CPA: "CPA desejado", TARGET_SPEND: "Max. cliques",
};

interface Confirmacao {
  titulo: string;
  texto: string;
  linhas: [string, string][];
  botao: string;
  perigo?: boolean;
  executar: () => Promise<unknown>;
}

// Exemplo do curso (módulo 04): a campanha já vem preenchida para revisar.
const MODELO_GOOGLE = {
  nome: `[PESQ] Elétrica — Fios e Cabos | ${hojeSP().slice(5, 7)}-${hojeSP().slice(2, 4)}`,
  orcamentoDiario: "15",
  cidades: "Jundiaí",
  grupo: "Fios e cabos",
  palavras: ['"cabo flex 2,5mm"', '"fio 2,5mm preço"', '"cabo flexível 100 metros"', '"fio elétrico jundiaí"', '"onde comprar fio elétrico"', '"cabo pp"', '"cabo 6mm"', '"fio 4mm"', "[cabo flex 2,5mm 100m]", "[fio 10mm]"].join("\n"),
  negativas: ["emprego", "vaga", "curso", "grátis", "como fazer", "pdf", "usado", "campinas", "são paulo", "sorocaba"].join("\n"),
  urlFinal: "https://www.carflax.com.br/",
  caminho1: "fios-e-cabos",
  caminho2: "jundiai",
  titulos: ["Cabo Flex 2,5mm em Jundiaí", "Fios e Cabos Pronta Entrega", "Carflax Hidráulica e Elétrica", "Rolo 100m Cabo Flex 2,5mm", "Peça Pelo WhatsApp", "Cabos PP, Flex e Rígidos", "Fio 4mm, 6mm e 10mm", "Loja de Elétrica em Jundiaí", "Cabos Certificados Inmetro", "Fale com um Especialista", "Orçamento Rápido no WhatsApp", "Atendimento Técnico na Loja"].join("\n"),
  descricoes: ["Cabo flex 2,5mm, 4mm, 6mm e mais. Pronta entrega em Jundiaí. Peça seu orçamento agora.", "Loja especializada em hidráulica e elétrica. Atendimento técnico para obra e reforma.", "Chame no WhatsApp, mande sua lista de materiais e receba o orçamento rapidinho."].join("\n"),
  sufixoUrl: "utm_source=google&utm_medium=cpc&utm_campaign=eletrica-fios",
};

const MODELO_META = {
  modelo: "whatsapp" as "whatsapp" | "marca",
  nome: `[WPP] Ofertas — Jundiaí | ${hojeSP().slice(5, 7)}-${hojeSP().slice(2, 4)}`,
  orcamentoDiario: "23",
  cidade: "Jundiaí",
  raioKm: "15",
  idadeMin: "25",
};

// ── Tela ────────────────────────────────────────────────────────────────────
export function GestaoTrafegoView({ userProfile }: { userProfile?: { name: string; avatar?: string | null } | null } = {}) {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [dados, setDados] = useState<TrafegoListaResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [aba, setAba] = useState<TrafegoPlataforma>("google");
  const [mostrarPausadas, setMostrarPausadas] = useState(false);
  const [edicoes, setEdicoes] = useState<Record<string, string>>({});
  const [confirmar, setConfirmar] = useState<Confirmacao | null>(null);
  const [executando, setExecutando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "good" | "bad"; texto: string; link?: string } | null>(null);
  const [criar, setCriar] = useState<null | "google" | "meta">(null);
  const [programar, setProgramar] = useState<null | { inicial?: TrafegoCampanha }>(null);
  const [ajusteImpacto, setAjusteImpacto] = useState<null | { c: TrafegoCampanha; ajuste: "lance-conversoes" | "presenca" }>(null);
  const [recarregarDiario, setRecarregarDiario] = useState(0);
  const [busca, setBusca] = useState("");
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [faturamento, setFaturamento] = useState<{ mes: string; valor: number | null; clientes: number; roas: number | null } | null>(null);
  const intervalo = useMemo(() => periodoDe(periodo), [periodo]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroGeral(null);
    setRecarregarDiario((n) => n + 1);
    try {
      const { inicio, fim } = periodoDe(periodo);
      const mes = inicio.slice(0, 7);
      // Faturamento é complemento: se o ERP falhar, a tela segue sem ele.
      apiTrafegoFechamento(mes, 7.2, 3)
        .then((f) => setFaturamento({ mes, valor: f.resultadoTodos.faturamento, clientes: f.resultadoTodos.clientes, roas: f.resultadoTodos.roas }))
        .catch(() => setFaturamento({ mes, valor: null, clientes: 0, roas: null }));
      const lista = await apiTrafegoCampanhas(inicio, fim);
      setDados(lista);
      setEdicoes({});
    } catch (e) {
      setErroGeral((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => { carregar(); }, [carregar]);

  const campanhas = useMemo(() => dados?.campanhas ?? [], [dados]);
  const daAba = useMemo(
    () =>
      campanhas
        .filter((c) => c.plataforma === aba)
        .filter((c) => mostrarPausadas || c.status === "ENABLED" || c.gasto > 0)
        .filter((c) => !busca.trim() || c.nome.toLowerCase().includes(busca.trim().toLowerCase()))
        .sort((a, b) => (a.status === b.status ? b.gasto - a.gasto : a.status === "ENABLED" ? -1 : 1)),
    [campanhas, aba, mostrarPausadas, busca],
  );
  const ocultas = campanhas.filter((c) => c.plataforma === aba).length - daAba.length;

  const tot = useMemo(() => {
    const gasto = campanhas.reduce((s, c) => s + c.gasto, 0);
    const contatos = campanhas.reduce((s, c) => s + c.contatos, 0);
    const ativasG = campanhas.filter((c) => c.plataforma === "google" && c.status === "ENABLED").length;
    const ativasM = campanhas.filter((c) => c.plataforma === "meta" && c.status === "ENABLED").length;
    const gastoG = campanhas.filter((c) => c.plataforma === "google").reduce((s, c) => s + c.gasto, 0);
    const contatosG = campanhas.filter((c) => c.plataforma === "google").reduce((s, c) => s + c.contatos, 0);
    return { gasto, contatos, cpl: contatos ? gasto / contatos : 0, ativasG, ativasM, gastoG, contatosG };
  }, [campanhas]);

  const teto = dados?.teto;

  /** Impacto no comprometido mensal, calculado na tela para mostrar antes de confirmar. */
  function impacto(deltaDiario: number): [string, string][] {
    if (!teto) return [];
    const depois = (teto.diarioTotal + deltaDiario) * DIAS_MES;
    const passa = deltaDiario > 0 && depois > teto.limite;
    return [
      ["Comprometido/mês", `${brl0(teto.comprometidoMensal)} → ${brl0(depois)}`],
      ["Teto", `${brl0(teto.limite)}${passa ? " — vai passar, o servidor vai recusar" : ""}`],
    ];
  }

  async function executar() {
    if (!confirmar) return;
    setExecutando(true);
    try {
      await confirmar.executar();
      setAviso({ tipo: "good", texto: `${confirmar.titulo}: feito.` });
      setConfirmar(null);
      await carregar();
    } catch (e) {
      setAviso({ tipo: "bad", texto: (e as Error).message });
      setConfirmar(null);
    } finally {
      setExecutando(false);
    }
  }

  function pedirStatus(c: TrafegoCampanha) {
    const ativar = c.status !== "ENABLED";
    setConfirmar({
      titulo: ativar ? "Ativar campanha" : "Pausar campanha",
      texto: c.nome,
      linhas: [
        ["Plataforma", c.plataforma === "google" ? "Google Ads" : "Meta Ads"],
        ["Orçamento", `${brl(c.orcamentoDiario || 0)}/dia`],
        ...impacto(ativar ? c.orcamentoDiario || 0 : -(c.orcamentoDiario || 0)),
      ],
      botao: ativar ? "Ativar" : "Pausar",
      perigo: !ativar,
      executar: () => apiTrafegoStatus(c.plataforma, c.id, ativar),
    });
  }

  function pedirOrcamento(c: TrafegoCampanha) {
    const novo = Number(String(edicoes[c.id] ?? "").replace(",", "."));
    if (!(novo > 0)) return;
    const delta = c.status === "ENABLED" ? novo - (c.orcamentoDiario || 0) : 0;
    setConfirmar({
      titulo: "Alterar orçamento",
      texto: c.nome,
      linhas: [
        ["Por dia", `${brl(c.orcamentoDiario || 0)} → ${brl(novo)}`],
        ["Por mês (× 30,4)", `${brl0((c.orcamentoDiario || 0) * DIAS_MES)} → ${brl0(novo * DIAS_MES)}`],
        ...impacto(delta),
        ...(Math.abs(novo - (c.orcamentoDiario || 0)) / Math.max(1, c.orcamentoDiario || 0) > 0.2
          ? ([["Atenção", "Mudança acima de 20% — o algoritmo reaprende por alguns dias"]] as [string, string][])
          : []),
      ],
      botao: "Salvar orçamento",
      executar: () => apiTrafegoOrcamento(c.plataforma, c.id, novo),
    });
  }

  // A correção abre com a expectativa calculada para ESTA campanha: a mesma
  // mudança ganha contato numa e corta em outra (ver ImpactoAjusteModal).
  function pedirAjuste(c: TrafegoCampanha, ajuste: "lance-conversoes" | "presenca") {
    setAjusteImpacto({ c, ajuste });
  }

  const custoMedio = aba === "google" && tot.contatosG ? tot.gastoG / tot.contatosG : tot.cpl;

  const fimMes = (() => {
    const [a, m] = intervalo.inicio.split("-").map(Number);
    return `${intervalo.inicio.slice(0, 8)}${String(new Date(a, m, 0).getDate()).padStart(2, "0")}`;
  })();

  return (
    <div className="gt gt2">
      <div className="gt-wrap">
        <header className="gt2-head">
          <div>
            <nav className="gt2-trilha" aria-label="Você está em"><span>Marketing</span><i>›</i><span>Gestão de tráfego</span></nav>
            <h1>Gestão de <em>tráfego</em></h1>
            <p className="gt2-sub">Acompanhe investimentos, contatos e campanhas em um só lugar.</p>
          </div>
          <div className="gt2-acoes">
            <label className="gt2-mes" htmlFor="gt-mes">
              <CalendarBlank size={17} />
              <select id="gt-mes" aria-label="Mês" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
                <option value="mes">{nomeMesAtual()}</option>
                {mesesFechados().map((m) => <option key={m.ref} value={`m:${m.ref}`}>{m.nome}</option>)}
              </select>
              <CaretDown size={14} />
            </label>
            <button type="button" className="gt2-btn" onClick={carregar} disabled={carregando}>
              <ArrowsClockwise size={17} /> Atualizar
            </button>
            <BotaoApresentar apresentador={userProfile} onErro={(texto) => setAviso({ tipo: "bad", texto })} />
            <button type="button" className="gt2-btn primario" onClick={() => setCriar(aba)}>
              <Plus size={17} weight="bold" /> Nova campanha
            </button>
          </div>
        </header>

        {erroGeral && <div className="gt-banner bad"><b>Não carregou.</b> {erroGeral}</div>}
        {aviso && (
          <div className={`gt-banner ${aviso.tipo}`} role="status">
            <span><b>{aviso.tipo === "good" ? "Pronto." : "Não foi possível."}</b> {aviso.texto}
              {aviso.link && <> <a href={aviso.link} target="_blank" rel="noreferrer">Abrir no Gerenciador de Anúncios <ArrowSquareOut size={12} /></a></>}
            </span>
            <button type="button" className="x" aria-label="Fechar aviso" onClick={() => setAviso(null)}>×</button>
          </div>
        )}
        {dados?.erros.google && <div className="gt-banner bad"><b>Google Ads:</b> {dados.erros.google}</div>}
        {dados?.erros.meta && <div className="gt-banner bad"><b>Meta Ads:</b> {dados.erros.meta}</div>}

        <div className="gt2-kpis">
          <div className="gt2-kpi"><span className="ico"><Coins size={24} weight="duotone" /></span><div>
            <p>Investimento no período</p><b>{carregando && !dados ? "…" : brl0(tot.gasto)}</b>
            <small>{dados ? `${dados.periodo.inicio.split("-").reverse().join("/")} a ${dados.periodo.fim.split("-").reverse().join("/")}` : ""}</small>
          </div></div>
          <div className="gt2-kpi"><span className="ico"><Storefront size={24} weight="duotone" /></span><div>
            <p>Faturamento do tráfego</p>
            <b>{!faturamento || faturamento.mes !== intervalo.inicio.slice(0, 7) ? "…" : faturamento.valor == null ? "—" : brl0(faturamento.valor)}</b>
            <small>{faturamento?.valor != null ? `notas emitidas · ${int(faturamento.clientes)} clientes${faturamento.roas ? ` · ROAS ${faturamento.roas.toFixed(1).replace(".", ",")}x` : ""}` : "notas emitidas no mês"}</small>
          </div></div>
          <div className="gt2-kpi"><span className="ico"><UsersThree size={24} weight="duotone" /></span><div>
            <p>Contatos gerados</p><b>{int(tot.contatos)}</b><small>conversões Google + conversas Meta</small>
          </div></div>
          <div className="gt2-kpi"><span className="ico"><Target size={24} weight="duotone" /></span><div>
            <p>Custo por contato</p><b>{tot.contatos ? brl(tot.cpl) : "—"}</b><small>média das duas plataformas</small>
          </div></div>
          <div className="gt2-kpi"><span className="ico"><Megaphone size={24} weight="duotone" /></span><div>
            <p>Campanhas ativas</p><b>{tot.ativasG + tot.ativasM}</b>
            <small className="gt2-dots"><span><i style={{ background: "var(--google)" }} />Google {tot.ativasG}</span><span><i style={{ background: "var(--meta)" }} />Meta {tot.ativasM}</span></small>
          </div></div>
        </div>

        {teto && <TetoPainel teto={teto} />}

        <PainelDiario inicio={intervalo.inicio} fim={intervalo.fim} fimMes={fimMes} recarregar={recarregarDiario} />

        <section className="gt2-campanhas">
          <div className="gt2-camp-head">
            <h2>Campanhas</h2>
            <div className="gt2-abas" role="tablist">
              {(["google", "meta"] as TrafegoPlataforma[]).map((p) => (
                <button key={p} type="button" role="tab" aria-selected={aba === p} onClick={() => setAba(p)}>
                  {p === "google" ? <LogoGoogle size="1.15em" /> : <LogoMeta size="1.15em" />}
                  {p === "google" ? "Google Ads" : "Meta Ads"}
                  <small>{campanhas.filter((c) => c.plataforma === p && c.status === "ENABLED").length}</small>
                </button>
              ))}
            </div>
            <div className="gt2-camp-ferr">
              <label className="gt2-busca" htmlFor="gt-busca">
                <MagnifyingGlass size={16} />
                <input id="gt-busca" placeholder="Buscar campanha..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              </label>
              <div className="gt2-filtro">
                <button type="button" className="gt2-btn" aria-expanded={filtroAberto} onClick={() => setFiltroAberto((v) => !v)}>
                  <Funnel size={16} /> Filtrar{mostrarPausadas ? " (1)" : ""}
                </button>
                {filtroAberto && (
                  <div className="gt2-menu">
                    <label className="gt-check">
                      <input type="checkbox" checked={mostrarPausadas} onChange={(e) => setMostrarPausadas(e.target.checked)} />
                      Mostrar pausadas sem gasto{ocultas > 0 && !mostrarPausadas ? ` (${ocultas})` : ""}
                    </label>
                  </div>
                )}
              </div>
              {aba === "google" && (
                <button type="button" className="gt2-btn" onClick={() => setProgramar({})}>
                  <CalendarBlank size={16} /> Dias e horários
                </button>
              )}
            </div>
          </div>

          <div className="gt2-tbl-wrap">
            <table className="gt2-tbl gt2-tbl-camp">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Ativa</th>
                  <th>Campanha</th>
                  <th>Estratégia</th>
                  <th>Orçamento/dia</th>
                  <th>Investido</th>
                  <th>Cliques</th>
                  <th>Contatos</th>
                  <th>Custo/contato</th>
                  <th style={{ width: 80 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {carregando && !dados && [0, 1, 2, 3].map((i) => <tr key={i}><td colSpan={9}><div className="gt-skel" /></td></tr>)}
                {dados && daAba.length === 0 && (
                  <tr><td colSpan={9} className="gt-empty">Nenhuma campanha {busca ? "encontrada" : "ativa ou com gasto no período"}.</td></tr>
                )}
                {daAba.map((c) => (
                  <LinhaCampanha
                    key={c.plataforma + c.id}
                    c={c}
                    valorEdicao={edicoes[c.id]}
                    custoMedio={custoMedio}
                    onEditar={(v) => setEdicoes((st) => ({ ...st, [c.id]: v }))}
                    onSalvar={() => pedirOrcamento(c)}
                    onStatus={() => pedirStatus(c)}
                    onAjuste={(a) => pedirAjuste(c, a)}
                    onProgramar={() => setProgramar({ inicial: c })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {confirmar && (
        <div className="gt-overlay" role="dialog" aria-modal="true" aria-label={confirmar.titulo} onClick={() => !executando && setConfirmar(null)}>
          <div className="gt-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{confirmar.titulo}</h3>
            <p>{confirmar.texto}</p>
            <dl className="gt-diff">
              {confirmar.linhas.map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
            </dl>
            <p className="gt-hint" style={{ marginTop: 10 }}>A alteração vai direto para a plataforma e fica registrada no histórico com o seu usuário.</p>
            <div className="gt-modal-foot">
              <button type="button" className="gt-btn ghost" onClick={() => setConfirmar(null)} disabled={executando}>Cancelar</button>
              <button type="button" className={`gt-btn${confirmar.perigo ? " danger" : ""}`} onClick={executar} disabled={executando}>
                {executando ? "Aplicando…" : confirmar.botao}
              </button>
            </div>
          </div>
        </div>
      )}

      {programar && (
        <ProgramacaoModal
          campanhas={campanhas.filter((c) => c.plataforma === "google" && (c.status === "ENABLED" || c.gasto > 0))}
          inicial={programar.inicial}
          onFechar={() => setProgramar(null)}
          onSalvo={async (texto) => {
            setProgramar(null);
            setAviso({ tipo: "good", texto });
            await carregar();
          }}
        />
      )}

      {ajusteImpacto && (
        <ImpactoAjusteModal
          campanha={ajusteImpacto.c}
          ajuste={ajusteImpacto.ajuste}
          onFechar={() => setAjusteImpacto(null)}
          onAplicado={async (texto) => {
            setAjusteImpacto(null);
            setAviso({ tipo: "good", texto });
            await carregar();
          }}
        />
      )}

      {criar && (
        <CriarCampanha
          plataforma={criar}
          folgaDiaria={teto ? Math.max(0, teto.limite / DIAS_MES - teto.diarioTotal) : null}
          onFechar={() => setCriar(null)}
          onCriada={async (texto, link) => {
            setCriar(null);
            setAviso({ tipo: "good", texto, link });
            setMostrarPausadas(true);
            await carregar();
          }}
        />
      )}
    </div>
  );
}

// ── Teto ────────────────────────────────────────────────────────────────────
function TetoPainel({ teto }: { teto: TrafegoListaResponse["teto"] }) {
  const usado = Math.min(1, teto.gastoMes / Math.max(1, teto.limite));
  // Escala da barra: o teto, ou a projeção quando passa dele (aí o teto vira uma marca).
  const escala = Math.max(teto.limite, teto.projecaoMes, 1);
  const acima = teto.projecaoMes > teto.limite;
  return (
    <section className="gt2-card gt2-teto" aria-label="Teto mensal">
      <div className="gt2-teto-topo">
        <h3>Teto mensal <b>{brl0(teto.limite)}</b></h3>
        <span className={`gt2-selo ${acima ? "alerta" : "ok"}`}>
          {acima ? <Warning size={16} weight="fill" /> : null}
          {acima ? "Projeção acima do teto" : "Dentro do teto"}
        </span>
      </div>
      <div className="gt2-barra" role="img" aria-label={`Gasto ${Math.round(usado * 100)}% do teto; projeção ${Math.round((teto.projecaoMes / teto.limite) * 100)}% do teto`}>
        <span>
          {/* Projeção do mês (laranja transparente) atrás do que já foi gasto (verde). */}
          <i className="proj" style={{ width: `${(teto.projecaoMes / escala) * 100}%` }} />
          <i className="gasto" style={{ width: `${(teto.gastoMes / escala) * 100}%` }} />
          {escala > teto.limite && <em className="limite" style={{ left: `${(teto.limite / escala) * 100}%` }} title="Teto" />}
        </span>
        <b>{Math.round(usado * 100)}%</b>
      </div>
      <div className="gt2-barra-leg"><span><i className="gasto" />Gasto</span><span><i className="proj" />Projeção do mês</span></div>
      <div className="gt2-teto-nums">
        <div><p>Investido no mês</p><b>{brl0(teto.gastoMes)}</b></div>
        <div><p>Projeção do mês</p><b className={acima ? "alerta" : ""}>{brl0(teto.projecaoMes)}</b></div>
        <div><p>Orçamento ativo</p><b>{brl(teto.diarioTotal)}/dia</b></div>
        <div><p>Máximo recomendado</p><b>{brl(teto.diarioMaximo)}/dia</b></div>
      </div>
    </section>
  );
}

// ── Linha da tabela ─────────────────────────────────────────────────────────
function LinhaCampanha({ c, valorEdicao, custoMedio, onEditar, onSalvar, onStatus, onAjuste, onProgramar }: {
  c: TrafegoCampanha;
  valorEdicao: string | undefined;
  custoMedio: number;
  onEditar: (v: string) => void;
  onSalvar: () => void;
  onStatus: () => void;
  onAjuste: (a: "lance-conversoes" | "presenca") => void;
  onProgramar: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ativa = c.status === "ENABLED";
  const cpl = c.contatos > 0 ? c.gasto / c.contatos : null;
  const editavel = c.plataforma === "google" ? !!c.orcamentoId && !c.orcamentoCompartilhado : !!c.orcamento?.alvoId;
  const valor = valorEdicao ?? (c.orcamentoDiario ? String(c.orcamentoDiario) : "");
  const mudou = valorEdicao !== undefined && Number(valorEdicao.replace(",", ".")) !== c.orcamentoDiario && Number(valorEdicao.replace(",", ".")) > 0;
  const caro = cpl != null && cpl > custoMedio * 1.15;
  const estrategia = c.plataforma === "google"
    ? `${ESTRATEGIA[c.lance || ""] || LANCES[c.lance || ""] || c.lance || "—"}${c.cpaDesejado ? " (CPA)" : ""}`
    : `${TIPOS[c.tipo] || c.tipo} · ${LANCES[c.lance || ""] || c.lance || "—"}`;
  // Correção com impacto calculado: o lance quando é "max. cliques", senão a localização.
  const ajuste: "lance-conversoes" | "presenca" | null = c.plataforma !== "google" ? null
    : c.lance === "TARGET_SPEND" ? "lance-conversoes" : c.localizacao === "PRESENCE_OR_INTEREST" ? "presenca" : null;

  return (
    <tr className={ativa ? "" : "off"}>
      <td>
        <button type="button" role="switch" aria-checked={ativa} aria-label={`${ativa ? "Pausar" : "Ativar"} ${c.nome}`} className="gt-switch" onClick={onStatus} />
      </td>
      <td>
        <span className="gt2-camp-nome" title={c.nome}><i className={ativa ? "on" : ""} />{nomeCurto(c.nome)}</span>
      </td>
      <td className="gt2-estr">{estrategia}</td>
      <td>
        {editavel ? (
          <span className="gt2-orc">
            R$
            <input
              inputMode="decimal"
              aria-label={`Orçamento diário de ${c.nome}`}
              value={valor}
              onChange={(e) => onEditar(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && mudou) onSalvar(); }}
            />
            {mudou && <button type="button" className="gt-btn small" onClick={onSalvar}>Salvar</button>}
          </span>
        ) : (
          <span title="Ajuste pelo painel da plataforma">{c.orcamentoDiario ? brl0(c.orcamentoDiario) : "—"}</span>
        )}
      </td>
      <td className="mono">{brl(c.gasto)}</td>
      <td className="mono">{int(c.cliques)}</td>
      <td className="mono">{c.contatos ? c.contatos.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : 0}</td>
      <td className="mono">
        {cpl == null ? "—" : caro
          ? <span className="gt2-cpl alerta" title="Acima da média"><Warning size={15} weight="fill" /> {cpl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          : <span className="gt2-cpl ok">{brl(cpl)}</span>}
      </td>
      <td>
        <span className="gt2-acoes-linha">
          <button type="button" aria-label={ajuste ? "Ver impacto da correção sugerida" : "Sem correção sugerida"} title={ajuste === "lance-conversoes" ? "Ver impacto: lance por conversões" : ajuste === "presenca" ? "Ver impacto: só quem está na cidade" : "Nenhuma correção sugerida"}
            disabled={!ajuste} onClick={() => ajuste && onAjuste(ajuste)}><ChartBar size={18} /></button>
          <span className="gt2-kebab">
            <button type="button" aria-label="Mais ações" aria-expanded={menu} onClick={() => setMenu((v) => !v)}><DotsThreeVertical size={18} weight="bold" /></button>
            {menu && (
              <div className="gt2-menu direita" onMouseLeave={() => setMenu(false)}>
                {c.plataforma === "google" && <button type="button" onClick={() => { setMenu(false); onProgramar(); }}>Dias e horários</button>}
                {c.plataforma === "google" && c.lance === "TARGET_SPEND" && <button type="button" onClick={() => { setMenu(false); onAjuste("lance-conversoes"); }}>Impacto: lance por conversões</button>}
                {c.plataforma === "google" && c.localizacao === "PRESENCE_OR_INTEREST" && <button type="button" onClick={() => { setMenu(false); onAjuste("presenca"); }}>Impacto: só quem está na cidade</button>}
                <button type="button" onClick={() => { setMenu(false); onStatus(); }}>{ativa ? "Pausar campanha" : "Ativar campanha"}</button>
              </div>
            )}
          </span>
        </span>
      </td>
    </tr>
  );
}

// ── Criar campanha ──────────────────────────────────────────────────────────
function Contador({ texto, max }: { texto: string; max: number }) {
  const linhas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const longas = linhas.filter((l) => l.length > max).length;
  return (
    <span className={`gt-count${longas ? " over" : ""}`}>
      {linhas.length} linha(s){longas ? ` · ${longas} passa(m) de ${max} caracteres` : ` · máx. ${max} caracteres cada`}
    </span>
  );
}

function CriarCampanha({ plataforma, folgaDiaria, onFechar, onCriada }: {
  plataforma: TrafegoPlataforma;
  folgaDiaria: number | null;
  onFechar: () => void;
  onCriada: (texto: string, link?: string) => void;
}) {
  const [qual, setQual] = useState<TrafegoPlataforma>(plataforma);
  const [g, setG] = useState(MODELO_GOOGLE);
  const [m, setM] = useState(MODELO_META);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const campoG = (k: keyof typeof MODELO_GOOGLE) => ({
    value: g[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setG((s) => ({ ...s, [k]: e.target.value })),
  });
  const campoM = (k: keyof typeof MODELO_META) => ({
    value: m[k],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setM((s) => ({ ...s, [k]: e.target.value })),
  });

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      if (qual === "google") {
        const r = await apiTrafegoCriarGoogle({ ...g, orcamentoDiario: Number(g.orcamentoDiario.replace(",", ".")) });
        onCriada(`Campanha "${g.nome}" criada PAUSADA no Google Ads (${r.cidades.map((c) => c.nome.split(",")[0]).join(", ")}). Revise e ative na lista quando quiser.`);
      } else {
        const r = await apiTrafegoCriarMeta({ ...m, orcamentoDiario: Number(m.orcamentoDiario.replace(",", ".")) });
        onCriada(`Campanha "${m.nome}" e o conjunto criados PAUSADOS na Meta (${r.cidade.nome}). Falta adicionar o anúncio (imagem/vídeo e texto) no Gerenciador.`, r.gerenciador);
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const orcamento = Number((qual === "google" ? g.orcamentoDiario : m.orcamentoDiario).replace(",", ".")) || 0;
  const passaTeto = folgaDiaria != null && orcamento > folgaDiaria;

  return (
    <div className="gt-overlay" role="dialog" aria-modal="true" aria-label="Nova campanha" onClick={() => !enviando && onFechar()}>
      <div className="gt-modal wide" onClick={(e) => e.stopPropagation()}>
        <h3>Nova campanha</h3>
        <p>A campanha nasce <b>pausada</b>. Nada é gasto até você ativá-la na lista, e a ativação passa pela trava do teto.</p>
        <div className="gt-seg" role="group" aria-label="Plataforma">
          <button type="button" aria-pressed={qual === "google"} onClick={() => setQual("google")}>Google · Pesquisa</button>
          <button type="button" aria-pressed={qual === "meta" && m.modelo === "whatsapp"} onClick={() => { setQual("meta"); setM((s) => ({ ...s, modelo: "whatsapp", nome: s.nome.replace("[MARCA] Reels", "[WPP] Ofertas") })); }}>Meta · WhatsApp</button>
          <button type="button" aria-pressed={qual === "meta" && m.modelo === "marca"} onClick={() => { setQual("meta"); setM((s) => ({ ...s, modelo: "marca", nome: s.nome.replace("[WPP] Ofertas", "[MARCA] Reels"), orcamentoDiario: "15" })); }}>Meta · Marca</button>
        </div>

        {qual === "google" ? (
          <div className="gt-form">
            <label className="full" htmlFor="gt-g-nome">Nome da campanha<input id="gt-g-nome" className="gt-input" {...campoG("nome")} /></label>
            <label htmlFor="gt-g-orc">Orçamento diário (R$)<input id="gt-g-orc" className="gt-input" inputMode="decimal" {...campoG("orcamentoDiario")} /></label>
            <label htmlFor="gt-g-cid">Cidades (separe por vírgula)<input id="gt-g-cid" className="gt-input" {...campoG("cidades")} /></label>
            <label htmlFor="gt-g-grupo">Grupo de anúncios<input id="gt-g-grupo" className="gt-input" {...campoG("grupo")} /></label>
            <label htmlFor="gt-g-url">URL final (página da categoria)<input id="gt-g-url" className="gt-input" {...campoG("urlFinal")} /></label>
            <label htmlFor="gt-g-p1">Caminho 1<input id="gt-g-p1" className="gt-input" maxLength={15} {...campoG("caminho1")} /></label>
            <label htmlFor="gt-g-p2">Caminho 2<input id="gt-g-p2" className="gt-input" maxLength={15} {...campoG("caminho2")} /></label>
            <label htmlFor="gt-g-kw">Palavras-chave — "frase" ou [exata], uma por linha<textarea id="gt-g-kw" rows={7} {...campoG("palavras")} /></label>
            <label htmlFor="gt-g-neg">Palavras negativas, uma por linha<textarea id="gt-g-neg" rows={7} {...campoG("negativas")} /></label>
            <label className="full" htmlFor="gt-g-tit">Títulos (3 a 15) <Contador texto={g.titulos} max={30} /><textarea id="gt-g-tit" rows={6} {...campoG("titulos")} /></label>
            <label className="full" htmlFor="gt-g-desc">Descrições (2 a 4) <Contador texto={g.descricoes} max={90} /><textarea id="gt-g-desc" rows={4} {...campoG("descricoes")} /></label>
            <label className="full" htmlFor="gt-g-suf">Sufixo do URL (UTM)<input id="gt-g-suf" className="gt-input" {...campoG("sufixoUrl")} /></label>
            <p className="gt-hint full" style={{ margin: 0 }}>Já vem configurada como no curso: rede de Pesquisa apenas, localização por presença, lance "maximizar conversões", idioma português.</p>
          </div>
        ) : (
          <div className="gt-form">
            <label className="full" htmlFor="gt-m-nome">Nome da campanha<input id="gt-m-nome" className="gt-input" {...campoM("nome")} /></label>
            <label htmlFor="gt-m-orc">Orçamento diário (R$)<input id="gt-m-orc" className="gt-input" inputMode="decimal" {...campoM("orcamentoDiario")} /></label>
            <label htmlFor="gt-m-cid">Cidade<input id="gt-m-cid" className="gt-input" {...campoM("cidade")} /></label>
            <label htmlFor="gt-m-raio">Raio (km)<input id="gt-m-raio" className="gt-input" inputMode="numeric" {...campoM("raioKm")} /></label>
            <label htmlFor="gt-m-idade">Idade mínima<input id="gt-m-idade" className="gt-input" inputMode="numeric" {...campoM("idadeMin")} /></label>
            <p className="gt-hint full" style={{ margin: 0 }}>
              {m.modelo === "whatsapp"
                ? "Engajamento → conversas no WhatsApp, público Advantage+ na região. Depois de criar, adicione os anúncios (card de oferta com preço, reels de balcão) no Gerenciador de Anúncios."
                : "Reconhecimento → alcance, no máximo 2 exibições por pessoa a cada 7 dias, só Reels e Stories. Depois de criar, adicione os vídeos no Gerenciador de Anúncios."}
            </p>
          </div>
        )}

        {passaTeto && (
          <div className="gt-banner info" style={{ marginTop: 14 }}>
            <span><b>Teto:</b> hoje sobram {brl(folgaDiaria || 0)}/dia no teto. Dá para criar, mas para ativar será preciso reduzir outra campanha.</span>
          </div>
        )}
        {erro && <div className="gt-banner bad" style={{ marginTop: 14 }}><span><b>Não foi possível.</b> {erro}</span></div>}

        <div className="gt-modal-foot">
          <button type="button" className="gt-btn ghost" onClick={onFechar} disabled={enviando}>Cancelar</button>
          <button type="button" className="gt-btn" onClick={enviar} disabled={enviando}>{enviando ? "Criando…" : "Criar pausada"}</button>
        </div>
      </div>
    </div>
  );
}
