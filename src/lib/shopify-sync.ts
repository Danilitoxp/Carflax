/**
 * Serviço de sincronização em tempo real com a Shopify.
 * Usa proxy (/shopify-api/) para evitar o bloqueio de CORS do browser.
 * Em dev: vite.config.ts proxy → https://gfpdzv-y0.myshopify.com
 * Em produção: vercel.json rewrite → https://gfpdzv-y0.myshopify.com
 *
 * O vínculo entre ERP e loja é o SKU da variante: o código do item da Citel
 * gravado com 5 dígitos (ex.: 02493). Aqui tudo é comparado sem zeros à
 * esquerda para o vínculo não quebrar por causa de padding.
 */

const SHOPIFY_TOKEN = import.meta.env.VITE_SHOPIFY_API_TOKEN as string;

// Usa proxy relativo para contornar CORS (Shopify Admin API não permite chamadas diretas do browser)
const SHOPIFY_PROXY = "/shopify-api";
const API_VERSION = "2024-01";

export interface ShopifyVariantInfo {
  productId: number;
  productTitle: string;
  /** active | draft | archived */
  status: string;
  handle: string;
  variantId: number;
  inventoryItemId: number | null;
  /** SKU exatamente como está na loja */
  sku: string;
  price: number;
  stock: number;
  image?: string;
  /** true quando a variante controla estoque pela Shopify */
  gerenciaEstoque: boolean;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": SHOPIFY_TOKEN,
  };
}

/** Chave de vínculo: só os dígitos significativos do código (00329 → 329). */
export function normalizeSku(v: string | number | null | undefined): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.replace(/^0+/, "") || "0";
}

/** Formato que a loja espera no SKU: 5 dígitos com zeros à esquerda. */
export function padSku(v: string | number | null | undefined): string {
  const s = String(v ?? "").trim();
  return s ? s.padStart(5, "0") : s;
}

interface ShopifyProductRaw {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor?: string;
  product_type?: string;
  image?: { src?: string };
  images?: Array<{ src?: string }>;
  variants?: Array<{
    id: number;
    sku?: string;
    price?: string;
    inventory_quantity?: number;
    inventory_item_id?: number;
    inventory_management?: string | null;
  }>;
}

let catalogCache: Map<string, ShopifyVariantInfo> | null = null;
let catalogPromise: Promise<Map<string, ShopifyVariantInfo>> | null = null;
let photoCache: Map<string, string> | null = null;
/** Tipos e fabricantes que a loja já usa — vocabulário para a IA. */
let vocabCache: { tipos: string[]; fabricantes: string[] } = { tipos: [], fabricantes: [] };

/**
 * Baixa o catálogo inteiro da loja e indexa por SKU normalizado.
 * O resultado fica em cache no módulo — `force` refaz a carga (usado depois
 * de enviar produtos, para o status da tela refletir a loja de novo).
 */
export async function getShopifyCatalog(force = false): Promise<Map<string, ShopifyVariantInfo>> {
  if (force) {
    catalogCache = null;
    catalogPromise = null;
    photoCache = null;
  }
  if (catalogCache) return catalogCache;
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    const bySku = new Map<string, ShopifyVariantInfo>();
    const fotos = new Map<string, string>();
    const tipos = new Map<string, number>();
    const fabricantes = new Map<string, number>();
    try {
      let url: string | null = `${SHOPIFY_PROXY}/admin/api/${API_VERSION}/products.json?limit=250`;
      let pages = 0;

      while (url && pages < 100) {
        pages++;
        const res = await fetch(url, { headers: headers() });
        if (!res.ok) break;

        const data = (await res.json()) as { products?: ShopifyProductRaw[] };
        if (!data.products || data.products.length === 0) break;

        for (const p of data.products) {
          const imgSrc = p.image?.src || p.images?.[0]?.src;

          const tipo = (p.product_type ?? "").trim();
          // "0" aparece em 2.4k produtos por importação antiga — não é tipo.
          if (tipo && tipo !== "0") tipos.set(tipo, (tipos.get(tipo) ?? 0) + 1);
          const fab = (p.vendor ?? "").trim();
          if (fab) fabricantes.set(fab, (fabricantes.get(fab) ?? 0) + 1);

          for (const v of p.variants ?? []) {
            const rawSku = String(v.sku ?? "").trim();
            if (!rawSku) continue;
            const key = normalizeSku(rawSku);

            if (imgSrc) {
              fotos.set(rawSku, imgSrc);
              fotos.set(key, imgSrc);
              fotos.set(padSku(rawSku), imgSrc);
            }

            // Se o mesmo SKU aparecer em mais de um produto, o primeiro vence:
            // duplicidade na loja é problema de cadastro, não de leitura.
            if (bySku.has(key)) continue;

            bySku.set(key, {
              productId: p.id,
              productTitle: p.title,
              status: p.status ?? "active",
              handle: p.handle,
              variantId: v.id,
              inventoryItemId: v.inventory_item_id ?? null,
              sku: rawSku,
              price: Number(v.price ?? 0),
              stock: Number(v.inventory_quantity ?? 0),
              image: imgSrc,
              gerenciaEstoque: v.inventory_management === "shopify",
            });
          }
        }

        const linkHeader = res.headers.get("link");
        if (linkHeader && linkHeader.includes('rel="next"')) {
          const nextPart = linkHeader.split(",").find((pt) => pt.includes('rel="next"'));
          const start = nextPart ? nextPart.indexOf("<") + 1 : -1;
          const end = nextPart ? nextPart.indexOf(">") : -1;
          // O link retornado pela Shopify é absoluto – substitui o host pelo proxy
          const absUrl = nextPart && start > 0 && end > start ? nextPart.substring(start, end) : null;
          url = absUrl ? absUrl.replace(/^https?:\/\/[^/]+/, SHOPIFY_PROXY) : null;
        } else {
          url = null;
        }
      }

      // Ordena por uso: o que a loja mais usa é o que a IA deve preferir.
      const maisUsados = (m: Map<string, number>, limite: number) =>
        [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite).map(([k]) => k);

      catalogCache = bySku;
      photoCache = fotos;
      vocabCache = {
        tipos: maisUsados(tipos, 40),
        fabricantes: maisUsados(fabricantes, 120),
      };
    } catch (e) {
      console.error("Erro ao sincronizar catálogo da Shopify:", e);
    }
    return bySku;
  })();

  return catalogPromise;
}

export async function getShopifyPhotoMap(): Promise<Map<string, string>> {
  await getShopifyCatalog();
  return photoCache ?? new Map();
}

/** Tipos e fabricantes já em uso na loja (disponível após carregar o catálogo). */
export function getShopifyVocabulario() {
  return vocabCache;
}

export interface ShopifyCollection {
  id: number;
  title: string;
}

let collectionsCache: ShopifyCollection[] | null = null;

/** Coleções manuais da loja — é nelas que os produtos novos são encaixados. */
export async function getShopifyCollections(): Promise<ShopifyCollection[]> {
  if (collectionsCache) return collectionsCache;

  const todas: ShopifyCollection[] = [];
  try {
    let url: string | null =
      `${SHOPIFY_PROXY}/admin/api/${API_VERSION}/custom_collections.json?limit=250&fields=id,title`;
    let pages = 0;

    while (url && pages < 10) {
      pages++;
      const res = await fetch(url, { headers: headers() });
      if (!res.ok) break;
      const data = (await res.json()) as { custom_collections?: ShopifyCollection[] };
      todas.push(...(data.custom_collections ?? []));

      const linkHeader = res.headers.get("link");
      const nextPart = linkHeader?.includes('rel="next"')
        ? linkHeader.split(",").find((pt) => pt.includes('rel="next"'))
        : null;
      const start = nextPart ? nextPart.indexOf("<") + 1 : -1;
      const end = nextPart ? nextPart.indexOf(">") : -1;
      const absUrl = nextPart && start > 0 && end > start ? nextPart.substring(start, end) : null;
      url = absUrl ? absUrl.replace(/^https?:\/\/[^/]+/, SHOPIFY_PROXY) : null;
    }
    collectionsCache = todas;
  } catch (e) {
    console.error("Erro ao carregar coleções da Shopify:", e);
  }
  return todas;
}

let locationIdCache: number | null = null;

/** Local de estoque da loja (a Carflax opera com um só). */
export async function getShopifyLocationId(): Promise<number | null> {
  if (locationIdCache) return locationIdCache;
  try {
    const res = await fetch(`${SHOPIFY_PROXY}/admin/api/${API_VERSION}/locations.json`, {
      headers: headers(),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { locations?: Array<{ id: number; active?: boolean }> };
    const loc = data.locations?.find((l) => l.active !== false) ?? data.locations?.[0];
    locationIdCache = loc?.id ?? null;
    return locationIdCache;
  } catch {
    return null;
  }
}

export interface ProdutoParaShopify {
  cod: string;
  desc: string;
  brand: string;
  /** preço de venda do ERP */
  price: number;
  stock: number;
}

/** Cadastro gerado pela IA para um produto novo (ver produto-ia.ts). */
export interface EnriquecimentoProduto {
  titulo: string;
  descricaoHtml: string;
  tipo: string;
  fabricante: string;
  tags: string[];
  /** ids de coleções existentes onde o produto deve entrar */
  colecaoIds: number[];
}

export interface ResultadoEnvio {
  cod: string;
  ok: boolean;
  /** "criado" quando o produto ainda não existia na loja */
  acao: "criado" | "atualizado";
  erro?: string;
}

async function setInventory(inventoryItemId: number, quantidade: number) {
  const locationId = await getShopifyLocationId();
  if (!locationId) throw new Error("Local de estoque da loja não encontrado");
  const res = await fetch(`${SHOPIFY_PROXY}/admin/api/${API_VERSION}/inventory_levels/set.json`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      location_id: locationId,
      inventory_item_id: inventoryItemId,
      available: Math.max(0, Math.floor(quantidade)),
    }),
  });
  if (!res.ok) throw new Error(`estoque: ${res.status} ${await res.text()}`);
}

/**
 * Envia um produto do ERP para a loja.
 * Já existindo o SKU, só acerta preço e estoque da variante; senão cria o
 * produto como rascunho (draft) — quem publica é o time de e-commerce.
 */
async function vincularColecoes(productId: number, colecaoIds: number[]) {
  for (const collectionId of colecaoIds) {
    try {
      await fetch(`${SHOPIFY_PROXY}/admin/api/${API_VERSION}/collects.json`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ collect: { product_id: productId, collection_id: collectionId } }),
      });
    } catch (e) {
      // Coleção é acabamento: se falhar, o produto já está na loja e o envio
      // não deve ser marcado como erro por causa disso.
      console.error("Erro ao vincular coleção:", e);
    }
  }
}

export async function enviarProdutoParaShopify(
  p: ProdutoParaShopify,
  existente?: ShopifyVariantInfo,
  ia?: EnriquecimentoProduto,
): Promise<ResultadoEnvio> {
  try {
    if (existente) {
      const res = await fetch(
        `${SHOPIFY_PROXY}/admin/api/${API_VERSION}/variants/${existente.variantId}.json`,
        {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify({
            variant: { id: existente.variantId, price: p.price.toFixed(2) },
          }),
        },
      );
      if (!res.ok) throw new Error(`preço: ${res.status} ${await res.text()}`);

      if (existente.inventoryItemId && existente.gerenciaEstoque) {
        await setInventory(existente.inventoryItemId, p.stock);
      }
      return { cod: p.cod, ok: true, acao: "atualizado" };
    }

    const res = await fetch(`${SHOPIFY_PROXY}/admin/api/${API_VERSION}/products.json`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        product: {
          title: ia?.titulo || p.desc,
          body_html: ia?.descricaoHtml ? `<p>${ia.descricaoHtml}</p>` : undefined,
          product_type: ia?.tipo || undefined,
          vendor: ia?.fabricante || (p.brand && p.brand !== "GERAL" ? p.brand : undefined),
          status: "draft",
          tags: ia?.tags?.length ? ia.tags : ["carflax-hub"],
          variants: [
            {
              sku: padSku(p.cod),
              price: p.price.toFixed(2),
              inventory_management: "shopify",
              inventory_policy: "deny",
            },
          ],
        },
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

    const criado = (await res.json()) as { product?: ShopifyProductRaw };
    const variante = criado.product?.variants?.[0];
    if (variante?.inventory_item_id) {
      await setInventory(variante.inventory_item_id, p.stock);
    }
    if (criado.product?.id && ia?.colecaoIds.length) {
      await vincularColecoes(criado.product.id, ia.colecaoIds);
    }
    return { cod: p.cod, ok: true, acao: "criado" };
  } catch (e) {
    return {
      cod: p.cod,
      ok: false,
      acao: existente ? "atualizado" : "criado",
      erro: e instanceof Error ? e.message : String(e),
    };
  }
}
