const API_BASE =
  typeof window !== "undefined" && (window as any).__API_ORIGIN__
    ? (window as any).__API_ORIGIN__
    : import.meta.env.VITE_API_URL ||
      "https://marketing-gestao-de-tempo.velbav.easypanel.host";

console.log("[API] BASE:", API_BASE);

async function get<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

// ── Vendedores & Metas ────────────────────────────────────────────────────────

export interface VendedorResumo {
  COD_VENDEDOR: string;
  NOME_VENDEDOR: string;
  META: number;
  FATURADO: number;
  EM_ABERTO: number;
  TOTAL: number;
  ATINGIMENTO_PCT: number;
  FALTANTE: number;
  QTD_VENDAS: number;
  TICKET_MEDIO: number;
  QTD_ORCAMENTOS: number;
  TAXA_CONVERSAO: number;
  MARGEM_PCT: number;
  PRAZO_MEDIO_DIAS: number;
  TOTAL_VENDIDO_HOJE: number;
  dias_trabalhados?: number;
}

export interface VendedoresResponse {
  mesano: string;
  dias_trabalhados: number;
  resumo: VendedorResumo[];
  detalhe?: any[];
  vendas_diarias?: any[];
  vendas_mensais?: any[];
}

export const apiVendedores = (mesano: string, vendedor?: string) =>
  get<VendedoresResponse>("/api/vendedores", { 
    mesano, 
    ...(vendedor ? { vendedor } : {}) 
  });

// ── Metas de Campanha (Elegíveis para Sorteio) ────────────────────────────────

export interface MetaVendedor {
  MES: string;
  COD_VENDEDOR: string;
  NOME_VENDEDOR: string;
  META_VENDEDOR: string;
  FATURAMENTO: string;
  PERC_META_BATIDA: string;
}

export interface CampanhaMetasResponse {
  mesano: string;
  resumo: MetaVendedor[];
}

export const apiCampanhaMetas = (mesano: string) =>
  get<CampanhaMetasResponse>("/api/campanha-metas", { mesano });

/** Retorna apenas vendedores com ≥ 97% da meta (regra do gestao-de-tempo) */
export const apiElegiveisParaSorteio = async (mesano: string): Promise<MetaVendedor[]> => {
  const data = await apiCampanhaMetas(mesano);
  return data.resumo.filter((v) => parseFloat(v.PERC_META_BATIDA) >= 97);
};

// ── Bônus Trimestral ──────────────────────────────────────────────────────────

export interface MesDetalhe {
  mesano: string;
  META_VENDEDOR: number;
  FATURAMENTO: number;
  PERC_META_BATIDA: number;
}

export interface VendedorTrimestral {
  COD_VENDEDOR: string;
  NOME_VENDEDOR: string;
  meses_detalhe: MesDetalhe[];
}

export interface TrimestralResponse {
  trimestre: string;
  meses: string[];
  trimestre_completo: boolean;
  qualificados: VendedorTrimestral[];
}

export const apiCampanhaMetasTrimestral = (mesano: string) =>
  get<TrimestralResponse>("/api/campanha-metas-trimestral", { mesano });

// ── Ranking de Campanha ───────────────────────────────────────────────────────

export interface RankingVendedor {
  COD_VENDEDOR: string;
  NOME_VENDEDOR: string;
  FATURADO: string;
  QTD_VENDAS: number;
}

export const apiCampaignRanking = async (params: {
  fornecedor?: string;
  produto?: string;
  data_ini?: string;
  data_fim?: string;
}): Promise<RankingVendedor[]> => {
  const data = await get<{ rows: RankingVendedor[] } | RankingVendedor[]>(
    "/api/campaign-ranking",
    params as Record<string, string>
  );
  return Array.isArray(data) ? data : (data as any).rows ?? [];
};

// ── Entregas ──────────────────────────────────────────────────────────────────

export const apiEntregas = () => get("/api/entregas");
export const apiEntregasHoje = () => get("/api/entregas-hoje");

export const apiOtimizarRota = (body: { entregas: unknown[]; partida: unknown }) =>
  post("/api/otimizar-rota", body);

// ── CRM ───────────────────────────────────────────────────────────────────────

// API externa com campos corretos: ORCAMENTO, VALOR_ORCAMENTO, MARKUP_PERC, etc.
const CRM_EXTERNO = "https://marketing-banco-de-dados.velbav.easypanel.host";

export async function apiCrm(params?: Record<string, string>): Promise<unknown[]> {
  const url = new URL(`${CRM_EXTERNO}/api/crm`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`CRM API ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.data ?? [];
}

export const apiCrmStatus = (body: unknown) => post("/api/crm/status", body);

const CRM_LEGADO = "https://marketing-gestao-de-tempo.velbav.easypanel.host";

export interface CrmItem {
  COD_PRODUTO: string;
  PRODUTO: string;
  QTDITE: string;
  VALUNI: string;
  UN: string;
  TOTCUS: string;
}

export async function apiCrmItens(documento: string): Promise<CrmItem[]> {
  const res = await fetch(`${CRM_LEGADO}/api/crm/itens/${encodeURIComponent(documento)}`);
  if (!res.ok) throw new Error(`CRM Itens ${res.status}`);
  return res.json();
}

// ── Outros ────────────────────────────────────────────────────────────────────

export const apiFornecedores = () => get("/api/fornecedores");
export const apiProdutos = () => get("/api/produtos");
export const apiClientes = () => get("/api/clientes");
export const apiHealth = () => get<{ status: string }>("/api/health");

export { API_BASE };
