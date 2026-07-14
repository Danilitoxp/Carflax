import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Type,
  Image as ImageIcon,
  Sparkles,
  Bot,
  Upload,
  Loader2,
  Trash2,
  Plus,
  Download,
} from "lucide-react";
import { generateCreativeImage, askGenos, type CreativePart } from "@/lib/gemini-service";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Tipos de dados dos nós                                              */
/* ------------------------------------------------------------------ */

interface TextNodeData extends Record<string, unknown> {
  title: string;
  text: string;
  accent: string; // cor do cabeçalho
}
interface ImageNodeData extends Record<string, unknown> {
  title: string;
  src?: string; // data URL para preview
  base64?: string; // base64 puro (sem prefixo)
  mimeType?: string;
}
interface GenosNodeData extends Record<string, unknown> {
  title: string;
}
interface ResultNodeData extends Record<string, unknown> {
  title: string;
  images: string[];
  loading: boolean;
  qty: number;
  aspect: string;
  model: string;
  error?: string;
  /** Card extra gerado automaticamente (para quantidade > 1); removido a cada nova geração. */
  extra?: boolean;
}

/** Converte "4:5" em razão CSS (ex: "4 / 5") para o container respeitar o formato. */
function aspectToCss(aspect: string): string {
  const [w, h] = (aspect || "1:1").split(":").map((v) => Number(v) || 1);
  return `${w} / ${h}`;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function readFileAsDataUrl(file: File): Promise<{ dataUrl: string; base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      resolve({ dataUrl, base64, mimeType: file.type || "image/png" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Reescala um data URL para uma resolução maior (lado maior = targetLongSide) via canvas. */
function upscaleDataUrl(src: string, targetLongSide = 3840): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const longest = Math.max(img.width, img.height);
      const scale = targetLongSide / longest;
      if (scale <= 1) {
        resolve(src);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

/** Coleta todos os nós conectados (a montante) a um nó-alvo, atravessando o hub. */
function collectUpstream(targetId: string, nodes: Node[], edges: Edge[]): Node[] {
  const bySource = new Map<string, string[]>();
  edges.forEach((e) => {
    const arr = bySource.get(e.target) || [];
    arr.push(e.source);
    bySource.set(e.target, arr);
  });
  const seen = new Set<string>();
  const queue = [...(bySource.get(targetId) || [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    (bySource.get(id) || []).forEach((s) => queue.push(s));
  }
  return nodes.filter((n) => seen.has(n.id));
}

const HEADER_ACCENTS: Record<string, string> = {
  orange: "text-orange-400",
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  violet: "text-violet-400",
};

/* ------------------------------------------------------------------ */
/* Nós customizados                                                    */
/* ------------------------------------------------------------------ */

const cardBase =
  "rounded-2xl border border-white/10 bg-[#181a1f]/95 backdrop-blur shadow-xl shadow-black/40 text-slate-200";
const handleClass = "!w-3 !h-3 !bg-primary !border-2 !border-[#181a1f]";

function NodeHeader({
  icon: Icon,
  title,
  accent,
  onDelete,
  right,
}: {
  icon: React.ElementType;
  title: string;
  accent?: string;
  onDelete?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
      <div className={cn("w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center", accent)}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className="text-xs font-bold uppercase tracking-tight flex-1 truncate">{title}</span>
      {right}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-1 rounded-md hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors nodrag"
          title="Remover"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function TextNode({ id, data }: NodeProps<Node<TextNodeData>>) {
  const { updateNodeData, deleteElements } = useReactFlow();
  return (
    <div className={cn(cardBase, "w-64")}>
      <Handle type="target" position={Position.Left} className={handleClass} />
      <NodeHeader
        icon={Type}
        title={data.title}
        accent={HEADER_ACCENTS[data.accent] || HEADER_ACCENTS.orange}
        onDelete={() => deleteElements({ nodes: [{ id }] })}
      />
      <textarea
        value={data.text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
        placeholder="Digite o texto..."
        rows={5}
        className="nodrag w-full bg-transparent resize-none px-3 py-2.5 text-[11px] leading-relaxed text-slate-300 outline-none placeholder:text-slate-600"
      />
      <Handle type="source" position={Position.Right} className={handleClass} />
    </div>
  );
}

function ImageNode({ id, data }: NodeProps<Node<ImageNodeData>>) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file?: File) => {
    if (!file) return;
    const { dataUrl, base64, mimeType } = await readFileAsDataUrl(file);
    updateNodeData(id, { src: dataUrl, base64, mimeType });
  };

  return (
    <div className={cn(cardBase, "w-64")}>
      <Handle type="target" position={Position.Left} className={handleClass} />
      <NodeHeader
        icon={ImageIcon}
        title={data.title}
        accent={HEADER_ACCENTS.blue}
        onDelete={() => deleteElements({ nodes: [{ id }] })}
      />
      <div className="p-3">
        <button
          onClick={() => inputRef.current?.click()}
          className="nodrag w-full aspect-video rounded-xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-black/20 flex flex-col items-center justify-center gap-1.5 overflow-hidden transition-colors"
        >
          {data.src ? (
            <img src={data.src} alt={data.title} className="w-full h-full object-cover" />
          ) : (
            <>
              <Upload className="w-5 h-5 text-slate-500" />
              <span className="text-[10px] text-slate-500 font-medium">Clique para adicionar mídia</span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>
      <Handle type="source" position={Position.Right} className={handleClass} />
    </div>
  );
}

function GenosNode({ id, data }: NodeProps<Node<GenosNodeData>>) {
  const { deleteElements, getNodes, getEdges, updateNodeData, setNodes } = useReactFlow();
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [aspect, setAspect] = useState("4:5");
  const [qty, setQty] = useState(1);

  const ask = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setAnswer("");
    try {
      // Pede uma copy pronta para post (headline/apoio/CTA), fácil de aplicar na Copy.
      const res = await askGenos(
        `${prompt.trim()}\n\nResponda SOMENTE com a copy pronta para o post, neste formato exato, sem comentários:\nHeadline:\n<uma linha forte>\n\nApoio:\n<um benefício ou oferta>\n\nCTA:\n<chamada curta>`
      );
      setAnswer(res);

      const nodes = getNodes();
      // Atualiza todas as Copy com o texto gerado.
      nodes
        .filter((n) => n.type === "text" && String((n.data as TextNodeData).title || "").toLowerCase().startsWith("copy"))
        .forEach((n) => updateNodeData(n.id, { text: res }));

      // Aplica o formato e a quantidade escolhidos aqui no(s) Resultado(s) e gera.
      nodes.filter((n) => n.type === "result").forEach((n) => updateNodeData(n.id, { aspect, qty }));

      const rf = { getNodes, getEdges, updateNodeData, setNodes };
      // Só o card âncora (não-extra) dispara a geração; ele cria os cards adicionais conforme a quantidade.
      await Promise.all(
        nodes.filter((n) => n.type === "result" && !(n.data as ResultNodeData).extra).map((n) => runGeneration(n.id, rf))
      );
    } catch (e) {
      setAnswer("Erro ao consultar o Genos. Verifique a chave da IA.");
      console.error("[Criativo] Genos:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(cardBase, "w-72")}>
      <NodeHeader
        icon={Bot}
        title={data.title}
        accent={HEADER_ACCENTS.emerald}
        onDelete={() => deleteElements({ nodes: [{ id }] })}
      />
      <div className="p-3 space-y-2">
        <div className="min-h-[80px] max-h-40 overflow-y-auto rounded-xl bg-black/20 border border-white/5 p-2.5 text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
          {loading ? (
            <span className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Pensando...
            </span>
          ) : answer ? (
            answer
          ) : (
            <span className="text-slate-600">Analiso seu fluxo e ajudo com prompts, dicas e estratégias criativas.</span>
          )}
        </div>

        {/* Formato e quantidade da geração */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[10px] text-slate-500">
            Formato
            <select
              value={aspect}
              onChange={(e) => {
                const v = e.target.value;
                setAspect(v);
                // Reflete o formato nos cards de Resultado na hora, antes mesmo de gerar.
                getNodes()
                  .filter((n) => n.type === "result")
                  .forEach((n) => updateNodeData(n.id, { aspect: v }));
              }}
              className="nodrag bg-black/30 border border-white/5 rounded-md px-2 py-1 text-[10px] text-slate-300 outline-none"
            >
              {["1:1", "4:5", "9:16", "16:9"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-[10px] text-slate-500">
            Qtd
            <input
              type="number"
              min={1}
              max={4}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="nodrag w-10 bg-black/30 border border-white/5 rounded-md px-1.5 py-1 text-center text-slate-300 outline-none"
            />
          </label>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-black/30 border border-white/5 px-2 py-1.5">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Pergunte alguma coisa"
            className="nodrag flex-1 bg-transparent text-[11px] outline-none placeholder:text-slate-600"
          />
          <button
            onClick={ask}
            disabled={loading}
            className="nodrag w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center disabled:opacity-40 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={handleClass} />
    </div>
  );
}

function MergeNode() {
  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      <Handle type="target" position={Position.Left} className={handleClass} />
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
      <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-500 shadow-lg shadow-primary/40 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <Handle type="source" position={Position.Right} className={handleClass} />
    </div>
  );
}

type RFHelpers = {
  getNodes: () => Node[];
  getEdges: () => Edge[];
  updateNodeData: (id: string, patch: Record<string, unknown>) => void;
  setNodes: (payload: Node[] | ((nodes: Node[]) => Node[])) => void;
};

/** Gera a imagem do nó Resultado a partir dos nós conectados a montante. Reutilizável (Resultado e Genos). */
async function runGeneration(resultId: string, rf: RFHelpers) {
  const resultNode = rf.getNodes().find((n) => n.id === resultId);
  if (!resultNode) return;
  const data = resultNode.data as ResultNodeData;
  if (data.loading) return;

  const upstream = collectUpstream(resultId, rf.getNodes(), rf.getEdges());
  const parts: CreativePart[] = [];

  // Instruções de texto primeiro, depois imagens de referência.
  upstream
    .filter((n) => n.type === "text")
    .forEach((n) => {
      const t = (n.data as TextNodeData).text?.trim();
      if (t) parts.push({ text: t });
    });

  // Cada imagem entra ROTULADA pelo nome do nó (Logo, Produto...), para o modelo saber o papel dela.
  const imageNodes = upstream.filter((n) => n.type === "image") as Node<ImageNodeData>[];
  let hasLogo = false;
  imageNodes.forEach((n) => {
    const d = n.data as ImageNodeData;
    if (!d.base64 || !d.mimeType) return;
    const title = String(d.title || "Imagem").trim();
    const isLogo = title.toLowerCase().includes("logo");
    if (isLogo) hasLogo = true;
    const role = isLogo
      ? `A imagem a seguir é a LOGO da marca. Aplique-a SEMPRE de forma visível e nítida no rodapé (ou canto) da arte, preservando as cores e proporções originais, sem distorcer, cortar ou recriar.`
      : title.toLowerCase().includes("produt")
      ? `A imagem a seguir é o PRODUTO principal. Coloque-o em destaque no centro, bem iluminado, mantendo fielmente o formato e as marcas do produto.`
      : `A imagem a seguir ("${title}") é uma referência visual.`;
    parts.push({ text: role });
    parts.push({ image: { data: d.base64, mimeType: d.mimeType } });
  });

  if (parts.length === 0) {
    rf.updateNodeData(resultId, { error: "Conecte pelo menos uma imagem ou texto ao Resultado." });
    return;
  }

  const aspect = data.aspect || "4:5";
  const [aw, ah] = aspect.split(":").map((v) => Number(v) || 1);
  const orientacao = aw === ah ? "QUADRADA (1:1)" : ah > aw ? "VERTICAL (retrato)" : "HORIZONTAL (paisagem)";

  parts.push({
    text:
      `Gere um novo criativo publicitário. ` +
      `FORMATO OBRIGATÓRIO: proporção EXATA ${aspect} (imagem ${orientacao}). A imagem final DEVE ter esse enquadramento, não use quadrado se o formato pedido não for 1:1. ` +
      `Use as imagens como referência visual e o texto como orientação de copy/ângulo. ` +
      `REGRA DE TEXTO (crítica): escreva na arte APENAS os textos fornecidos na copy, em português do Brasil, ` +
      `copiando cada palavra LETRA POR LETRA, sem inventar, traduzir, abreviar ou trocar palavras, e sem erros de ortografia. ` +
      `Se não conseguir escrever alguma palavra corretamente, deixe o espaço vazio em vez de escrever errado. ` +
      (hasLogo
        ? `OBRIGATÓRIO: a LOGO enviada deve aparecer visível e legível na arte final (de preferência no rodapé), ` +
          `reproduzindo o texto da logo EXATAMENTE como na imagem original, sem reescrever nem embaralhar as letras. `
        : ``) +
      `Qualidade máxima: altíssima resolução, nitidez de estúdio, detalhes finos e bordas limpas, ` +
      `iluminação profissional, tipografia perfeitamente legível e sem artefatos.`,
  });

  // Remove cards extras de gerações anteriores.
  rf.setNodes((nds) => nds.filter((n) => !(n.type === "result" && (n.data as ResultNodeData).extra)));
  rf.updateNodeData(resultId, { loading: true, error: undefined, images: [] });

  try {
    const collected: string[] = [];
    const qty = Math.max(1, Math.min(4, data.qty || 1));
    for (let i = 0; i < qty; i++) {
      const imgs = await generateCreativeImage(parts);
      collected.push(...imgs);
    }

    if (collected.length === 0) {
      rf.updateNodeData(resultId, { loading: false, error: "A IA não retornou imagem. Tente ajustar os inputs." });
      return;
    }

    // 1ª imagem fica no card âncora; as demais viram cards separados.
    rf.updateNodeData(resultId, { loading: false, images: [collected[0]], error: undefined });

    const anchor = rf.getNodes().find((n) => n.id === resultId);
    const baseX = anchor?.position.x ?? 900;
    const baseY = anchor?.position.y ?? 200;
    const extras = collected.slice(1).map((img, i): Node => ({
      id: `result-extra-${Date.now()}-${i}`,
      type: "result",
      position: { x: baseX, y: baseY + (i + 1) * 460 },
      data: {
        title: "Resultado",
        images: [img],
        loading: false,
        qty: 1,
        aspect,
        model: (anchor?.data as ResultNodeData)?.model || "Nano Banana 2",
        extra: true,
      } as ResultNodeData,
    }));
    if (extras.length) rf.setNodes((nds) => [...nds, ...extras]);
  } catch (e) {
    console.error("[Criativo] Geração:", e);
    rf.updateNodeData(resultId, { loading: false, error: "Erro ao gerar. Verifique a chave da IA (VITE_GEMINI_IA)." });
  }
}

function ResultNode({ id, data }: NodeProps<Node<ResultNodeData>>) {
  const { deleteElements } = useReactFlow();
  const [downloading, setDownloading] = useState(false);

  // Baixa a(s) imagem(ns) em 4K: reescala o resultado do modelo para lado maior de ~3840px.
  const downloadAll = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      for (let i = 0; i < data.images.length; i++) {
        const hi = await upscaleDataUrl(data.images[i], 3840);
        const a = document.createElement("a");
        a.href = hi;
        a.download = `criativo-carflax-4k-${Date.now()}-${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn(cardBase, "w-80")}>
      <Handle type="target" position={Position.Left} className={handleClass} />
      <NodeHeader
        icon={Sparkles}
        title={data.title}
        accent={HEADER_ACCENTS.violet}
        onDelete={() => deleteElements({ nodes: [{ id }] })}
        right={
          <div className="flex items-center gap-1.5">
            {data.images.length > 0 && (
              <button
                onClick={downloadAll}
                disabled={downloading}
                title="Baixar em 4K"
                className="nodrag flex items-center gap-1 h-6 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span className="text-[9px] font-black">4K</span>
              </button>
            )}
            <span className="text-[9px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-md">{data.aspect}</span>
          </div>
        }
      />
      <div className="p-3 space-y-2">
        <div
          className="rounded-xl bg-black/30 border border-white/5 overflow-hidden flex items-center justify-center"
          style={{ aspectRatio: aspectToCss(data.aspect) }}
        >
          {data.loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-[10px] font-medium">Gerando criativo...</span>
            </div>
          ) : data.images.length > 0 ? (
            <a href={data.images[0]} download="criativo.png" className="nodrag relative group block w-full h-full overflow-hidden">
              <img src={data.images[0]} alt="Resultado" className="w-full h-full object-cover" />
              <span className="absolute bottom-1 right-1 p-1 rounded-md bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="w-3 h-3 text-white" />
              </span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-slate-600">
              <Sparkles className="w-6 h-6" />
              <span className="text-[10px] font-medium">Sua imagem aparecerá aqui</span>
            </div>
          )}
        </div>

        {data.error && <p className="text-[10px] text-rose-400 font-medium">{data.error}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Layout inicial (espelha o formato da referência)                    */
/* ------------------------------------------------------------------ */

const DIRECAO_ARTE_PADRAO =
  "Crie uma arte de POST profissional para redes sociais de uma loja de materiais HIDRÁULICOS e ELÉTRICOS.\n\n" +
  "Estilo: design publicitário moderno, limpo e de alta conversão, qualidade de agência.\n" +
  "Composição: produto enviado em DESTAQUE no centro, bem iluminado, com sombra suave e realista; " +
  "fundo com gradiente e elementos gráficos sutis (tubos/conexões e ícones de energia/raio).\n" +
  "Paleta: azul (hidráulica/água) combinado com laranja/amarelo (elétrica), contraste forte e profissional.\n" +
  "Marca: aplique a LOGO enviada de forma equilibrada no topo ou canto, sem distorcer nem cortar.\n" +
  "Deixe áreas de respiro para headline e CTA. Se houver copy conectada, incorpore-a com tipografia bold e legível.\n" +
  "Entrega: imagem nítida, alta resolução, pronta para feed.";

const initialNodes: Node[] = [
  { id: "genos", type: "genos", position: { x: 40, y: 240 }, data: { title: "Genos" } },
  { id: "logo", type: "image", position: { x: 370, y: 60 }, data: { title: "Logo" } },
  { id: "produto", type: "image", position: { x: 370, y: 320 }, data: { title: "Produto" } },
  {
    id: "direcao",
    type: "text",
    position: { x: 690, y: 20 },
    data: { title: "Direção de Arte", accent: "violet", text: DIRECAO_ARTE_PADRAO },
  },
  {
    id: "copy",
    type: "text",
    position: { x: 690, y: 380 },
    data: {
      title: "Copy",
      accent: "orange",
      text:
        "Headline:\n[SUA CHAMADA PRINCIPAL]\n\nApoio:\n[BENEFÍCIO OU OFERTA]\n\nCTA:\n[EX: CONFIRA NA LOJA]",
    },
  },
  { id: "merge", type: "merge", position: { x: 720, y: 250 }, data: {} },
  {
    id: "resultado",
    type: "result",
    position: { x: 900, y: 200 },
    data: { title: "Resultado", images: [], loading: false, qty: 1, aspect: "4:5", model: "Nano Banana 2" },
  },
];

const initialEdges: Edge[] = [
  { id: "e-logo", source: "logo", target: "merge", animated: true },
  { id: "e-produto", source: "produto", target: "merge", animated: true },
  { id: "e-direcao", source: "direcao", target: "merge", animated: true },
  { id: "e-copy", source: "copy", target: "merge", animated: true },
  { id: "e-merge-result", source: "merge", target: "resultado", animated: true },
];

const STORAGE_KEY = "carflax_criativo_canvas_v2";

/* ------------------------------------------------------------------ */
/* Canvas                                                              */
/* ------------------------------------------------------------------ */

const nodeTypes = { text: TextNode, image: ImageNode, genos: GenosNode, merge: MergeNode, result: ResultNode };

function Canvas() {
  const loadInitial = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.nodes?.length) return parsed as { nodes: Node[]; edges: Edge[] };
      }
    } catch {
      /* ignora */
    }
    return { nodes: initialNodes, edges: initialEdges };
  };
  const initial = loadInitial();

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);
  const idRef = useRef(1);

  // Persiste o canvas (sem os previews base64 gigantes das imagens de resultado).
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const clean = nodes
          // Não persiste os cards de resultado extras (gerados por quantidade > 1).
          .filter((n) => !(n.type === "result" && (n.data as ResultNodeData).extra))
          .map((n) => (n.type === "result" ? { ...n, data: { ...n.data, images: [], loading: false } } : n));
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: clean, edges }));
      } catch {
        /* quota — ignora */
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const addNode = (type: "text" | "image") => {
    const n = idRef.current++;
    const id = `${type}-${Date.now()}-${n}`;
    const position = { x: 200 + Math.random() * 120, y: 120 + Math.random() * 120 };
    const data =
      type === "text"
        ? { title: `Copy ${n}`, accent: "orange", text: "" }
        : { title: `Mídia ${n}`, src: undefined, base64: undefined, mimeType: undefined };
    setNodes((nds) => [...nds, { id, type, position, data } as Node]);
  };

  const resetCanvas = () => {
    localStorage.removeItem(STORAGE_KEY);
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  return (
    <div className="w-full h-full relative bg-[#0d0f13]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: true, style: { stroke: "rgba(120,140,255,0.4)" } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#2a2d35" />
        <Controls className="!bg-[#181a1f] !border !border-white/10 !rounded-xl [&_button]:!bg-transparent [&_button]:!border-white/10 [&_button]:!text-slate-400" />
      </ReactFlow>

      {/* Barra de ferramentas inferior */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[#181a1f]/95 backdrop-blur border border-white/10 rounded-2xl px-2 py-1.5 shadow-xl shadow-black/40">
        <ToolbarButton icon={Type} label="Texto" onClick={() => addNode("text")} />
        <ToolbarButton icon={ImageIcon} label="Imagem" onClick={() => addNode("image")} />
        <div className="w-px h-6 bg-white/10 mx-1" />
        <ToolbarButton icon={Trash2} label="Resetar" onClick={resetCanvas} danger />
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors",
        danger
          ? "text-slate-400 hover:bg-rose-500/15 hover:text-rose-400"
          : "text-slate-300 hover:bg-primary/15 hover:text-primary"
      )}
      title={label}
    >
      {label === "Texto" || label === "Imagem" ? <Plus className="w-3.5 h-3.5" /> : null}
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function CriativoView() {
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 min-h-0">
        <ReactFlowProvider>
          <Canvas />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
