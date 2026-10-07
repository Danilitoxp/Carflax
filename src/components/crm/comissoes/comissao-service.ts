// Comissões do comercial — regra, dados e permissão.
//
// A regra é a da planilha "Comissão <mês>.xlsx" (uma aba por vendedor,
// preenchida na mão). A aba do THIAGO em setembro/2026 é o caso de referência
// usado para conferir este cálculo:
//
//   meta vendedor 63.868 · faturamento 67.282 · margem 40% · conversão 79,5%
//   faturamento loja 513.093 · margem loja 37,2% · meta loja 585.086,97
//   → índice 0,6% · comissão 403,69 · 3 bônus de 150 · total 853,69
//
// Nada aqui inventa número: faturamento, margem e meta saem do mesmo endpoint
// do painel Geral, e a conversão sai do mesmo buildPerdidoMap da tela de
// Orçamentos. Se a tela de Comissões divergir do painel, é bug — não é "outra
// conta".
import { supabase } from "@/lib/supabase";
import { apiDashboardGeral, apiDashboardMetas, type VendedorResumo } from "@/lib/api";
import { taxaConversaoValor } from "@/lib/crm-service";
import { buildPerdidoMap } from "@/lib/perdido-map";
import { montarTotalETimes, type OrgUser } from "@/lib/times-diretoria";
import { buildAvatarResolver } from "@/lib/avatar-by-code";

export interface ComissaoUserProfile {
  id?: string;
  name?: string;
  role?: string;
  department?: string;
  operator_code?: string;
  operatorCode?: string;
  is_admin?: boolean;
  is_leader?: boolean;
}

/** Faixa de faturamento → percentual de comissão. `max` null = sem teto. */
export interface FaixaComissao {
  min: number;
  max: number | null;
  pct: number;
}

export interface ComissaoParametros {
  id?: string;
  vigencia_inicio: string;
  /**
   * Meta de faturamento por equipe, indexada pelo id do supervisor. Equipe fora
   * do mapa usa a soma das metas dos próprios membros.
   */
  metas_equipe: Record<string, number>;
  meta_margem_bruta_pct: number;
  /** Meta de conversão da MESA (vendedor B2B). */
  meta_conversao_pct: number;
  /** Meta de conversão do BALCÃO (vendedor B2C). */
  meta_conversao_balcao_pct: number;
  meta_margem_loja_pct: number;
  bonus_valor: number;
  faixas: FaixaComissao[];
  observacao?: string | null;
  atualizado_em?: string;
  atualizado_por_nome?: string | null;
}

export const PARAMETROS_PADRAO: ComissaoParametros = {
  vigencia_inicio: "2026-09-01",
  // Balcão (equipe do Alan), a "meta loja" da planilha de setembro/2026.
  metas_equipe: { "342fb56e-1dfc-4644-8d16-d157a776b015": 585086.97 },
  meta_margem_bruta_pct: 37,
  meta_conversao_pct: 60,
  meta_conversao_balcao_pct: 60,
  meta_margem_loja_pct: 37,
  bonus_valor: 150,
  faixas: [
    { min: 0, max: 49999.99, pct: 0 },
    { min: 50000, max: 99999.99, pct: 0.6 },
    { min: 100000, max: 149999.99, pct: 0.7 },
    { min: 150000, max: 199999.99, pct: 0.8 },
    { min: 200000, max: 249999.99, pct: 0.9 },
    { min: 250000, max: 299999.99, pct: 1.0 },
    { min: 300000, max: 349999.99, pct: 1.1 },
    { min: 350000, max: null, pct: 1.2 },
  ],
};

// ─── Permissão ───────────────────────────────────────────────────────────────

/** Diretoria, gerência e admin veem a comissão de todo mundo. */
export function isDiretoria(p?: ComissaoUserProfile | null): boolean {
  const role = (p?.role || "").toUpperCase();
  return !!p?.is_admin || role === "ADMIN" || role.includes("DIRETOR") || role.includes("GERENTE");
}

/**
 * Supervisor: vê apenas o próprio time. Mesma definição do painel Geral —
 * cargo "supervisor" ou a flag de líder no cadastro.
 */
export function isSupervisorVendas(p?: ComissaoUserProfile | null): boolean {
  if (isDiretoria(p)) return false;
  const role = (p?.role || "").toUpperCase();
  return role.includes("SUPERVISOR") || p?.is_leader === true;
}

export function podeVerComissoes(p?: ComissaoUserProfile | null): boolean {
  return isDiretoria(p) || isSupervisorVendas(p);
}

// ─── Cálculo ─────────────────────────────────────────────────────────────────

/**
 * Índice da faixa onde o faturamento cai.
 *
 * A planilha compara com o TETO de cada faixa (`IF(B9<B27, C27, ...)`), então
 * quem fatura exatamente o teto já sobe de faixa. Reproduzimos isso: faixa cujo
 * `max` ainda é maior que o faturamento. Mudar para comparar com o `min` daria
 * centavos de diferença contra a planilha em valores de virada.
 */
export function indiceDaFaixa(faturado: number, faixas: FaixaComissao[]): number {
  const ordenadas = [...faixas].sort((a, b) => a.min - b.min);
  for (const f of ordenadas) {
    if (f.max === null || f.max === undefined) return f.pct;
    if (faturado < f.max) return f.pct;
  }
  return ordenadas.length ? ordenadas[ordenadas.length - 1].pct : 0;
}

export interface EntradaComissao {
  faturado: number;
  margemPct: number;
  conversaoPct: number;
  /** Faturamento da EQUIPE do vendedor (balcão, B2B…), não da empresa inteira. */
  faturamentoLoja: number;
  margemLojaPct: number;
  metaVendedor: number;
  metaLoja: number;
  /** Canal pelo cargo: B2B = mesa, B2C = balcão. Define a meta de conversão. */
  canal?: "mesa" | "balcao";
}

/** Meta de conversão do canal do vendedor. */
export const metaConversaoDe = (canal: EntradaComissao["canal"], p: ComissaoParametros) =>
  canal === "balcao" ? p.meta_conversao_balcao_pct : p.meta_conversao_pct;

/** Canal pelo cargo do cadastro: "Vendedor B2B" = mesa, "Vendedor B2C" = balcão. */
export function canalDoCargo(role?: string | null): "mesa" | "balcao" | undefined {
  const r = String(role || "").toUpperCase();
  if (r.includes("B2B")) return "mesa";
  if (r.includes("B2C")) return "balcao";
  return undefined;
}

// A meta de conversão do balcão é guardada dentro de `metas_equipe` (jsonb já
// versionado por vigência) com esta chave reservada — evita migration. Nunca é
// id de equipe, então não interfere nas metas de faturamento.
const CHAVE_CONVERSAO_BALCAO = "__conversao_balcao";

/**
 * Como a cascata deixou cada etapa:
 * - `alcancada`: bateu;
 * - `pendente`: é a etapa que travou — ela mesma não bateu, mas tudo antes bateu;
 * - `bloqueada`: veio depois do ponto onde travou, então nem chegou a ser avaliada.
 *
 * A diferença importa para o vendedor: "pendente" é no que ele tem de mexer
 * agora; "bloqueada" ele só destrava resolvendo a anterior.
 */
export type StatusBonus = "alcancada" | "pendente" | "bloqueada";

export interface BonusComissao {
  label: string;
  atingido: boolean;
  status: StatusBonus;
  valor: number;
  /** O que foi comparado, para a tela explicar por que não bateu. */
  realizado: string;
  alvo: string;
  /** Números crus do mesmo par, para as barras de progresso. */
  realizadoNum: number;
  alvoNum: number;
}

export interface ResultadoComissao {
  indicePct: number;
  valorComissao: number;
  bonus: BonusComissao[];
  totalBonus: number;
  total: number;
}

/**
 * Comissão + remuneração variável.
 *
 * Os 5 bônus são EM CASCATA, como na planilha: cada um só vale se o anterior
 * foi alcançado. Quem bate margem mas não bate faturamento não leva nada —
 * não é uma lista de condições independentes.
 *
 * A meta de faturamento é a única comparada com ">" (faturar exatamente a meta
 * não paga); as demais são ">=". É o que as fórmulas da planilha fazem.
 *
 * META ZERO NÃO BATE. Sem esta guarda, quem não tem meta cadastrada passava em
 * tudo: faturou R$ 78 > meta 0, margem alta porque a base é minúscula, conversão
 * 100% por não ter orçamento perdido, e a equipe dele (marketing, administrativo)
 * também sem meta — resultado, 5 bônus para quem não é comissionado.
 */
export function calcularComissao(e: EntradaComissao, p: ComissaoParametros): ResultadoComissao {
  const indicePct = indiceDaFaixa(e.faturado, p.faixas);
  const valorComissao = (e.faturado * indicePct) / 100;

  const bateuFaturamento = e.metaVendedor > 0 && e.faturado > e.metaVendedor;
  const bateuMargem = bateuFaturamento && e.margemPct >= p.meta_margem_bruta_pct;
  const metaConversao = metaConversaoDe(e.canal, p);
  const bateuConversao = bateuMargem && e.conversaoPct >= metaConversao;
  const bateuLoja = bateuConversao && e.metaLoja > 0 && e.faturamentoLoja >= e.metaLoja;
  const bateuMargemLoja = bateuLoja && e.margemLojaPct >= p.meta_margem_loja_pct;

  const pct = (v: number) => `${v.toFixed(1)}%`;
  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  const etapas: Omit<BonusComissao, "status" | "valor">[] = [
    { label: "Faturamento", atingido: bateuFaturamento, realizado: brl(e.faturado), alvo: brl(e.metaVendedor), realizadoNum: e.faturado, alvoNum: e.metaVendedor },
    { label: "Margem bruta", atingido: bateuMargem, realizado: pct(e.margemPct), alvo: pct(p.meta_margem_bruta_pct), realizadoNum: e.margemPct, alvoNum: p.meta_margem_bruta_pct },
    { label: "Conversão de orçamentos", atingido: bateuConversao, realizado: pct(e.conversaoPct), alvo: pct(metaConversao), realizadoNum: e.conversaoPct, alvoNum: metaConversao },
    { label: "Faturamento da equipe", atingido: bateuLoja, realizado: brl(e.faturamentoLoja), alvo: brl(e.metaLoja), realizadoNum: e.faturamentoLoja, alvoNum: e.metaLoja },
    { label: "Margem da equipe", atingido: bateuMargemLoja, realizado: pct(e.margemLojaPct), alvo: pct(p.meta_margem_loja_pct), realizadoNum: e.margemLojaPct, alvoNum: p.meta_margem_loja_pct },
  ];

  // A primeira etapa que não bateu é a "pendente"; as seguintes ficam bloqueadas
  // por ela, não por mérito próprio.
  let travou = false;
  const bonus: BonusComissao[] = etapas.map((et) => {
    let status: StatusBonus;
    if (et.atingido) status = "alcancada";
    else if (!travou) { status = "pendente"; travou = true; }
    else status = "bloqueada";
    return { ...et, status, valor: et.atingido ? p.bonus_valor : 0 };
  });

  const totalBonus = bonus.reduce((acc, b) => acc + b.valor, 0);
  return { indicePct, valorComissao, bonus, totalBonus, total: valorComissao + totalBonus };
}

// ─── Parâmetros ──────────────────────────────────────────────────────────────

function normalizarFaixas(raw: unknown): FaixaComissao[] {
  if (!Array.isArray(raw)) return PARAMETROS_PADRAO.faixas;
  const faixas = raw
    .map((f) => {
      const o = f as { min?: unknown; max?: unknown; pct?: unknown };
      return {
        min: Number(o.min) || 0,
        max: o.max === null || o.max === undefined ? null : Number(o.max),
        pct: Number(o.pct) || 0,
      };
    })
    .sort((a, b) => a.min - b.min);
  return faixas.length ? faixas : PARAMETROS_PADRAO.faixas;
}

/**
 * Parâmetros vigentes no mês: a linha mais recente cuja vigência já começou.
 * Mudar a regra hoje não reescreve a comissão de um mês já fechado.
 */
export async function carregarParametros(mesRef: Date): Promise<ComissaoParametros> {
  const primeiroDia = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, "0")}-01`;
  const { data, error } = await supabase
    .from("comissao_parametros")
    .select("*")
    .lte("vigencia_inicio", primeiroDia)
    .order("vigencia_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return { ...PARAMETROS_PADRAO };
  const row = data as Record<string, unknown>;
  const metasEquipe: Record<string, number> = {};
  // Tabela antiga (antes da migration 20261007120000) só tem meta_loja: era a
  // meta do balcão. Usa ela enquanto metas_equipe não existir.
  if (row.metas_equipe === undefined && Number(row.meta_loja) > 0) {
    row.metas_equipe = { ...PARAMETROS_PADRAO.metas_equipe, "342fb56e-1dfc-4644-8d16-d157a776b015": Number(row.meta_loja) };
  }
  let conversaoBalcao: number | undefined;
  for (const [k, v] of Object.entries((row.metas_equipe as Record<string, unknown>) || {})) {
    const n = Number(v);
    if (k === CHAVE_CONVERSAO_BALCAO) { if (Number.isFinite(n)) conversaoBalcao = n; continue; }
    if (Number.isFinite(n)) metasEquipe[k] = n;
  }
  return {
    id: String(row.id),
    vigencia_inicio: String(row.vigencia_inicio),
    metas_equipe: metasEquipe,
    meta_margem_bruta_pct: Number(row.meta_margem_bruta_pct),
    meta_conversao_pct: Number(row.meta_conversao_pct),
    // Vigência antiga, sem a meta do balcão: usa a mesma da mesa (regra única de antes).
    meta_conversao_balcao_pct: conversaoBalcao ?? Number(row.meta_conversao_pct),
    meta_margem_loja_pct: Number(row.meta_margem_loja_pct),
    bonus_valor: Number(row.bonus_valor),
    faixas: normalizarFaixas(row.faixas),
    observacao: (row.observacao as string) ?? null,
    atualizado_em: row.atualizado_em as string,
    atualizado_por_nome: (row.atualizado_por_nome as string) ?? null,
  };
}

/**
 * Grava os parâmetros NA VIGÊNCIA DO MÊS EM TELA (dia 1). Editar olhando
 * outubro cria/atualiza a vigência de outubro e deixa setembro como estava —
 * é o que impede uma mudança de regra de mexer em comissão já paga.
 */
export async function salvarParametros(
  mesRef: Date,
  p: ComissaoParametros,
  usuario?: { id?: string; name?: string },
): Promise<void> {
  const vigencia = `${mesRef.getFullYear()}-${String(mesRef.getMonth() + 1).padStart(2, "0")}-01`;
  const { error } = await supabase.from("comissao_parametros").upsert(
    {
      vigencia_inicio: vigencia,
      metas_equipe: { ...p.metas_equipe, [CHAVE_CONVERSAO_BALCAO]: p.meta_conversao_balcao_pct },
      meta_margem_bruta_pct: p.meta_margem_bruta_pct,
      meta_conversao_pct: p.meta_conversao_pct,
      meta_margem_loja_pct: p.meta_margem_loja_pct,
      bonus_valor: p.bonus_valor,
      faixas: p.faixas,
      atualizado_em: new Date().toISOString(),
      atualizado_por: usuario?.id ?? null,
      atualizado_por_nome: usuario?.name ?? null,
    },
    { onConflict: "vigencia_inicio" },
  );
  if (error) throw new Error(error.message);
}

// ─── Linhas da tela ──────────────────────────────────────────────────────────

export interface LinhaComissao {
  codVendedor: string;
  nome: string;
  avatar?: string | null;
  equipeId: string;
  entrada: EntradaComissao;
  resultado: ResultadoComissao;
}

/** Equipe de venda (supervisor + liderados) — a "loja" dos bônus 4 e 5. */
export interface EquipeComissao {
  id: string;
  nome: string;
  faturamento: number;
  margemPct: number;
  meta: number;
  /** A meta veio do cadastro de parâmetros, não da soma das metas dos membros. */
  metaCadastrada: boolean;
}

export const SEM_EQUIPE = "SEM_EQUIPE";

export interface DadosComissoes {
  linhas: LinhaComissao[];
  equipes: EquipeComissao[];
  parametros: ComissaoParametros;
  /** Conversão ainda carregando/indisponível → a tela avisa em vez de pagar bônus errado. */
  conversaoIndisponivel: boolean;
}

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Códigos de vendedor que este usuário pode ver. Null = todos (diretoria). */
function codigosDoEscopo(perfil: ComissaoUserProfile, usuarios: OrgUser[]): string[] | null {
  if (isDiretoria(perfil)) return null;

  const meuCodigo = (perfil.operator_code || perfil.operatorCode || "").trim();
  if (!perfil.id) return meuCodigo ? [meuCodigo] : [];

  const codigos = usuarios
    .filter((u) => u.responsavel_id === perfil.id)
    .map((u) => String(u.operator_code || "").trim())
    .filter(Boolean);

  // O supervisor também vende e tem meta, então entra no próprio time — mesma
  // regra do seletor "Meu Time" no painel Geral.
  if (meuCodigo && !codigos.includes(meuCodigo)) codigos.push(meuCodigo);
  return codigos;
}

export async function carregarComissoes(
  mesRef: Date,
  perfil: ComissaoUserProfile,
): Promise<DadosComissoes> {
  const yyyy = mesRef.getFullYear();
  const mm = String(mesRef.getMonth() + 1).padStart(2, "0");
  const ultimoDia = new Date(yyyy, mesRef.getMonth() + 1, 0).getDate();
  const inicio = `${yyyy}-${mm}-01`;
  const fim = `${yyyy}-${mm}-${String(ultimoDia).padStart(2, "0")}`;
  // O endpoint do painel recebe UM dia e devolve o mês dele até ali. Para um mês
  // fechado isso é o último dia; para o mês corrente, hoje.
  const hoje = new Date();
  const mesCorrente = hoje.getFullYear() === yyyy && hoje.getMonth() === mesRef.getMonth();
  const dataRef = mesCorrente
    ? `${yyyy}-${mm}-${String(hoje.getDate()).padStart(2, "0")}`
    : fim;

  const [resumo, metas, parametros, usuariosRes] = await Promise.all([
    apiDashboardGeral(undefined, dataRef).catch(() => [] as VendedorResumo[]),
    apiDashboardMetas(dataRef).catch(() => [] as { COD_VENDEDOR: string; META: number | string }[]),
    carregarParametros(mesRef),
    supabase.from("usuarios").select("id, operator_code, name, role, responsavel_id, is_leader, avatar"),
  ]);

  const perdidoMap = await buildPerdidoMap(inicio, fim).catch(() => null);

  const usuarios = (usuariosRes.data || []) as OrgUser[];
  const escopo = codigosDoEscopo(perfil, usuarios);
  // Avatar pelo código exato: "050" (vendedor) e "00050" (motorista) colidem ao
  // tirar os zeros e trocariam de foto.
  const avatarDe = buildAvatarResolver(
    (usuariosRes.data || []) as { operator_code?: string | null; avatar?: string | null }[],
  );

  const metaMap = new Map<string, number>(
    (metas || []).map((m) => [String(m.COD_VENDEDOR).trim(), num(m.META)]),
  );

  // Times exatamente como o painel Geral e o Gestor montam — se divergir aqui,
  // o supervisor vê um faturamento de equipe na comissão e outro no painel.
  const { teamTotals, individuais, semLinha } = montarTotalETimes(resumo || [], usuarios, metaMap);
  const todosIndividuais = [...individuais.filter((r) => !r.COD_VENDEDOR.startsWith("TEAM:")), ...semLinha];

  // Cada vendedor pertence à equipe que o lista em MEMBER_CODES.
  const equipePorCodigo = new Map<string, VendedorResumo>();
  for (const t of teamTotals) {
    for (const c of t.MEMBER_CODES || []) equipePorCodigo.set(String(c).trim(), t);
  }

  const noEscopo = escopo
    ? todosIndividuais.filter((r) => escopo.includes(String(r.COD_VENDEDOR).trim()))
    : todosIndividuais;

  // Só entra quem tem meta no mês. O /api/dashboard/geral devolve uma linha para
  // QUALQUER operador que movimentou algo no ERP — inclusive marketing e
  // administrativo, que às vezes emitem uma nota. Sem meta não há comissão a
  // calcular, e deixá-los na lista fazia a tela "pagar" bônus a quem não é
  // comissionado.
  const visiveis = noEscopo.filter((r) => {
    const cod = String(r.COD_VENDEDOR).trim();
    return (metaMap.get(cod) ?? num(r.META)) > 0;
  });

  const equipesUsadas = new Map<string, EquipeComissao>();
  const cargoPorCodigo = new Map(usuarios.map((u) => [String(u.operator_code || "").trim(), u.role]));

  const linhas: LinhaComissao[] = visiveis
    .map((r) => {
      const cod = String(r.COD_VENDEDOR).trim();
      const faturado = num(r.FATURADO);
      const perdido = perdidoMap?.get(cod) ?? 0;

      const time = equipePorCodigo.get(cod);
      const equipeId = time ? String(time.COD_VENDEDOR).replace("TEAM:", "") : SEM_EQUIPE;
      const metaCadastrada = parametros.metas_equipe[equipeId];
      const equipe: EquipeComissao = {
        id: equipeId,
        nome: time?.NOME_VENDEDOR || "Sem equipe",
        faturamento: num(time?.FATURADO),
        margemPct: num(time?.MARGEM_REAL_PERC || time?.MARGEM_PCT),
        meta: metaCadastrada ?? num(time?.META),
        metaCadastrada: metaCadastrada !== undefined,
      };
      if (!equipesUsadas.has(equipeId)) equipesUsadas.set(equipeId, equipe);

      const entrada: EntradaComissao = {
        faturado,
        margemPct: num(r.MARGEM_REAL_PERC || r.MARGEM_PCT),
        conversaoPct: taxaConversaoValor(faturado, perdido),
        faturamentoLoja: equipe.faturamento,
        margemLojaPct: equipe.margemPct,
        metaVendedor: metaMap.get(cod) ?? num(r.META),
        metaLoja: equipe.meta,
        canal: canalDoCargo(cargoPorCodigo.get(cod)),
      };
      return {
        codVendedor: cod,
        nome: r.NOME_VENDEDOR || cod,
        avatar: avatarDe(cod) ?? r.avatar ?? null,
        equipeId,
        entrada,
        resultado: calcularComissao(entrada, parametros),
      };
    })
    .sort((a, b) => b.resultado.total - a.resultado.total);

  return {
    linhas,
    equipes: [...equipesUsadas.values()].sort((a, b) => b.faturamento - a.faturamento),
    parametros,
    conversaoIndisponivel: !perdidoMap,
  };
}
