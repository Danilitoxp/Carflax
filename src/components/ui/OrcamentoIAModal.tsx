import { useState, useEffect, useRef, useMemo } from "react";
import {
  X, Sparkles, Copy, Check, AlertCircle, Package, Loader2,
  FileDown, Zap, Droplets, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  fetchProdutosAPI, matchOrcamentoComIA, contarItens, isCatalogoCached,
  HINTS_MEDIDAS, type ItemOrcamento, type Alternativa, type ProdutoAPI,
} from "@/lib/orcamento-ia";
import { gerarOrcamentoPDF, type PdfInfo } from "@/lib/orcamento-pdf";

interface OrcamentoIAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLACEHOLDER = `Ex:
3 ralo sifonado 100x100
1 junção de 100x50
3m de tubo de 100
1 cotovelo de 100x90°
4 dijuntor 20A
100m fio 2,5mm`;

function detectarHint(texto: string) {
  const linhas = texto.split("\n");
  const ultima = norm(linhas[linhas.length - 1]);
  for (const [kw, hint] of Object.entries(HINTS_MEDIDAS)) {
    if (ultima.includes(kw)) return { kw, ...hint };
  }
  return null;
}

function norm(str: string) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function ConfBadge({ confianca }: { confianca: number }) {
  if (confianca >= 90) return null; // perfeito — sem badge
  const [bg, text] =
    confianca >= 70 ? ["bg-amber-500/10 text-amber-400 border-amber-500/20", `${confianca}%`] :
    confianca >= 40 ? ["bg-orange-500/10 text-orange-400 border-orange-500/20", `${confianca}% ⚠`] :
                     ["bg-rose-500/10 text-rose-400 border-rose-500/20", "revisar"];
  return (
    <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded border ml-1.5 shrink-0", bg)}>
      {text}
    </span>
  );
}

export function OrcamentoIAModal({ isOpen, onClose }: OrcamentoIAModalProps) {
  const [texto, setTexto] = useState("");
  const [itens, setItens] = useState<ItemOrcamento[]>([]);
  const [produtos, setProdutos] = useState<ProdutoAPI[]>([]);
  const [etapa, setEtapa] = useState<"idle" | "carregando-catalogo" | "processando" | "resultado">("idle");
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [progresso, setProgresso] = useState({ encontrados: 0, total: 0, descricao: "" });
  const [expandedAlts, setExpandedAlts] = useState<Set<number>>(new Set());
  const [showPdfForm, setShowPdfForm] = useState(false);
  const [pdfInfo, setPdfInfo] = useState<PdfInfo>({ cliente: "", vendedor: "", condicao: "DINHEIRO / PIX" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hint = useMemo(() => detectarHint(texto), [texto]);

  useEffect(() => {
    if (isOpen) {
      setTexto("");
      setItens([]);
      setErro(null);
      setEtapa("idle");
      setExpandedAlts(new Set());
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const handleProcessar = async () => {
    if (!texto.trim()) return;
    setErro(null);
    setItens([]);
    setExpandedAlts(new Set());

    try {
      let catalogo = produtos;
      if (catalogo.length === 0) {
        if (!isCatalogoCached()) setEtapa("carregando-catalogo");
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
    const txt = [header, ...linhas, `\t\t\tTOTAL\t${fmt(totalGeral)}`].join("\n");
    navigator.clipboard.writeText(txt);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleHintClick = (medida: string) => {
    const linhas = texto.split("\n");
    linhas[linhas.length - 1] = linhas[linhas.length - 1].trimEnd() + " " + medida;
    setTexto(linhas.join("\n"));
    textareaRef.current?.focus();
  };

  const handleEscolherAlternativa = (idx: number, alt: Alternativa) => {
    setItens(prev => prev.map((it, i) =>
      i === idx
        ? { ...it, ...alt, preco_unit: alt.preco_unit, total: alt.preco_unit * it.quantidade, encontrado: true, confianca: 80, alternativas: [] }
        : it
    ));
    setExpandedAlts(prev => { const s = new Set(prev); s.delete(idx); return s; });
  };

  const toggleAlts = (idx: number) => {
    setExpandedAlts(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalGeral = itens.reduce((s, it) => s + it.total, 0);
  const naoEncontrados = itens.filter(it => !it.encontrado).length;
  const baixaConf = itens.filter(it => it.encontrado && it.confianca < 70).length;

  const grupos = useMemo(() => {
    const hidraulica = itens.filter(it => it.categoria === "hidraulica");
    const eletrica   = itens.filter(it => it.categoria === "eletrica");
    const outros     = itens.filter(it => it.categoria !== "hidraulica" && it.categoria !== "eletrica");
    return [
      { key: "hidraulica", label: "Hidráulica", Icon: Droplets, cor: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/20",   itens: hidraulica },
      { key: "eletrica",   label: "Elétrica",   Icon: Zap,      cor: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", itens: eletrica   },
      { key: "outros",     label: "Outros",      Icon: Package,  cor: "text-slate-400",  bg: "bg-slate-500/10",  border: "border-slate-500/20",  itens: outros     },
    ].filter(g => g.itens.length > 0);
  }, [itens]);

  if (!isOpen) return null;

  // Formulário de dados para o PDF
  const PdfForm = showPdfForm ? (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileDown className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-foreground uppercase tracking-tight">Dados do Orçamento</p>
              <p className="text-[10px] text-muted-foreground font-bold">Preenchimento opcional — aparece no PDF</p>
            </div>
          </div>
          <button onClick={() => setShowPdfForm(false)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Campos */}
        <div className="space-y-3">
          {/* Linha 1: Cliente */}
          <div>
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Cliente</label>
            <input
              type="text"
              placeholder="Nome do cliente"
              value={pdfInfo.cliente}
              onChange={e => setPdfInfo(p => ({ ...p, cliente: e.target.value }))}
              className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Linha 2: Endereço */}
          <div>
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Endereço</label>
            <input
              type="text"
              placeholder="Rua, número"
              value={pdfInfo.endereco || ""}
              onChange={e => setPdfInfo(p => ({ ...p, endereco: e.target.value }))}
              className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Linha 3: Município + CNPJ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Município</label>
              <input
                type="text"
                placeholder="Cidade"
                value={pdfInfo.municipio || ""}
                onChange={e => setPdfInfo(p => ({ ...p, municipio: e.target.value }))}
                className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">CPF / CNPJ</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={pdfInfo.cnpj || ""}
                onChange={e => setPdfInfo(p => ({ ...p, cnpj: e.target.value }))}
                className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Linha 4: Fone + CEP */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Fone</label>
              <input
                type="text"
                placeholder="(11) 99999-9999"
                value={pdfInfo.fone || ""}
                onChange={e => setPdfInfo(p => ({ ...p, fone: e.target.value }))}
                className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">CEP</label>
              <input
                type="text"
                placeholder="00000-000"
                value={pdfInfo.cep || ""}
                onChange={e => setPdfInfo(p => ({ ...p, cep: e.target.value }))}
                className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Linha 5: Vendedor + Condição */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Vendedor</label>
              <input
                type="text"
                placeholder="Nome do vendedor"
                value={pdfInfo.vendedor || ""}
                onChange={e => setPdfInfo(p => ({ ...p, vendedor: e.target.value }))}
                className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Condição</label>
              <select
                value={pdfInfo.condicao || "DINHEIRO / PIX"}
                onChange={e => setPdfInfo(p => ({ ...p, condicao: e.target.value }))}
                className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option>DINHEIRO / PIX</option>
                <option>CARTÃO DÉBITO</option>
                <option>CARTÃO CRÉDITO</option>
                <option>CARTÃO CRÉDITO 3X</option>
                <option>BOLETO 30 DIAS</option>
                <option>A PRAZO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setShowPdfForm(false)}
            className="flex-1 h-10 border border-border hover:bg-secondary text-muted-foreground font-black text-[11px] uppercase tracking-widest rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              gerarOrcamentoPDF(itens, pdfInfo);
              setShowPdfForm(false);
            }}
            className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <FileDown className="w-4 h-4" />Gerar PDF
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
    {PdfForm}
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
              <p className="text-[10px] font-bold text-muted-foreground">Cole a lista — a IA interpreta, categoriza, pontua confiança e sugere alternativas</p>
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
              className="flex-1 p-3 bg-secondary/30 border border-border rounded-xl text-xs font-medium text-foreground outline-none focus:ring-1 focus:ring-blue-500 resize-none placeholder:text-muted-foreground/30 leading-relaxed min-h-[200px]"
            />

            {/* Hints de autocomplete */}
            {hint && etapa === "idle" && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest truncate">{hint.titulo}</p>
                <div className="flex flex-wrap gap-1">
                  {hint.medidas.map(m => (
                    <button
                      key={m}
                      onClick={() => handleHintClick(m)}
                      className="px-2 py-0.5 text-[10px] font-black bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-md transition-colors"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Carregando Catálogo...</>
              ) : etapa === "processando" ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />IA Processando...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" />Gerar Orçamento</>
              )}
            </button>

            {etapa === "resultado" && (
              <button
                onClick={handleProcessar}
                className="w-full h-8 border border-border hover:bg-secondary text-muted-foreground font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" />Regerar
              </button>
            )}
          </div>

          {/* Right - Result */}
          <div className="flex-1 flex flex-col min-w-0">
            {etapa !== "resultado" ? (
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
                          {progresso.encontrados === 0 ? "Aguardando IA..." : "Itens processados"}
                        </span>
                        <span className="text-blue-400">{progresso.encontrados} / {progresso.total}</span>
                      </div>
                      <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                        {progresso.encontrados === 0 ? (
                          <div className="h-full w-full rounded-full"
                            style={{ backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.4) 50%, transparent 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite linear" }}
                          />
                        ) : (
                          <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
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
                <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0 gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">
                      {itens.length} {itens.length === 1 ? "item" : "itens"}
                    </span>
                    {naoEncontrados > 0 && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {naoEncontrados} não encontrado{naoEncontrados > 1 ? "s" : ""}
                      </span>
                    )}
                    {baixaConf > 0 && (
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        {baixaConf} revisar
                      </span>
                    )}
                    {grupos.length > 1 && grupos.map(g => (
                      <span key={g.key} className={cn("text-[9px] font-black px-2 py-0.5 rounded-md border", g.bg, g.border, g.cor)}>
                        <g.Icon className="w-2.5 h-2.5 inline mr-1" />
                        {g.itens.length} {g.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowPdfForm(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg transition-all active:scale-95"
                    >
                      <FileDown className="w-3 h-3" />PDF
                    </button>
                    <button
                      onClick={handleCopiar}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-secondary hover:bg-secondary/80 text-foreground rounded-lg transition-all active:scale-95"
                    >
                      {copiado ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiado ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                {/* Tabela agrupada */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm z-10">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest w-8">Nº</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Código</th>
                        <th className="px-4 py-2.5 text-left text-[9px] font-black text-muted-foreground uppercase tracking-widest">Descrição</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest w-12">Qtd</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest w-24">Vr. Unit</th>
                        <th className="px-4 py-2.5 text-right text-[9px] font-black text-muted-foreground uppercase tracking-widest w-24">Vr. Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {grupos.map(grupo => (
                        <>
                          {/* Cabeçalho de categoria */}
                          {grupos.length > 1 && (
                            <tr key={`hdr-${grupo.key}`} className={cn(grupo.bg, "border-y border-border/30")}>
                              <td colSpan={6} className="px-4 py-1.5">
                                <span className={cn("flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest", grupo.cor)}>
                                  <grupo.Icon className="w-3 h-3" />
                                  {grupo.label} · {grupo.itens.length} {grupo.itens.length === 1 ? "item" : "itens"}
                                </span>
                              </td>
                            </tr>
                          )}

                          {grupo.itens.map(it => {
                            const idx = itens.indexOf(it);
                            const temAlts = !it.encontrado && it.alternativas?.length > 0;
                            const altOpen = expandedAlts.has(idx);

                            return (
                              <>
                                <tr key={idx} className={cn(
                                  "transition-colors hover:bg-secondary/30",
                                  !it.encontrado && "opacity-70",
                                  it.encontrado && it.confianca < 70 && "bg-orange-500/5"
                                )}>
                                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-[10px]">{idx + 1}</td>
                                  <td className="px-4 py-2.5">
                                    {it.encontrado ? (
                                      <span className="font-mono text-[10px] text-blue-500 font-black">{it.cod_item}</span>
                                    ) : (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        N/ENCONTRADO
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-foreground max-w-[200px]">
                                    <div className="flex items-start gap-1 min-w-0">
                                      <span className="line-clamp-2 min-w-0">{it.descricao}</span>
                                      {it.encontrado && <ConfBadge confianca={it.confianca} />}
                                    </div>
                                    {!it.encontrado && temAlts && (
                                      <button
                                        onClick={() => toggleAlts(idx)}
                                        className="mt-1 flex items-center gap-1 text-[9px] font-black text-blue-400 hover:text-blue-300 transition-colors"
                                      >
                                        {altOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        {altOpen ? "Ocultar" : `Ver ${it.alternativas.length} sugestão${it.alternativas.length > 1 ? "ões" : ""}`}
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-black text-foreground">{it.quantidade}</td>
                                  <td className="px-4 py-2.5 text-right text-muted-foreground">{it.preco_unit > 0 ? fmt(it.preco_unit) : "—"}</td>
                                  <td className="px-4 py-2.5 text-right font-black text-foreground">{it.total > 0 ? fmt(it.total) : "—"}</td>
                                </tr>

                                {/* Alternativas expandíveis */}
                                {temAlts && altOpen && it.alternativas.map((alt, ai) => (
                                  <tr key={`alt-${idx}-${ai}`} className="bg-blue-500/5 border-l-2 border-blue-500/30">
                                    <td className="px-4 py-2" />
                                    <td className="px-4 py-2">
                                      <span className="font-mono text-[9px] text-blue-400">{alt.cod_item || "—"}</span>
                                    </td>
                                    <td className="px-4 py-2 max-w-[200px]">
                                      <span className="text-[10px] font-bold text-muted-foreground line-clamp-1">{alt.descricao}</span>
                                      <button
                                        onClick={() => handleEscolherAlternativa(idx, alt)}
                                        className="mt-0.5 text-[9px] font-black text-emerald-400 hover:text-emerald-300 transition-colors"
                                      >
                                        ✓ Usar este produto
                                      </button>
                                    </td>
                                    <td className="px-4 py-2 text-right text-[10px] text-muted-foreground">{it.quantidade}</td>
                                    <td className="px-4 py-2 text-right text-[10px] text-muted-foreground">{alt.preco_unit > 0 ? fmt(alt.preco_unit) : "—"}</td>
                                    <td className="px-4 py-2 text-right text-[10px] font-bold text-muted-foreground">
                                      {alt.preco_unit > 0 ? fmt(alt.preco_unit * it.quantidade) : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </>
                            );
                          })}
                        </>
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
    </>
  );
}
