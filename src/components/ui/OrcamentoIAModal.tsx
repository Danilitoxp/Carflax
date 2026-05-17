import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Copy, Check, AlertCircle, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchProdutosAPI, matchOrcamentoComIA, contarItens, type ItemOrcamento, type ProdutoAPI } from "@/lib/orcamento-ia";

interface OrcamentoIAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLACEHOLDER = `Ex:
3 ralo sifonado 100x100
1 junção de 100x50
1 junção de 50x50
3m de tubo de 100
1 cotovelo de 100x90°
3m de tubo de 40mm
4 cotovelo 40x90°`;

export function OrcamentoIAModal({ isOpen, onClose }: OrcamentoIAModalProps) {
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [produtos, setProdutos] = useState<ProdutoAPI[]>([]);
  const [etapa, setEtapa] = useState<"idle" | "carregando-catalogo" | "processando" | "resultado">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [progresso, setProgresso] = useState({ encontrados: 0, total: 0, descricao: "" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTexto("");
      setItens([]);
      setErro(null);
      setEtapa("idle");
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleProcessar = async () => {
    if (!texto.trim()) return;
    setErro(null);
    setItens([]);

    try {
      let catalogo = produtos;
      if (catalogo.length === 0) {
        setEtapa("carregando-catalogo");
        catalogo = await fetchProdutosAPI();
        setProdutos(catalogo);
      }

      const total = contarItens(texto);
      setProgresso({ encontrados: 0, total, descricao: "" });
      setEtapa("processando");

      const resultado = await matchOrcamentoComIA(texto, catalogo, (encontrados, total, descricao) => {
        setProgresso({ encontrados, total, descricao });
      });
      setItens(resultado);
      setEtapa("resultado");
    } catch (err) {
      console.error(err);
      setErro("Erro ao processar o orçamento. Verifique sua conexão e tente novamente.");
      setEtapa("idle");
    }
  };

  const handleCopiar = () => {
    const header = "Nº\tDESCRIÇÃO\tQTD\tVR. UNIT\tVR. TOTAL";
    const linhas = itens.map((it, i) =>
      `${i + 1}\t${it.descricao}\t${it.quantidade}\t${fmt(it.preco_unit)}\t${fmt(it.total)}`
    );
    const totalGeral = itens.reduce((s, it) => s + it.total, 0);
    const texto = [header, ...linhas, `\t\t\tTOTAL\t${fmt(totalGeral)}`].join("\n");
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalGeral = itens.reduce((s, it) => s + it.total, 0);
  const naoEncontrados = itens.filter(it => !it.encontrado).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-sm bg-black/60">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-gradient-to-r from-blue-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-tight">Orçamento com IA</h2>
              <p className="text-[10px] font-bold text-muted-foreground">Cole a lista de itens — a IA busca os produtos no sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest">Ctrl+O</span>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0 divide-x divide-border">
          {/* Left - Input */}
          <div className="w-72 shrink-0 flex flex-col p-4 gap-3">
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Lista de Itens</label>
            <textarea
              ref={textareaRef}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder={PLACEHOLDER}
              disabled={etapa === "carregando-catalogo" || etapa === "processando"}
              className="flex-1 p-3 bg-secondary/30 border border-border rounded-xl text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder:text-muted-foreground/30 leading-relaxed min-h-[300px]"
            />
            {erro && (
              <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-rose-400">{erro}</p>
              </div>
            )}
            <button
              onClick={handleProcessar}
              disabled={!texto.trim() || etapa === "carregando-catalogo" || etapa === "processando"}
              className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {etapa === "carregando-catalogo" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando Catálogo...</>
              ) : etapa === "processando" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> IA Processando...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> Gerar Orçamento</>
              )}
            </button>
          </div>

          {/* Right - Result */}
          <div className="flex-1 flex flex-col min-w-0">
            {etapa === "idle" || etapa === "carregando-catalogo" || etapa === "processando" ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-12">
                {etapa === "idle" ? (
                  <>
                    <Package className="w-10 h-10 text-muted-foreground/20" />
                    <p className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">Cole os itens ao lado e clique em Gerar Orçamento</p>
                  </>
                ) : etapa === "carregando-catalogo" ? (
                  <>
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Carregando catálogo de produtos...</p>
                    <div className="w-full max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full animate-pulse w-1/3" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                    </div>
                    <div className="w-full max-w-sm space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground">
                        <span className="uppercase tracking-widest">
                          {progresso.encontrados === 0 ? "Aguardando IA..." : "Itens encontrados"}
                        </span>
                        <span className="text-blue-400">
                          {progresso.encontrados} / {progresso.total}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        {progresso.encontrados === 0 ? (
                          <div className="h-full w-full bg-gradient-to-r from-transparent via-blue-500/50 to-transparent rounded-full animate-[shimmer_1.5s_infinite]"
                            style={{ backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite linear", backgroundImage: "linear-gradient(90deg, transparent 0%, rgb(59,130,246,0.4) 50%, transparent 100%)" }}
                          />
                        ) : (
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((progresso.encontrados / progresso.total) * 100, 98)}%` }}
                          />
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground truncate min-h-[14px]">
                        {progresso.encontrados === 0
                          ? <span className="text-muted-foreground/40 italic">Preparando resposta...</span>
                          : progresso.descricao
                            ? <><span className="text-muted-foreground/50">Último: </span>{progresso.descricao}</>
                            : null
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Result Header */}
                <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                      {itens.length} {itens.length === 1 ? "item" : "itens"} encontrados
                    </span>
                    {naoEncontrados > 0 && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {naoEncontrados} não encontrado{naoEncontrados > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleCopiar}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-all active:scale-95"
                  >
                    {copiado ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiado ? "Copiado!" : "Copiar"}
                  </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm z-10">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest w-8">Nº</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Código</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Descrição</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest w-16">Qtd</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest w-24">Vr. Unit</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest w-24">Vr. Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {itens.map((it, i) => (
                        <tr key={i} className={cn(
                          "transition-colors hover:bg-secondary/30",
                          !it.encontrado && "opacity-60"
                        )}>
                          <td className="px-4 py-2.5 text-muted-foreground font-mono text-[10px]">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            {it.encontrado ? (
                              <span className="font-mono text-[10px] text-blue-500 font-black">{it.cod_item}</span>
                            ) : (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">NÃO ENCONTRADO</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-bold text-foreground max-w-[220px]">
                            <span className="line-clamp-2">{it.descricao}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-black text-foreground">{it.quantidade}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">{it.preco_unit > 0 ? fmt(it.preco_unit) : "—"}</td>
                          <td className="px-4 py-2.5 text-right font-black text-foreground">{it.total > 0 ? fmt(it.total) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-secondary/50">
                        <td colSpan={5} className="px-4 py-3 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Geral</td>
                        <td className="px-4 py-3 text-right text-sm font-black text-emerald-500">{fmt(totalGeral)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
