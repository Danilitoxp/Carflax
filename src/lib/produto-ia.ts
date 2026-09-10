/**
 * Enriquecimento de produto para a Shopify.
 *
 * A descrição que vem do ERP é crua e sem acento ("TUBO ROSCAVEL PVC 2 1/2"),
 * e a marca muitas vezes é um rótulo interno ("VENDA CASADA", "INATIVO"). Aqui
 * a IA transforma isso no cadastro que a loja precisa: título legível,
 * descrição, tipo, fabricante, tags de busca e coleção.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_IA || "");

/** Marcas do ERP que não são fabricante de verdade e não devem ir para a loja. */
const MARCAS_INTERNAS = new Set([
  "VENDA CASADA",
  "INATIVO",
  "INATIVOS SEM USO",
  "GERAL",
  "DIVERSOS",
  "",
]);

export function marcaEhInterna(marca: string): boolean {
  return MARCAS_INTERNAS.has((marca || "").trim().toUpperCase());
}

export interface ProdutoBruto {
  cod: string;
  desc: string;
  brand: string;
  price: number;
}

export interface ProdutoEnriquecido {
  cod: string;
  titulo: string;
  descricaoHtml: string;
  tipo: string;
  fabricante: string;
  tags: string[];
  /** títulos de coleções existentes na loja */
  colecoes: string[];
}

/** Vocabulário real da loja, para a IA não inventar tipo/coleção novos. */
export interface VocabularioLoja {
  tipos: string[];
  fabricantes: string[];
  colecoes: string[];
}

const LOTE = 8;

function montarPrompt(itens: ProdutoBruto[], vocab: VocabularioLoja): string {
  return `Você cadastra produtos de material hidráulico, elétrico e de construção na loja Shopify da Carflax (Jundiaí/SP).

Para cada item recebido do ERP, gere o cadastro da loja.

REGRAS:
1. titulo: a descrição do ERP escrita corretamente — acentuação certa, medidas legíveis (ex.: 2.1/2"), sem código de fornecedor entre parênteses e sem o nome da marca no final. Mantenha em MAIÚSCULAS.
2. descricao_html: 1 ou 2 frases em português do Brasil dizendo o que é e para que serve. Texto puro, sem HTML, sem inventar garantia, norma ou especificação que não esteja na descrição.
3. tipo: escolha um da lista de TIPOS EXISTENTES. Só crie um novo se nenhum servir.
4. fabricante: se a marca do ERP for um fabricante real, repita ela. Se for rótulo interno (VENDA CASADA, INATIVO, GERAL, DIVERSOS) ou vazia, deduza o fabricante pela descrição; não dando para deduzir, use "NACIONAL".
5. tags: 6 a 8 frases de busca com acentuação correta, cada uma com 2 a 5 palavras, do jeito que o cliente pesquisa — combine nome, material, medida e aplicação (ex.: "tubo roscável PVC", "tubo roscável 2 1/2", "tubo PVC para instalação hidráulica"). NUNCA use palavra solta ("tubo", "pvc") nem repita a mesma frase. Não use marca interna como tag.
6. colecoes: 1 ou 2 títulos EXATOS da lista de COLEÇÕES EXISTENTES — a mais próxima do produto, mesmo que não seja perfeita (um tubo de PVC roscável entra em "Conexões PVC Roscável"). Devolva [] só quando nenhuma tiver relação com o produto.

TIPOS EXISTENTES: ${vocab.tipos.join(" | ")}

COLEÇÕES EXISTENTES: ${vocab.colecoes.join(" | ")}

ITENS:
${itens.map((i, n) => `${n + 1}. cod=${i.cod} | descricao=${i.desc} | marca=${i.brand} | preco=R$ ${i.price.toFixed(2)}`).join("\n")}

Responda APENAS um array JSON válido, sem markdown, na MESMA ORDEM dos itens:
[{"cod":"","titulo":"","descricao_html":"","tipo":"","fabricante":"","tags":[],"colecoes":[]}]`;
}

interface RespostaIA {
  cod?: string;
  titulo?: string;
  descricao_html?: string;
  tipo?: string;
  fabricante?: string;
  tags?: string[];
  colecoes?: string[];
}

/** Cadastro mínimo quando a IA falha — melhor enviar cru do que não enviar. */
function fallback(p: ProdutoBruto): ProdutoEnriquecido {
  return {
    cod: p.cod,
    titulo: p.desc,
    descricaoHtml: "",
    tipo: "",
    fabricante: marcaEhInterna(p.brand) ? "NACIONAL" : p.brand,
    tags: [],
    colecoes: [],
  };
}

async function enriquecerLote(
  itens: ProdutoBruto[],
  vocab: VocabularioLoja,
): Promise<ProdutoEnriquecido[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  try {
    const res = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: montarPrompt(itens, vocab) }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" } as never,
    });

    const raw = res.response
      .text()
      .trim()
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsed = JSON.parse(raw) as RespostaIA[];
    const porCod = new Map(parsed.filter((r) => r?.cod).map((r) => [String(r.cod), r]));

    return itens.map((p) => {
      // Casa pelo código; se a IA trocou a ordem ou omitiu, usa a posição.
      const r = porCod.get(p.cod) ?? parsed[itens.indexOf(p)];
      if (!r) return fallback(p);

      const colecoesValidas = (r.colecoes ?? []).filter((c) => vocab.colecoes.includes(c));
      const fabricante = (r.fabricante || "").trim();

      return {
        cod: p.cod,
        titulo: (r.titulo || p.desc).trim(),
        descricaoHtml: (r.descricao_html || "").trim(),
        tipo: (r.tipo || "").trim(),
        // A IA às vezes devolve a marca interna mesmo assim — barra aqui.
        fabricante: !fabricante || marcaEhInterna(fabricante) ? "NACIONAL" : fabricante,
        tags: (r.tags ?? []).map((t) => String(t).trim()).filter(Boolean).slice(0, 8),
        colecoes: colecoesValidas.slice(0, 2),
      };
    });
  } catch (e) {
    console.error("[produto-ia] Falha ao enriquecer lote:", e);
    return itens.map(fallback);
  }
}

/**
 * Enriquece a lista inteira em lotes de 8 — uma chamada por lote em vez de uma
 * por produto, que é o que torna o envio em massa viável.
 */
export async function enriquecerProdutos(
  itens: ProdutoBruto[],
  vocab: VocabularioLoja,
  onProgress?: (prontos: number, total: number) => void,
): Promise<Map<string, ProdutoEnriquecido>> {
  const saida = new Map<string, ProdutoEnriquecido>();

  for (let i = 0; i < itens.length; i += LOTE) {
    const lote = itens.slice(i, i + LOTE);
    const enriquecidos = await enriquecerLote(lote, vocab);
    for (const e of enriquecidos) saida.set(e.cod, e);
    onProgress?.(saida.size, itens.length);
  }

  return saida;
}
