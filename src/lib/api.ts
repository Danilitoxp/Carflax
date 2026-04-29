const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE = isLocal 
  ? "https://marketing-carflax.velbav.easypanel.host"
  : "/api-marketing";

const API_CAMPAIGN = isLocal
  ? "https://marketing-gestao-de-tempo.velbav.easypanel.host"
  : "/api-campaign";



async function get<T>(path: string, params?: Record<string, string>, base: string = API_BASE): Promise<T> {
  // Se base for um caminho relativo, usamos o origin do navegador
  const baseUrl = base.startsWith("http") ? base : window.location.origin + base;
  
  // CORREÇÃO: Evitar que o path com '/' resete a baseUrl
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const fullUrl = baseUrl.endsWith("/") ? `${baseUrl}${cleanPath}` : `${baseUrl}/${cleanPath}`;
  
  const url = new URL(fullUrl);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
  const baseUrl = API_BASE.startsWith("http") ? API_BASE : window.location.origin + API_BASE;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const fullUrl = baseUrl.endsWith("/") ? `${baseUrl}${cleanPath}` : `${baseUrl}/${cleanPath}`;

  const res = await fetch(fullUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...options
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

// ── Vendedores & Metas ────────────────────────────────────────────────────────

export interface VendedorResumo {
  COD_VENDEDOR: string;
  NOME_VENDEDOR: string;
  META: number | string;
  FATURADO: number | string;
  EM_ABERTO: number | string;
  TOTAL: number | string;
  ATINGIMENTO_PCT?: number | string;
  FALTANTE: number | string;
  CUSTO?: number | string;
  MARGEM_REAL?: number | string;
  MARGEM_REAL_PERC?: number | string;
  QTD_VENDAS: number;
  TICKET_MEDIO: number | string;
  CUSTO_EM_ABERTO?: number | string;
  QTD_ORCAMENTOS: number | string;
  ORC_FECHADOS?: number | string;
  TAXA_CONVERSAO?: number | string;
  MARGEM_PCT?: number | string;
  PRAZO_MEDIO_DIAS: number | string;
  PRAZO_MEDIO_DIAS_HOJE?: number | string;
  TOTAL_VENDIDO_HOJE: number | string;
  dias_trabalhados?: number;
}

export interface VendedoresResponse {
  mesano: string;
  dias_trabalhados: number;
  resumo: VendedorResumo[];
  detalhe?: unknown[];
  vendas_diarias?: unknown[];
  vendas_mensais?: unknown[];
}

export const apiVendedores = (mesano: string, vendedor?: string) =>
  get<VendedoresResponse>("/api/vendedores", { 
    mesano, 
    ...(vendedor ? { vendedor } : {}) 
  });

export const apiDashboardGeral = (vendedor?: string, data?: string) =>
  get<VendedorResumo[]>("/api/dashboard/geral", {
    ...(vendedor ? { vendedor } : {}),
    ...(data ? { data } : {})
  });

// ── Metas de Campanha (Elegíveis para Sorteio) ────────────────────────────────

export interface MetaVendedor {
  MES: string;
  COD_VENDEDOR: string;
  NOME_VENDEDOR: string;
  META_VENDEDOR: string;
  FATURAMENTO: string;
  PERC_META_BATIDA: string;
  avatar?: string;
}

export interface CampanhaMetasResponse {
  mesano: string;
  resumo: MetaVendedor[];
}

export const apiCampanhaMetas = (mesano: string) =>
  get<CampanhaMetasResponse>("/api/campanha-metas", { mesano }, API_CAMPAIGN);

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
  get<TrimestralResponse>("/api/campanha-metas-trimestral", { mesano }, API_CAMPAIGN);

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
  return Array.isArray(data) ? data : (data as { rows?: RankingVendedor[] }).rows ?? [];
};

// ── Entregas ──────────────────────────────────────────────────────────────────

export interface EntregaResumo {
  NF: string;
  CLIENTE: string;
  ENDERECO: string;
  BAIRRO: string;
  CIDADE: string;
  CEP: string;
  DATA_ENTREGA: string;
}

export interface DetalhesEntregaResponse {
  success: boolean;
  motoristas: { COD: string; NOME: string }[];
  data: EntregaResumo | null;
}

export const apiEntregasRomaneios = () => 
  get<{ success: boolean; data: EntregaResumo[]; error?: string }>("/api/entregas/romaneios");

export const apiEntregasConcluidas = () => 
  get<{ success: boolean; data: EntregaResumo[]; error?: string }>("/api/entregas/concluidas");

export const apiEntregasDetalhes = (nf: string) => 
  get<DetalhesEntregaResponse>(`/api/entregas/detalhes/${nf}`);

export const apiMotoristas = () => 
  get<DetalhesEntregaResponse>("/api/entregas");

// ── CRM ───────────────────────────────────────────────────────────────────────

export interface CrmItem {
  COD_PRODUTO: string;
  PRODUTO: string;
  QUANTIDADE: string | number;
  PRECO_UNITARIO: string | number;
  CUSTO_UNITARIO: string | number;
  MARKUP_PERCENTUAL: string | number;
  MARCA: string;
  UN: string;
}

export interface CrmOrcamento {
  ORCAMENTO: string;
  PEDIDO: string;
  NOTA_FISCAL?: string | number;
  DATA_ORCAMENTO: string;
  HORA_ORCAMENTO: string;
  COD_VENDEDOR: string;
  VENDEDOR: string;
  CLIENTE: string;
  EMPRESA: string;
  VALOR_TOTAL_ORCAMENTO: string;
  DATA_BAIXA: string;
  MOTIVO_CANCELAMENTO: string;
  PRODUTOS: CrmItem[];
}

export const apiCrmOrcamentos = (params: { vendedor?: string, inicio?: string, fim?: string }) =>
  get<CrmOrcamento[]>("/api/crm/orcamentos", params as Record<string, string>);

export const apiCrmStatus = (body: unknown) => post("/api/crm/status", body);

// ── Outros ────────────────────────────────────────────────────────────────────

export interface ProductInfo {
  COD_ITEM: string;
  DESCRICAO: string;
  MARCA: string;
  VALOR_CREDITO: number | string;
  VALOR_DEBITO: string | null;
  PRECO_VENDA: number | string;
  TOTAL_DISPONIVEL: number | string;
  ULT_ALT: string;
}

export const apiDashboardProdutos = (codigo?: string) =>
  get<ProductInfo[]>("/api/dashboard/produtos", {
    ...(codigo ? { codigo } : {})
  });

export const apiFornecedores = () => get("/api/fornecedores");
export const apiProdutos = () => get("/api/produtos");
export const apiClientes = () => get("/api/clientes");
export interface SqlResponse {
  success: boolean;
  data?: unknown[];
  error?: string;
}

export const apiAdminSQL = (query: string, signal?: AbortSignal) => 
  post<SqlResponse>("/api/admin/sql", { query, secret: "carflax_admin_2026" }, { signal });
export const apiAdminSchema = () => get<{ success: boolean, dbName: string, tables: { name: string, type: string }[] }>("/api/admin/sql/schema");
export const apiHealth = () => get<{ status: string }>("/api/health");

// ── Secullum Ponto Web (Integração Externa) ──────────────────────────────────
// Swagger: https://pontowebintegracaoexterna.secullum.com.br/docs/index.html

export interface SecullumTotalizadores {
  totalHorasTrabalhadas: string;
  totalHorasExtras: string;
  totalHorasFaltas: string;
  totalHorasAtrasos: string;
  totalDiasTrabalhados: number;
  totalFaltasDias: number;
}

export interface SecullumResponse {
  funcionarioNome: string;
  funcionarioCpf: string;
  totalizadores: SecullumTotalizadores;
}

const SECULLUM_AUTH_BASE = isLocal ? "/secullum-auth" : "https://autenticador.secullum.com.br";
const SECULLUM_API_BASE = isLocal ? "/secullum-api" : "https://pontowebintegracaoexterna.secullum.com.br";

/**
 * Autentica no Secullum e retorna o Bearer Token.
 */
export const loginSecullum = async (usuario: string, senha: string): Promise<string> => {
  const url = `${SECULLUM_AUTH_BASE}/Token`;
  const body = new URLSearchParams();
  body.append("grant_type", "password");
  body.append("username", usuario);
  body.append("password", senha);
  body.append("client_id", "3");

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: body.toString()
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Erro Login Secullum:", errorBody);
    throw new Error("Erro na autenticação Secullum");
  }
  const data = await res.json();
  return data.access_token;
};

/** 
 * Busca totais de assiduidade no Secullum para um período.
 */
export const apiSecullumTotais = async (params: {
  dataInicial: string;
  dataFinal: string;
  funcionarioCpf?: string;
  token: string;
  idBanco: string;
}): Promise<SecullumResponse[]> => {
  const url = `${SECULLUM_API_BASE}/IntegracaoExterna/Calcular/SomenteTotais`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Bearer ${params.token}`,
      "secullumidbancoselecionado": params.idBanco,
      "Accept-Language": "pt-BR",
      "Accept": "application/json"
    },
    body: JSON.stringify({
      dataInicial: params.dataInicial,
      dataFinal: params.dataFinal,
      ...(params.funcionarioCpf ? { funcionarioCpf: params.funcionarioCpf } : {})
    })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`Erro API Totais (${res.status}):`, errorBody);
    throw new Error(`Secullum API ${res.status}`);
  }
  return res.json();
};

export { API_BASE };
export const apiClientesFrv = async (dataInicio?: string, dataFim?: string) => {
  const params = new URLSearchParams();
  if (dataInicio) params.append("dataInicio", dataInicio);
  if (dataFim) params.append("dataFim", dataFim);
  
  const queryString = params.toString();
  return get(`/api/crm/clientes-frv${queryString ? `?${queryString}` : ""}`);
};
