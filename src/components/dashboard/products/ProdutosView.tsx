import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  ArrowUpDown,
  Tag,
  ChevronUp,
  ChevronDown,
  ShoppingBag,
  Upload,
  Printer,
  FileSpreadsheet,
  BarChart3,
  Loader2,
  Settings
} from "lucide-react";
import { SiShopify } from "react-icons/si";
import { cn } from "@/lib/utils";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import { TinyLoader } from "@/components/ui/TinyLoader";
import { apiDashboardProdutos, apiCaditeExportar, type ProductInfo } from "@/lib/api";
import { ShopifyEnvioModal, type ItemEnvio } from "./ShopifyEnvioModal";
import { EtiquetaPrecoModal } from "./EtiquetaPrecoModal";
import { ExportarColunasModal } from "./ExportarColunasModal";
import { useNotification } from "@/hooks/useNotification";
import { imprimirEtiquetasPreco } from "@/lib/impressao-local";
import {
  getShopifyCatalog,
  normalizeSku,
  type ResultadoEnvio,
  type ShopifyVariantInfo,
} from "@/lib/shopify-sync";

/** Situação do vínculo ERP ↔ loja de um produto. */
type SyncStatus = "sincronizado" | "divergente" | "fora";

const SHOPIFY_FILTROS = [
  "Shopify: Todos",
  "Sincronizados",
  "Divergentes",
  "Fora da loja",
] as const;

const SHOPIFY_ADMIN = "https://admin.shopify.com/store/gfpdzv-y0/products";

/**
 * O vínculo existe quando o SKU da variante bate com o código do item.
 * "Funcionando" exige, além do vínculo, preço igual (tolerância de 5 centavos,
 * a mesma do sinc.js) e estoque igual quando a loja gerencia estoque.
 */
function avaliarSync(
  cod: string,
  stock: number,
  price: number,
  catalogo: Map<string, ShopifyVariantInfo>,
): { status: SyncStatus; loja?: ShopifyVariantInfo } {
  const loja = catalogo.get(normalizeSku(cod));
  if (!loja) return { status: "fora" };

  const precoOk = Math.abs(loja.price - price) <= 0.05;
  const estoqueOk = !loja.gerenciaEstoque || loja.stock === Math.max(0, Math.floor(stock));

  return { status: precoOk && estoqueOk ? "sincronizado" : "divergente", loja };
}

interface SyncBadgeProps {
  status?: SyncStatus;
  loja?: ShopifyVariantInfo;
  carregando: boolean;
  erpPrice: number;
  erpStock: number;
  onEnviar: () => void;
}

/**
 * Três estados, sem texto na linha:
 * · nunca enviado  → ícone de envio (a ação disponível é criar na loja)
 * · na loja, desatualizado → logo da Shopify apagado
 * · na loja e em dia       → logo da Shopify em cor cheia
 * O porquê fica no title, sem poluir a linha.
 */
function SyncBadge({ status, loja, carregando, erpPrice, erpStock, onEnviar }: SyncBadgeProps) {
  if (carregando) {
    return <div className="h-4 w-4 bg-secondary/50 rounded mx-auto animate-pulse" />;
  }

  // Nunca foi enviado: não faz sentido mostrar o logo da loja, e sim a ação.
  if (!loja) {
    return (
      <button
        onClick={onEnviar}
        title="Não está na loja — clique para enviar como rascunho"
        className="inline-flex items-center justify-center text-muted-foreground/40 hover:text-emerald-500 transition-colors"
      >
        <Upload className="w-4 h-4" />
      </button>
    );
  }

  const sincronizado = status === "sincronizado";

  const divergencias = [
    Math.abs(loja.price - erpPrice) > 0.05
      ? `preço loja R$ ${loja.price.toFixed(2)} × ERP R$ ${erpPrice.toFixed(2)}`
      : "",
    loja.gerenciaEstoque && loja.stock !== Math.max(0, Math.floor(erpStock))
      ? `estoque loja ${loja.stock} × ERP ${Math.max(0, Math.floor(erpStock))}`
      : "",
  ].filter(Boolean).join(" · ");

  const rascunho = loja.status !== "active";

  const titulo = sincronizado
    ? `SKU ${loja.sku} sincronizado${rascunho ? " (rascunho na loja)" : ""} — abrir na Shopify`
    : `SKU ${loja.sku} desatualizado: ${divergencias} — clique para reenviar`;

  const icone = (
    <SiShopify
      className={cn(
        "w-4 h-4 transition-all",
        sincronizado
          ? "text-[#95BF47]"
          : "text-muted-foreground/30 group-hover/shopify:text-muted-foreground/60",
      )}
    />
  );

  // Em dia, o clique leva ao produto na loja; desatualizado, o clique é a ação
  // que resolve — reenviar preço e estoque.
  return sincronizado ? (
    <a
      href={`${SHOPIFY_ADMIN}/${loja.productId}`}
      target="_blank"
      rel="noreferrer"
      title={titulo}
      className="group/shopify inline-flex items-center justify-center"
    >
      {icone}
    </a>
  ) : (
    <button
      onClick={onEnviar}
      title={titulo}
      className="group/shopify inline-flex items-center justify-center"
    >
      {icone}
    </button>
  );
}

const CURVA_FILTROS = ["Curva: Todas", "Curva A", "Curva B", "Curva C"] as const;

// Campos fiscais da CADITE com nome amigável na lista de colunas.
const CAMPOS_CADITE_NOMEADOS: Record<string, { campo: string; label: string; formato?: (v: string | number) => string | number }> = {
  ncm: { campo: "ITE_CLAIPI", label: "NCM" },
  ativo: { campo: "ITE_ITEATI", label: "Ativo", formato: (v) => (v === "S" ? "Sim" : v === "N" ? "Não" : v) },
};

// Colunas com código + descrição: a chave da coluna → o campo de código na CADITE.
const CAMPOS_COM_DESCRICAO: Record<string, string> = { classFiscal: "ITE_CODABF", cest: "ITE_CDCEST" };

const COLUNAS_PADRAO = ["cod", "desc", "brand", "codFornecedor", "stock", "media", "debit", "shopify", "etiqueta"];

const valorCadite = (v: unknown): string | number => {
  if (v == null) return "";
  if (typeof v === "number") return v;
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleDateString("pt-BR");
  return String(v).trim();
};

interface ColunaTabela {
  key: string;
  label: string;
  wch: number;
  align: "left" | "center" | "right";
  num?: string;
  sort?: keyof Product;
  valor: (p: Product) => string | number;
  render?: (p: Product) => React.ReactNode;
  soTela?: boolean;
  extraPlanilha?: { label: string; wch: number; valor: (p: Product) => string | number };
}

interface Product {
  cod: string;
  desc: string;
  stock: number;
  sales: number;
  media: number;
  debit: number;
  credit: number;
  brand: string;
  location: string;
  codFornecedor: string;
  fornecedor: string;
}

export function ProdutosView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("Todas as Marcas");
  const [filterStock, setFilterStock] = useState("TODOS");
  const [filterCurva, setFilterCurva] = useState<string>(CURVA_FILTROS[0]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>({ key: 'cod', direction: 'asc' });
  const [filterShopify, setFilterShopify] = useState<string>(SHOPIFY_FILTROS[0]);
  const [shopifyMap, setShopifyMap] = useState<Map<string, ShopifyVariantInfo>>(new Map());
  const [shopifyLoading, setShopifyLoading] = useState(true);
  const [envio, setEnvio] = useState<ItemEnvio[] | null>(null);
  const [etiquetasAberto, setEtiquetasAberto] = useState(false);
  const [colunasAberto, setColunasAberto] = useState(false);
  const [colunasTela, setColunasTela] = useState<string[]>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("produtos-colunas-tela") || "null");
      if (Array.isArray(v) && v.length) return v as string[];
    } catch { /* sem storage: usa o padrão */ }
    return COLUNAS_PADRAO;
  });
  // Campos da CADITE escolhidos na engrenagem, por código do produto.
  const [caditeDados, setCaditeDados] = useState<Map<string, Record<string, unknown>>>(new Map());
  // Ícone da linha imprime 1 etiqueta direto, sem abrir a janela de lote.
  const [imprimindoCod, setImprimindoCod] = useState<string | null>(null);
  const { showNotification } = useNotification();

  const imprimirEtiqueta = async (p: Product) => {
    if (imprimindoCod) return;
    setImprimindoCod(p.cod);
    try {
      const r = await imprimirEtiquetasPreco([{ cod: p.cod, desc: p.desc, debit: p.debit, credit: p.credit, quantidade: 1 }]);
      showNotification("success", "Etiqueta enviada", `${p.desc} → ${r.impressora || "impressora padrão"}.`);
    } catch (e) {
      showNotification("error", "Não foi possível imprimir", (e as Error).message);
    } finally {
      setImprimindoCod(null);
    }
  };

  const requestSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setVisibleCount(50);
  };

  /**
   * Busca os produtos no ERP. `silencioso` evita o esqueleto de carregamento nas
   * atualizações automáticas — a tabela só troca de conteúdo quando a resposta chega.
   */
  const carregarProdutos = useCallback(async (silencioso = false) => {
      try {
        if (!silencioso) setLoading(true);
        const response = await apiDashboardProdutos();

        if (response && response.length > 0) {
          const mapped = response.map((p: ProductInfo) => {
            const precoVenda = typeof p.PRECO_VENDA === 'string' ? parseFloat(p.PRECO_VENDA) : Number(p.PRECO_VENDA || 0);
            return {
              cod: p.COD_ITEM,
              desc: p.DESCRICAO,
              stock: typeof p.TOTAL_DISPONIVEL === 'string' ? parseFloat(p.TOTAL_DISPONIVEL) : Number(p.TOTAL_DISPONIVEL || 0),
              sales: typeof p.TOTAL_VENDIDO === 'string' ? parseFloat(p.TOTAL_VENDIDO) : Number(p.TOTAL_VENDIDO || 0),
              media: typeof p.MEDIA === 'string' ? parseFloat(p.MEDIA) : Number(p.MEDIA || 0),
              debit: precoVenda,
              // 4,67% sobre o à vista: é o fator do ERP (ITE_PREUVE/ITE_PREVE1 na
              // maioria dos itens) e o que sai na etiqueta da loja (359,90 → 376,71).
              credit: Math.round(precoVenda * 1.0467 * 100) / 100,
              brand: p.MARCA || "GERAL",
              location: "---",
              codFornecedor: p.COD_FORNECEDOR || "",
              fornecedor: p.FORNECEDOR || ""
            };
          }).filter((p) => p.cod !== "99999")
            .sort((a, b) => Number(a.cod) - Number(b.cod));
          setProducts(mapped);
        }
      } catch (error) {
        console.error("[Products] Erro ao carregar:", error);
      } finally {
        if (!silencioso) setLoading(false);
      }
  }, []);

  const carregarShopify = useCallback(async (force = false, silencioso = false) => {
    if (!silencioso) setShopifyLoading(true);
    try {
      setShopifyMap(await getShopifyCatalog(force));
    } catch (error) {
      console.error("[Products] Erro ao carregar catálogo Shopify:", error);
    } finally {
      if (!silencioso) setShopifyLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarProdutos();
    carregarShopify();
  }, [carregarProdutos, carregarShopify]);

  /**
   * O ERP é MySQL consultado por API — não há realtime. Para que uma alteração
   * feita no ERP apareça aqui sem F5: recarrega ao voltar para a aba e a cada
   * 60s enquanto a tela estiver visível. O catálogo da Shopify vem do cache e
   * só é refeito no botão de atualizar.
   */
  useEffect(() => {
    const recarregar = () => {
      if (document.visibilityState !== "visible") return;
      carregarProdutos(true);
    };

    window.addEventListener("focus", recarregar);
    document.addEventListener("visibilitychange", recarregar);
    const timer = window.setInterval(recarregar, 60_000);

    return () => {
      window.removeEventListener("focus", recarregar);
      document.removeEventListener("visibilitychange", recarregar);
      window.clearInterval(timer);
    };
  }, [carregarProdutos]);

  /**
   * Depois de enviar, a resposta da própria Shopify já diz como a variante ficou.
   * Aplicar isso no mapa local troca o ícone na hora — reler o catálogo inteiro
   * não resolvia porque a listagem demora alguns segundos para devolver o produto
   * recém-criado, e o ícone só mudava no F5 seguinte.
   */
  const aplicarResultadoEnvio = useCallback((resultados: ResultadoEnvio[]) => {
    const novas = resultados.filter((r) => r.ok && r.variante).map((r) => r.variante!);
    if (novas.length === 0) return;
    setShopifyMap((atual) => {
      const proximo = new Map(atual);
      for (const v of novas) proximo.set(normalizeSku(v.sku), v);
      return proximo;
    });
  }, []);

  const brands = useMemo(() => ["Todas as Marcas", ...Array.from(new Set(products.map(p => p.brand))).sort()], [products]);

  /** Status de cada produto por código — recalculado quando a loja ou o ERP muda. */
  const syncPorCod = useMemo(() => {
    const m = new Map<string, { status: SyncStatus; loja?: ShopifyVariantInfo }>();
    for (const p of products) {
      m.set(p.cod, avaliarSync(p.cod, p.stock, p.debit, shopifyMap));
    }
    return m;
  }, [products, shopifyMap]);

  const totaisShopify = useMemo(() => {
    let sincronizado = 0, divergente = 0, fora = 0;
    for (const s of syncPorCod.values()) {
      if (s.status === "sincronizado") sincronizado++;
      else if (s.status === "divergente") divergente++;
      else fora++;
    }
    return { sincronizado, divergente, fora };
  }, [syncPorCod]);

  const [visibleCount, setVisibleCount] = useState(50);

  // Curva ABC pelo faturamento estimado (média mensal de saída dos últimos 3
  // meses × preço à vista). O ERP não guarda a classificação. A = itens que
  // somam os primeiros 80% do faturamento, B = até 95%, C = o resto (inclui
  // quem não vendeu nada no período).
  const curvaPorCod = useMemo(() => {
    const mapa = new Map<string, "A" | "B" | "C">();
    const comVenda = products
      .map((p) => ({ cod: p.cod, fat: Math.max(0, p.media) * Math.max(0, p.debit) }))
      .filter((x) => x.fat > 0)
      .sort((a, b) => b.fat - a.fat);
    const total = comVenda.reduce((s, x) => s + x.fat, 0);
    let acumulado = 0;
    for (const x of comVenda) {
      const antes = acumulado / total;
      acumulado += x.fat;
      mapa.set(x.cod, antes < 0.8 ? "A" : antes < 0.95 ? "B" : "C");
    }
    return mapa;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter(p => {
      const searchLower = searchTerm.trim().toLowerCase();
      const words = searchLower.split(/\s+/).filter(Boolean);
      
      const matchesSearch = words.length === 0 || 
        words.every(word => p.desc.toLowerCase().includes(word)) || 
        p.cod.toLowerCase().includes(searchLower);

      const matchesBrand = filterBrand === "Todas as Marcas" || p.brand === filterBrand;
      const matchesStock = filterStock === "TODOS" ||
        (filterStock === "COM ESTOQUE" && p.stock > 0) ||
        (filterStock === "SEM ESTOQUE" && p.stock <= 0) ||
        (filterStock === "NEGATIVOS" && p.stock <= -1);

      const status = syncPorCod.get(p.cod)?.status;
      const matchesShopify =
        filterShopify === SHOPIFY_FILTROS[0] ||
        (filterShopify === "Sincronizados" && status === "sincronizado") ||
        (filterShopify === "Divergentes" && status === "divergente") ||
        (filterShopify === "Fora da loja" && status === "fora");

      const matchesCurva =
        filterCurva === CURVA_FILTROS[0] ||
        filterCurva === `Curva ${curvaPorCod.get(p.cod) ?? "C"}`;

      return matchesSearch && matchesBrand && matchesStock && matchesShopify && matchesCurva;
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const key = sortConfig.key;
        const dir = sortConfig.direction;
        
        if (key === 'cod') {
          return dir === 'asc' ? Number(a.cod) - Number(b.cod) : Number(b.cod) - Number(a.cod);
        }
        
        const valA = a[key];
        const valB = b[key];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return dir === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return dir === 'asc' ? -1 : 1;
        if (strA > strB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [products, searchTerm, filterBrand, filterStock, filterShopify, syncPorCod, sortConfig, filterCurva, curvaPorCod]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredProducts.length) {
        setVisibleCount(prev => prev + 50);
      }
    }
  };

  // Busca na CADITE só os campos marcados, para todos os produtos carregados.
  const camposCadite = colunasTela
    .map((k) => (k.startsWith("cadite:") ? k.slice(7) : CAMPOS_COM_DESCRICAO[k] ?? CAMPOS_CADITE_NOMEADOS[k]?.campo))
    .filter(Boolean)
    .join(",");
  useEffect(() => {
    if (!camposCadite || products.length === 0) return;
    let vivo = true;
    apiCaditeExportar(products.map((p) => p.cod), camposCadite.split(",")).then(
      (rows) => {
        if (!vivo) return;
        const mapa = new Map<string, Record<string, unknown>>();
        // CADITE tem uma linha por empresa: fica a primeira com o campo preenchido.
        for (const r of rows) {
          const cod = String(r.ITE_CODITE).trim();
          const atual = mapa.get(cod);
          if (!atual) mapa.set(cod, { ...r });
          else for (const [k, v] of Object.entries(r)) if ((atual[k] == null || String(atual[k]).trim() === "") && v != null) atual[k] = v;
        }
        setCaditeDados(mapa);
      },
      () => vivo && showNotification("error", "Colunas da CADITE", "Não foi possível buscar os campos da CADITE."),
    );
    return () => { vivo = false; };
  }, [camposCadite, products, showNotification]);

  // Colunas da tabela. A engrenagem escolhe quais aparecem (fica salvo neste
  // navegador) e a planilha baixa exatamente as colunas que estão na tela.
  const fmtNum = (v: number, casas = 2) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const colunaCodigoDescricao = (key: string, label: string, campo: string, campoDesc: string): ColunaTabela => ({
    key, label, wch: 12, align: "left",
    valor: (p) => valorCadite(caditeDados.get(p.cod)?.[campo]),
    render: (p) => {
      const cod = valorCadite(caditeDados.get(p.cod)?.[campo]);
      const desc = valorCadite(caditeDados.get(p.cod)?.[campoDesc]);
      return (
        // Descrição longa (CEST) corta com "…"; o texto inteiro fica no hover.
        <span
          title={desc ? `${cod} - ${desc}` : undefined}
          className="block max-w-[220px] truncate text-[10px] font-bold text-muted-foreground"
        >
          {cod ? (desc ? `${cod} - ${desc}` : cod) : "—"}
        </span>
      );
    },
    extraPlanilha: { label: `Descrição ${label}`, wch: 40, valor: (p) => valorCadite(caditeDados.get(p.cod)?.[campoDesc]) },
  });
  const COLUNAS: ColunaTabela[] = [
    { key: "cod", label: "Código", wch: 12, align: "left", sort: "cod", valor: (p) => p.cod,
      render: (p) => <span className="text-[10px] font-bold text-muted-foreground">{p.cod}</span> },
    { key: "desc", label: "Descrição", wch: 62, align: "left", sort: "desc", valor: (p) => p.desc,
      render: (p) => <span className="text-[11px] font-black text-foreground uppercase tracking-tight line-clamp-1">{p.desc}</span> },
    { key: "brand", label: "Marca", wch: 24, align: "center", sort: "brand", valor: (p) => p.brand,
      render: (p) => (
        <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 uppercase tracking-tight">
          {p.brand}
        </span>
      ) },
    { key: "codFornecedor", label: "Cód. forn.", wch: 14, align: "center", sort: "codFornecedor", valor: (p) => p.codFornecedor,
      render: (p) => (
        <span title={p.fornecedor || undefined} className="text-[10px] font-bold text-muted-foreground tabular-nums">
          {p.codFornecedor || "—"}
        </span>
      ) },
    { key: "fornecedor", label: "Fornecedor", wch: 36, align: "left", sort: "fornecedor", valor: (p) => p.fornecedor },
    { key: "stock", label: "Estoque gerencial", wch: 12, align: "right", sort: "stock", num: "#,##0.##;-#,##0.##;0", valor: (p) => p.stock,
      render: (p) => (
        <span className={cn("text-[11px] font-black tracking-tighter", p.stock > 10 ? "text-foreground" : p.stock > 0 ? "text-amber-500" : "text-rose-500")}>
          {p.stock.toFixed(3)}
        </span>
      ) },
    { key: "media", label: "Média 3M", wch: 12, align: "right", sort: "media", num: "#,##0.00", valor: (p) => p.media,
      render: (p) => <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 tracking-tighter tabular-nums">{fmtNum(p.media)}</span> },
    { key: "sales", label: "Total vendido", wch: 14, align: "right", sort: "sales", num: "#,##0.##", valor: (p) => p.sales },
    { key: "debit", label: "Débito", wch: 14, align: "right", sort: "debit", num: '"R$" #,##0.00', valor: (p) => p.debit,
      render: (p) => <span className="text-[11px] font-black text-emerald-500 dark:text-emerald-400 tracking-tighter">R$ {fmtNum(p.debit)}</span> },
    { key: "credit", label: "Crédito", wch: 14, align: "right", sort: "credit", num: '"R$" #,##0.00', valor: (p) => p.credit,
      render: (p) => <span className="text-[11px] font-black text-emerald-500 dark:text-emerald-400 tracking-tighter">R$ {fmtNum(p.credit)}</span> },
    ...Object.entries(CAMPOS_CADITE_NOMEADOS).map(([key, { campo, label, formato }]): ColunaTabela => ({
      key, label, wch: 14, align: "center",
      valor: (p) => {
        const v = valorCadite(caditeDados.get(p.cod)?.[campo]);
        return formato ? formato(v) : v;
      },
    })),
    // Na tela: "002 - SUBST TRIBUT - CST 060". Na planilha: código e descrição em colunas separadas.
    colunaCodigoDescricao("classFiscal", "Classificação fiscal", "ITE_CODABF", "ABF_DESABF"),
    colunaCodigoDescricao("cest", "CEST", "ITE_CDCEST", "CES_DESCRI"),
    { key: "curva", label: "Curva ABC", wch: 10, align: "center", valor: (p) => curvaPorCod.get(p.cod) ?? "—" },
    { key: "shopify", label: "Shopify", wch: 16, align: "center", valor: (p) => syncPorCod.get(p.cod)?.status ?? "",
      render: (p) => (
        <SyncBadge
          status={syncPorCod.get(p.cod)?.status}
          loja={syncPorCod.get(p.cod)?.loja}
          carregando={shopifyLoading}
          erpPrice={p.debit}
          erpStock={p.stock}
          onEnviar={() => setEnvio([montarItem(p)])}
        />
      ) },
    // Só na tela: botão de imprimir a etiqueta de preço (não vai para a planilha).
    { key: "etiqueta", label: "Imprimir preço", wch: 0, align: "center", soTela: true, valor: () => "",
      render: (p) => (
        <button
          onClick={() => imprimirEtiqueta(p)}
          disabled={imprimindoCod !== null}
          title="Imprimir etiqueta de preço"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
        >
          {imprimindoCod === p.cod ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
        </button>
      ) },
  ];
  const colunaDe = (k: string): ColunaTabela | undefined => {
    if (!k.startsWith("cadite:")) return COLUNAS.find((c) => c.key === k);
    const campo = k.slice(7);
    return { key: k, label: campo, wch: 16, align: "left", valor: (p) => valorCadite(caditeDados.get(p.cod)?.[campo]) };
  };
  const colunasVisiveis = colunasTela.map(colunaDe).filter((c): c is ColunaTabela => !!c);

  // Baixa o que está na tela: filtros, ordenação e as colunas escolhidas.
  const exportarExcel = async () => {
    const cols = colunasVisiveis
      .filter((c) => !c.soTela)
      .flatMap((c): ColunaTabela[] =>
        c.extraPlanilha
          ? [c, { key: `${c.key}-extra`, align: "left", ...c.extraPlanilha }]
          : [c],
      );
    if (!cols.length) return;
    // xlsx-js-style: mesma API do xlsx, mas grava cor, fonte e borda.
    const XLSX = await import("xlsx-js-style");
    const borda = { style: "thin", color: { rgb: "D9DEE7" } };
    const bordas = { top: borda, bottom: borda, left: borda, right: borda };
    const cab = {
      font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
      fill: { fgColor: { rgb: "1E3A8A" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: bordas,
    };

    const titulo = `Produtos — ${new Date().toLocaleDateString("pt-BR")} — ${filteredProducts.length} itens`;
    const aoa: (string | number)[][] = [
      [titulo, ...cols.slice(1).map(() => "")],
      cols.map((c) => c.label),
      ...filteredProducts.map((p) => cols.map((c) => c.valor(p))),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const ultima = XLSX.utils.encode_col(cols.length - 1);
    ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }];
    ws["!cols"] = cols.map((c) => ({ wch: c.wch }));
    ws["!rows"] = [{ hpt: 26 }, { hpt: 20 }];
    ws["!autofilter"] = { ref: `A2:${ultima}${aoa.length}` };

    ws["A1"].s = {
      font: { bold: true, sz: 14, color: { rgb: "1E3A8A" }, name: "Calibri" },
      alignment: { vertical: "center" },
    };
    cols.forEach((_, c) => (ws[XLSX.utils.encode_cell({ r: 1, c })].s = cab));

    filteredProducts.forEach((p, i) => {
      const r = i + 2;
      const zebra = i % 2 === 1 ? { fill: { fgColor: { rgb: "F3F6FB" } } } : {};
      const base = { font: { sz: 10, name: "Calibri" }, border: bordas, alignment: { vertical: "center" }, ...zebra };
      cols.forEach((col, c) => {
        const cel = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cel) return;
        if (col.num) cel.z = col.num;
        cel.s = { ...base, alignment: { horizontal: col.align, vertical: "center" } };
        if (col.key === "stock") {
          cel.s.font = {
            sz: 10,
            name: "Calibri",
            bold: p.stock <= 0,
            color: { rgb: p.stock < 0 ? "DC2626" : p.stock === 0 ? "9CA3AF" : "111827" },
          };
        }
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, `produtos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const montarItem = (p: Product): ItemEnvio => ({
    produto: { cod: p.cod, desc: p.desc, brand: p.brand, price: p.debit, stock: p.stock },
    existente: syncPorCod.get(p.cod)?.loja,
  });


  return (
    <div className="flex-1 flex flex-col gap-4 pt-4 pb-6 px-3 sm:px-6 overflow-hidden h-full max-h-screen bg-background">
      {/* TINY TOOLBAR */}
      <div className="flex flex-col gap-3 shrink-0">
        
        {/* SEARCH & FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(50); // Reset count on search
              }}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-foreground outline-none focus:border-blue-600/50 transition-all placeholder:text-muted-foreground/30 shadow-sm"
            />
          </div>

          <TinyDropdown
            value={filterBrand}
            options={brands}
            onChange={(val) => {
              setFilterBrand(val);
              setVisibleCount(50); // Reset count on brand filter
            }}
            icon={Tag}
            variant="blue"
            placeholder="Todas as Marcas"
          />

          <div className="flex bg-card rounded-xl border border-border p-1 shadow-sm">
            {["TODOS", "COM ESTOQUE", "SEM ESTOQUE", "NEGATIVOS"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilterStock(s);
                  setVisibleCount(50); // Reset count on stock filter
                }}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border",
                  filterStock === s
                    ? "bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-600/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <TinyDropdown
            value={filterCurva}
            options={[...CURVA_FILTROS]}
            onChange={(val) => {
              setFilterCurva(val);
              setVisibleCount(50);
            }}
            icon={BarChart3}
            variant="blue"
            placeholder="Curva: Todas"
          />

          <TinyDropdown
            value={filterShopify}
            options={[...SHOPIFY_FILTROS]}
            onChange={(val) => {
              setFilterShopify(val);
              setVisibleCount(50);
            }}
            icon={ShoppingBag}
            variant="blue"
            placeholder="Shopify: Todos"
          />

          <button
            onClick={() => setEtiquetasAberto(true)}
            title="Imprimir etiquetas de preço"
            className="flex items-center justify-center p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shadow-sm group shrink-0"
          >
            <Printer className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
          </button>

          <button
            onClick={exportarExcel}
            disabled={filteredProducts.length === 0}
            title="Baixar planilha com as colunas da tabela"
            className="flex items-center justify-center p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shadow-sm group shrink-0 disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
          </button>

          <button
            onClick={() => setColunasAberto(true)}
            title="Escolher colunas da tabela"
            className="flex items-center justify-center p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shadow-sm group shrink-0"
          >
            <Settings className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
          </button>
        </div>

        {/* RESUMO DO VÍNCULO COM A LOJA */}
        {!shopifyLoading && products.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {totaisShopify.sincronizado} sincronizados
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {totaisShopify.divergente} divergentes
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {totaisShopify.fora} fora da loja
            </span>
          </div>
        )}
      </div>

      {/* PRODUCTS TABLE CONTAINER */}
      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col relative">
        <div
          className="flex-1 overflow-auto scrollbar-hide"
          onScroll={handleScroll}
        >
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead className="sticky top-0 z-10 bg-secondary/50 backdrop-blur-md border-b border-border">
              <tr>
                {colunasVisiveis.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sort ? () => requestSort(col.sort!) : undefined}
                    className={cn(
                       "py-2.5 px-3 sm:px-6 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest transition-colors whitespace-nowrap",
                       col.sort && "cursor-pointer hover:bg-secondary/60",
                       col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    )}
                  >
                    <div className={cn("flex items-center gap-1.5", col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start")}>
                      <span className="truncate">{col.label}</span>
                      {col.sort && (
                        <div className="shrink-0">
                          {sortConfig?.key === col.sort ? (
                            sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-40 transition-opacity" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    {colunasVisiveis.map((c) => (
                      <td key={c.key} className="py-4 px-3 sm:px-6"><div className="h-2 w-12 bg-secondary rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : (
                <>
                  {visibleProducts.map((p: Product, i) => (
                    <tr key={i} className="hover:bg-secondary/20 transition-colors group">
                      {colunasVisiveis.map((col) => {
                        const v = col.render ? null : col.valor(p);
                        return (
                          <td
                            key={col.key}
                            className={cn("py-3 px-3 sm:px-6", col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left")}
                          >
                            {col.render ? col.render(p) : (
                              <span className="text-[10px] font-bold text-muted-foreground tabular-nums whitespace-nowrap">
                                {typeof v === "number" ? v.toLocaleString("pt-BR") : v || "—"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {visibleCount < filteredProducts.length && (
                    <tr>
                      <td colSpan={colunasVisiveis.length} className="py-6">
                        <div className="flex justify-center w-full">
                          <TinyLoader size="sm" />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {colunasAberto && (
        <ExportarColunasModal
          colunas={COLUNAS}
          inicial={colunasTela}
          onFechar={() => setColunasAberto(false)}
          onSalvar={(keys) => {
            setColunasTela(keys);
            try { localStorage.setItem("produtos-colunas-tela", JSON.stringify(keys)); } catch { /* opcional */ }
            setColunasAberto(false);
          }}
        />
      )}
      {etiquetasAberto && (
        <EtiquetaPrecoModal
          produtos={products}
          filtrados={filteredProducts}
          onClose={() => setEtiquetasAberto(false)}
        />
      )}

      {envio && (
        <ShopifyEnvioModal
          itens={envio}
          onClose={() => setEnvio(null)}
          onConcluido={aplicarResultadoEnvio}
        />
      )}
    </div>
  );
}
