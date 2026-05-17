import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_IA || "");

export interface ProdutoAPI {
  COD_ITEM: string;
  DESCRICAO: string;
  MARCA: string;
  PRECO_VENDA: string;
  TOTAL_DISPONIVEL: string;
}

export interface ItemOrcamento {
  cod_item: string;
  descricao: string;
  quantidade: number;
  preco_unit: number;
  total: number;
  encontrado: boolean;
}

export async function fetchProdutosAPI(): Promise<ProdutoAPI[]> {
  const res = await fetch("https://marketing-carflax.velbav.easypanel.host/api/dashboard/produtos");
  if (!res.ok) throw new Error("Falha ao buscar catálogo de produtos");
  return res.json();
}

export function contarItens(texto: string): number {
  return texto.split("\n").filter(l => l.trim().length > 0).length;
}

function norm(str: string): string {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Termos informais → substrings que aparecem no catálogo
const SINONIMOS: [string, string[]][] = [
  // ── Conexões soldáveis / roscáveis ──────────────────────────────
  ["cotovelo", ["joelho"]],
  ["coto", ["joelho"]],
  ["joelho", ["joelho"]],
  ["curva", ["curva", "joelho"]],
  ["tê", ["tee"]],
  ["te ", ["tee"]],
  ["tee", ["tee"]],
  ["junção", ["juncao"]],
  ["juncao", ["juncao"]],
  ["junta", ["juncao"]],
  ["reducao", ["reducao", "bucha"]],
  ["redução", ["reducao", "bucha"]],
  ["bucha", ["bucha"]],
  ["luva", ["luva"]],
  ["manga", ["luva"]],
  ["uniao", ["uniao"]],
  ["união", ["uniao"]],
  ["cap", ["cap", "plug", "tampa"]],
  ["tampão", ["plug", "tampa"]],
  ["tampa", ["tampa", "cap"]],
  ["plug", ["plug"]],
  ["flange", ["flange"]],
  ["niple", ["niple"]],
  ["nipple", ["niple"]],
  ["adaptador", ["adap"]],
  ["adap", ["adap"]],
  ["cruzeta", ["cruzeta"]],

  // ── Tubos / barras ───────────────────────────────────────────────
  ["tubo", ["tubo"]],
  ["cano", ["tubo"]],
  ["barra", ["tubo"]],
  ["tudo", ["tubo"]],       // "br de tudo" = barra de tubo
  ["br de", ["tubo"]],
  ["vara", ["tubo"]],

  // ── Séries / tipos de PVC ────────────────────────────────────────
  ["esgoto", ["eg", "esgoto", "serie normal"]],
  ["serie normal", ["eg", "serie normal"]],
  ["soldavel", ["sold"]],
  ["pressão", ["sold", "az"]],
  ["agua fria", ["sold", "az"]],
  ["azul", ["az"]],

  // ── Ralos / Sifonados ────────────────────────────────────────────
  ["ralo", ["ralo", "sif", "corpo cx"]],
  ["grelha", ["grelha", "ralo"]],
  ["sifao", ["sifao", "sif"]],
  ["sifonado", ["sif", "corpo cx"]],
  ["caixa sifonada", ["corpo cx sif"]],
  ["caixinha", ["corpo cx"]],

  // ── Registros / válvulas ─────────────────────────────────────────
  ["registro", ["reg", "registro"]],
  ["valvula", ["valvula", "reg"]],
  ["válvula", ["valvula", "reg"]],
  ["registro esfera", ["reg esf"]],
  ["reg esfera", ["reg esf"]],
  ["registro gaveta", ["reg gav"]],
  ["reg gaveta", ["reg gav"]],
  ["registro pressao", ["base pressao", "reg pressao"]],
  ["pressao", ["base pressao", "pressao"]],
  ["boia", ["boia", "flutuador"]],
  ["retenção", ["retencao", "check"]],
  ["retencao", ["retencao", "check"]],
  ["check", ["check", "retencao"]],
  ["valvula pe", ["valvula pe"]],
  ["pé", ["pe"]],

  // ── Vedação / fixação / acabamento ──────────────────────────────
  ["veda rosca", ["veda rosca"]],
  ["teflon", ["veda rosca"]],
  ["fita veda", ["veda rosca"]],
  ["vedatudo", ["vedatudo", "veda tudo"]],
  ["cola", ["adesivo"]],
  ["adesivo", ["adesivo"]],
  ["cimento", ["adesivo"]],
  ["primer", ["primer"]],
  ["lixa", ["lixa"]],
  ["esponja", ["esponja"]],
  ["estopa", ["estopa"]],
  ["silicone", ["silicone"]],
  ["veda calha", ["veda calha"]],
  ["massa", ["massa"]],

  // ── Rosca / latão / metal ────────────────────────────────────────
  ["latao", ["latao"]],
  ["latão", ["latao"]],
  ["rosca", ["rosc"]],
  ["roscavel", ["rosc"]],
  ["macho", ["macho"]],
  ["femea", ["femea"]],
  ["fêmea", ["femea"]],

  // ── Abastecimento / Hidrômetro / Cavalete ────────────────────────
  ["cavalete", ["cavalete"]],
  ["hidrometro", ["hidrometro"]],
  ["hidrômetro", ["hidrometro"]],
  ["colar", ["colar"]],
  ["abracadeira", ["abracadeira", "colar"]],
  ["abraçadeira", ["abracadeira"]],
  ["selim", ["selim", "colar de tomada"]],
  ["tomada", ["tomada dagua", "tomada de"]],

  // ── Caixa d'água / reservatório ──────────────────────────────────
  ["caixa dagua", ["caixa"]],
  ["caixa d'agua", ["caixa"]],
  ["reservatorio", ["reservatorio", "caixa"]],
  ["reservatório", ["reservatorio"]],
  ["torneira boia", ["torneira boia", "boia"]],
  ["torneira", ["torneira"]],

  // ── Eléctrica ────────────────────────────────────────────────────
  ["disjuntor", ["disjuntor"]],
  ["dj", ["disjuntor"]],
  ["fio", ["fio", "cabo"]],
  ["cabo", ["cabo", "fio"]],
  ["eletroduto", ["eletroduto", "conduite"]],
  ["conduite", ["conduite", "eletroduto"]],
  ["condulete", ["condulete"]],
  ["caixa de luz", ["caixa de luz", "caixa 4x2", "caixa 4x4"]],
  ["caixa 4x2", ["4x2"]],
  ["caixa 4x4", ["4x4"]],
  ["interruptor", ["interruptor"]],
  ["tomada eletrica", ["tomada"]],
  ["espelho", ["espelho"]],
  ["fita isolante", ["fita isolante"]],
  ["quadro", ["quadro"]],
  ["qdl", ["quadro"]],
  ["qdc", ["quadro"]],
  ["disjuntor", ["disjuntor"]],
  ["luminaria", ["luminaria"]],
  ["lâmpada", ["lampada"]],
  ["lampada", ["lampada"]],
  ["conector", ["conector"]],
  ["terminal", ["terminal"]],

  // ── Complementos ─────────────────────────────────────────────────
  ["base", ["base"]],
  ["curto", ["curto"]],
  ["longo", ["longo"]],
  ["compacto", ["compacto"]],
  ["duplo", ["duplo"]],
  ["especial", ["especial"]],
];

function filtrarCatalogo(texto: string, produtos: ProdutoAPI[]): ProdutoAPI[] {
  const linhas = texto.split("\n").filter(l => l.trim());
  const keywords = new Set<string>();

  for (const linha of linhas) {
    const n = norm(linha);

    // Palavras com mais de 2 chars, sem stopwords
    const stopwords = new Set(["de", "do", "da", "em", "por", "com", "para", "um", "uma", "o", "a"]);
    const words = n.split(/[\s,°"]+/).filter(w => w.length > 2 && !stopwords.has(w));
    words.forEach(w => keywords.add(w));

    // Dimensões: 100x50, 3/4, 25mm, 100mm
    const dims = n.match(/\d+[x\/]\d+|\d+\s*mm/g) || [];
    dims.forEach(d => keywords.add(d.replace(/\s*mm/, "").replace("x", "")));
    // Números sozinhos como 100, 50, 40, 25 etc.
    const nums = n.match(/\b\d{2,3}\b/g) || [];
    nums.forEach(d => keywords.add(d));

    // Sinônimos
    for (const [termo, sinonimos] of SINONIMOS) {
      if (n.includes(termo)) sinonimos.forEach(s => keywords.add(s));
    }
  }

  const filtered = produtos.filter(p => {
    const desc = norm(p.DESCRICAO);
    return [...keywords].some(kw => desc.includes(kw));
  });

  // Fallback: se filtrou muito, retorna os 300 primeiros
  return filtered.length > 0 ? filtered.slice(0, 400) : produtos.slice(0, 300);
}

export async function matchOrcamentoComIA(
  texto: string,
  produtos: ProdutoAPI[],
  onProgress?: (encontrados: number, total: number, descricaoAtual: string) => void
): Promise<ItemOrcamento[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const produtosFiltrados = filtrarCatalogo(texto, produtos);

  const catalogo = produtosFiltrados.map(p => ({
    cod: p.COD_ITEM,
    desc: p.DESCRICAO,
    preco: parseFloat(p.PRECO_VENDA) || 0,
  }));

  const totalItens = contarItens(texto);

  // Numera os itens para forçar a ordem na resposta
  const linhasNumeradas = texto
    .split("\n")
    .filter(l => l.trim().length > 0)
    .map((l, i) => `${i + 1}. ${l.trim()}`)
    .join("\n");

  const prompt = `Você é um assistente de orçamentos de uma distribuidora de materiais hidráulicos chamada Carflax.

O usuário digitou a seguinte lista de itens para orçamento (RESPEITE EXATAMENTE ESTA ORDEM NA RESPOSTA):
"""
${linhasNumeradas}
"""

Abaixo está o catálogo completo de produtos disponíveis no sistema (cod, desc, preco):
${JSON.stringify(catalogo)}

Sua tarefa:
1. Para cada linha da lista do usuário, extraia a QUANTIDADE (número no início) e o PRODUTO desejado
2. Encontre o produto mais compatível no catálogo — o usuário usa nomes informais/abreviados.

EQUIVALÊNCIAS DE BITOLA (polegadas → mm no PVC soldável):
   - 1/2" = 20mm | 3/4" = 25mm | 1" = 32mm | 1.1/4" = 40mm | 1.1/2" = 50mm | 2" = 60mm | 3" = 75mm ou 85mm | 4" = 100mm ou 110mm

EQUIVALÊNCIAS DE TERMOS (hidráulica):
   - "cotovelo" / "coto" / "curva 90°" → JOELHO
   - "cotovelo 45°" / "curva 45°" → JOELHO 45
   - "T" / "tê" → TEE
   - "tubo" / "cano" / "barra" / "vara" / "br de tudo" → TUBO
   - "junção" / "junta" → JUNCAO
   - "redução" / "bucha de redução" → REDUCAO ou BUCHA RED
   - "luva" / "manga" → LUVA
   - "união" → UNIAO
   - "adaptador curto" / "adap curto" → ADAP SOLD CURTO
   - "adaptador longo" → ADAP SOLD LONGO
   - "ralo sifonado" / "caixinha de ralo" → CORPO CX SIF
   - "sifão" → SIFAO
   - "registro esfera plástico" → REG ESF SOLD COMPACTO PVC
   - "registro de pressão" / "base de registro" → BASE PRESSAO
   - "registro gaveta" → REG GAV
   - "válvula de retenção" / "check" → VALVULA RETENCAO
   - "torneira de boia" → TORNEIRA BOIA
   - "cola PVC" / "adesivo PVC" / "cimento PVC" → ADESIVO PVC
   - "primer" → PRIMER PVC
   - "veda rosca" / "teflon" / "fita veda" → VEDA ROSCA
   - "lixa" → LIXA FERRO
   - "niple" / "nipple" → NIPLE ROSCAVEL ou NIPLE LATAO
   - "abra" / "abraçadeira" / "selim" → ABRACADEIRA ou COLAR
   - "cavalete" → CAVALETE
   - cotovelo azul com rosca = JOELHO AZ C/ BUCHA DE LATAO
   - T azul com rosca = TEE AZ C/ BUCHA DE LATAO
   - "plug" / "cap" / "tampão" → PLUG ROSCAVEL

EQUIVALÊNCIAS (elétrica):
   - "disjuntor" / "DJ" → DISJUNTOR
   - "fio" / "cabo" → FIO ou CABO
   - "conduite" / "eletroduto" → CONDUITE ou ELETRODUTO
   - "caixa de luz" / "caixa 4x2" → CAIXA LUZ
   - "fita isolante" → FITA ISOLANTE
3. Quando a quantidade não for especificada, use 1
4. IMPORTANTE: Responda na MESMA ORDEM dos itens numerados acima (item 1 primeiro, item 2 segundo, etc.)
5. Retorne APENAS um array JSON válido, sem markdown, sem texto antes ou depois

Formato exato de resposta:
[{"cod_item":"código","descricao":"descrição do catálogo","quantidade":número,"preco_unit":número,"total":número,"encontrado":true},...]

Se não encontrar produto compatível: encontrado false, cod_item vazio "", use a descrição do usuário como descricao.`;

  const stream = await model.generateContentStream({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0, thinkingConfig: { thinkingBudget: 0 } } as never,
  });

  let fullText = "";
  let ultimaDescricao = "";

  for await (const chunk of stream.stream) {
    fullText += chunk.text();

    // Conta quantos "cod_item" já apareceram — um por item gerado
    const encontrados = (fullText.match(/"cod_item"/g) || []).length;

    // Última descrição que apareceu no stream
    const allDescs = [...fullText.matchAll(/"descricao"\s*:\s*"([^"]+)"/g)];
    if (allDescs.length > 0) {
      ultimaDescricao = allDescs[allDescs.length - 1][1];
    }

    onProgress?.(encontrados, totalItens, ultimaDescricao);
  }

  const raw = fullText.trim()
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  return JSON.parse(raw);
}
