import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Star, Download, Link2, Check, Trophy, ScanLine, Loader2, ExternalLink, Plus, Trash2, X, Settings, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type VendedorScore, type CanalScore,
  fetchVendedoresCampanha, fetchScoreboard, fetchCanaisScore,
  getGoogleReviewUrl, setGoogleReviewUrl, criarCanal, removerCanal,
} from "@/lib/avaliacoes";

// slug do nome do arquivo do QR
const slug = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "qr";

// Baixa o <canvas> do QR como PNG.
function baixarQR(wrap: HTMLElement | null, nome: string) {
  const canvas = wrap?.querySelector("canvas");
  if (!canvas) return;
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `qr-avaliacao-${slug(nome)}.png`;
  a.click();
}

// Card do vendedor: QR (baixável) + nº de avaliações (scans).
function VendedorCard({ score, baseUrl, rank }: { score: VendedorScore; baseUrl: string; rank: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const url = `${baseUrl}/avaliar?vendedor=${encodeURIComponent(score.vendedor_cod)}`;
  const medalha = rank === 0 ? "text-amber-400" : rank === 1 ? "text-slate-300" : rank === 2 ? "text-orange-400" : "";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center">
      <div className="flex items-center gap-2 mb-3">
        {rank < 3 && score.scans > 0 && <Trophy className={cn("w-4 h-4", medalha)} />}
        <span className="text-xs font-black text-foreground uppercase tracking-tight truncate">{score.vendedor_nome}</span>
      </div>

      <div ref={wrapRef} className="bg-white p-3 rounded-xl shadow-inner">
        <QRCodeCanvas value={url} size={132} level="M" includeMargin={false} />
      </div>

      <button
        onClick={() => baixarQR(wrapRef.current, score.vendedor_nome)}
        className="mt-3 px-3 py-1.5 rounded-lg border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-1.5"
      >
        <Download className="w-3 h-3" /> Baixar QR
      </button>

      <div className="grid grid-cols-2 gap-2 w-full mt-4 pt-4 border-t border-border/50">
        <div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter leading-none">{score.scans}</p>
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Avaliações</span>
        </div>
        <div>
          <p className="text-2xl font-black text-foreground tracking-tighter leading-none">{score.identificados}</p>
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Identificados</span>
        </div>
      </div>
    </div>
  );
}

// Card do canal avulso (ex.: cupom da NF): QR próprio + nº de avaliações.
function CanalCard({ canal, baseUrl, onRemove }: { canal: CanalScore; baseUrl: string; onRemove: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const url = `${baseUrl}/avaliar?canal=${encodeURIComponent(canal.id)}`;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col items-center text-center relative">
      <button onClick={onRemove} className="absolute top-3 right-3 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Remover canal">
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-rose-500" />
      </button>
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-black text-foreground uppercase tracking-tight truncate">{canal.nome}</span>
      </div>

      <div ref={wrapRef} className="bg-white p-3 rounded-xl shadow-inner">
        <QRCodeCanvas value={url} size={132} level="M" includeMargin={false} />
      </div>

      <button
        onClick={() => baixarQR(wrapRef.current, canal.nome)}
        className="mt-3 px-3 py-1.5 rounded-lg border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-1.5"
      >
        <Download className="w-3 h-3" /> Baixar QR
      </button>

      <div className="w-full mt-4 pt-4 border-t border-border/50">
        <p className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter leading-none">{canal.scans}</p>
        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Avaliações por este QR</span>
      </div>
    </div>
  );
}

export function AvaliacoesView() {
  const [scores, setScores] = useState<VendedorScore[]>([]);
  const [canais, setCanais] = useState<CanalScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [reviewUrl, setReviewUrl] = useState("");
  const [urlDraft, setUrlDraft] = useState("");
  const [salvandoUrl, setSalvandoUrl] = useState(false);
  const [urlSalva, setUrlSalva] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const [novoCanal, setNovoCanal] = useState("");
  const [criandoCanal, setCriandoCanal] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [sellers, url, cns] = await Promise.all([
        fetchVendedoresCampanha(), getGoogleReviewUrl(), fetchCanaisScore(),
      ]);
      setReviewUrl(url); setUrlDraft(url);
      setScores(await fetchScoreboard(sellers));
      setCanais(cns);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvarUrl = async () => {
    setSalvandoUrl(true);
    setErro(null);
    try {
      await setGoogleReviewUrl(urlDraft);
      setReviewUrl(urlDraft.trim());
      setUrlSalva(true);
      setTimeout(() => setUrlSalva(false), 2000);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvandoUrl(false);
    }
  };

  const adicionarCanal = async () => {
    const nome = novoCanal.trim();
    if (!nome) return;
    setCriandoCanal(true);
    setErro(null);
    try {
      await criarCanal(nome);
      setNovoCanal("");
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCriandoCanal(false);
    }
  };

  const excluirCanal = async (c: CanalScore) => {
    if (!confirm(`Remover o canal "${c.nome}"? Os ${c.scans} scans registrados são mantidos, mas o QR para de contar.`)) return;
    try { await removerCanal(c.id); carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  };

  const scansVendedores = scores.reduce((a, s) => a + s.scans, 0);
  const scansCanais = canais.reduce((a, c) => a + c.scans, 0);
  const lider = scores.find(s => s.scans > 0);

  return (
    <div className="flex-1 p-6 lg:p-8 bg-background h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <Star className="w-4 h-4 text-blue-600 dark:text-blue-400 fill-current" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-none">Avaliações Google</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Cada QR escaneado conta uma avaliação</p>
          </div>
        </div>
        <button
          onClick={() => { setUrlDraft(reviewUrl); setConfigOpen(true); }}
          title="Configurar link do Google"
          className="shrink-0 p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {!reviewUrl && (
        <div className="mt-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
            Nenhum link de avaliação do Google configurado — os QRs abrem a página mas não enviam o cliente ao Google.
          </span>
          <button onClick={() => { setUrlDraft(""); setConfigOpen(true); }} className="shrink-0 text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300 underline">Configurar</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        <div className="bg-card border border-border rounded-xl p-4">
          <Star className="w-4 h-4 text-blue-600 dark:text-blue-400 mb-2 fill-current" />
          <p className="text-xl font-black text-foreground tracking-tighter">{scansVendedores + scansCanais}</p>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Avaliações no total</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <ScanLine className="w-4 h-4 text-muted-foreground mb-2" />
          <p className="text-xl font-black text-foreground tracking-tighter">{scansVendedores}</p>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Via vendedores</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <Ticket className="w-4 h-4 text-muted-foreground mb-2" />
          <p className="text-xl font-black text-foreground tracking-tighter">{scansCanais}</p>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Via cupons / canais</span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <Trophy className="w-4 h-4 text-amber-500 mb-2" />
          <p className="text-xl font-black text-foreground tracking-tighter truncate">{lider ? lider.vendedor_nome.split(" ")[0] : "—"}</p>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Líder atual</span>
        </div>
      </div>

      {erro && (
        <div className="mt-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-xl px-4 py-3">
          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">{erro}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* Vendedores */}
          <div className="mt-8">
            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-3">Vendedores</div>
            {scores.length === 0 ? (
              <div className="bg-card border border-border rounded-xl py-12 text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nenhum vendedor na campanha</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {scores.map((s, i) => <VendedorCard key={s.vendedor_cod} score={s} baseUrl={baseUrl} rank={i} />)}
              </div>
            )}
          </div>

          {/* Canais / Cupons */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cupons &amp; canais avulsos</div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3 mb-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Novo cupom / canal</label>
                <input
                  value={novoCanal}
                  onChange={e => setNovoCanal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") adicionarCanal(); }}
                  placeholder="Ex.: Cupom Nota Fiscal"
                  className="w-full px-3 py-2 text-xs font-bold bg-background border border-border rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={adicionarCanal}
                disabled={criandoCanal || !novoCanal.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
              >
                {criandoCanal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Criar QR
              </button>
            </div>

            {canais.length === 0 ? (
              <div className="bg-card border border-border rounded-xl py-10 text-center">
                <Ticket className="w-6 h-6 text-muted-foreground mx-auto mb-2 opacity-40" />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nenhum cupom criado — o QR da NF entra aqui</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {canais.map(c => <CanalCard key={c.id} canal={c} baseUrl={baseUrl} onRemove={() => excluirCanal(c)} />)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Config do link do Google */}
      {configOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfigOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-500" /> Link de avaliação do Google
              </h3>
              <button onClick={() => setConfigOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[11px] font-bold text-muted-foreground leading-relaxed">
                Para onde todos os QRs (vendedores e cupons) enviam o cliente. Já está configurado — só mude se o link do Google mudar.
              </p>
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                placeholder="https://g.page/r/.../review"
                className="w-full px-3 py-2 text-xs font-bold bg-background border border-border rounded-lg focus:outline-none focus:border-blue-500"
              />
              <div className="flex items-center justify-end gap-2">
                {reviewUrl && (
                  <a href={reviewUrl} target="_blank" rel="noreferrer"
                    className="px-3 py-2 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Testar
                  </a>
                )}
                <button
                  onClick={salvarUrl}
                  disabled={salvandoUrl || urlDraft.trim() === reviewUrl.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  {urlSalva ? <Check className="w-3.5 h-3.5" /> : salvandoUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  {urlSalva ? "Salvo" : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
