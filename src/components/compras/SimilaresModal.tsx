// Itens similares: códigos equivalentes que a reposição soma como um item só
// (ex.: caixa d'água 1000L Amanco com 3 + Fortlev com 1 = 4 em estoque). O ERP
// não tem esse vínculo, então os grupos ficam no HUB. O 1º código é o principal:
// é ele que aparece na lista de reposição, com os outros somados embaixo.

import { useEffect, useState } from "react";
import { Link2, Loader2, Plus, Search, Trash2, X, Save } from "lucide-react";
import {
  apiComprasSimilares, apiComprasSalvarSimilares, apiComprasBuscarProdutos,
  type GrupoSimilares, type ProdutoBusca,
} from "@/lib/api";

export function SimilaresModal({ onFechar }: { onFechar: (mudou: boolean) => void }) {
  const [grupos, setGrupos] = useState<GrupoSimilares[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mudou, setMudou] = useState(false);

  useEffect(() => {
    apiComprasSimilares()
      .then((r) => setGrupos(r.grupos))
      .catch(() => setErro("Não foi possível carregar os grupos."))
      .finally(() => setCarregando(false));
  }, []);

  const alterar = (fn: (g: GrupoSimilares[]) => GrupoSimilares[]) => {
    setGrupos(fn);
    setMudou(true);
  };

  function novoGrupo() {
    alterar((g) => [{ id: `g${Date.now().toString(36)}`, nome: "", itens: [] }, ...g]);
  }

  function adicionar(id: string, p: ProdutoBusca) {
    const emOutro = grupos.find((g) => g.id !== id && g.itens.some((i) => i.cod === p.cod));
    if (emOutro) {
      setErro(`${p.cod} já está no grupo "${emOutro.nome || emOutro.itens[0]?.descricao || emOutro.id}".`);
      return;
    }
    setErro(null);
    alterar((gs) => gs.map((g) => (
      g.id === id && !g.itens.some((i) => i.cod === p.cod)
        ? { ...g, nome: g.nome || p.produto, itens: [...g.itens, { cod: p.cod, descricao: p.produto }] }
        : g
    )));
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await apiComprasSalvarSimilares(grupos.map((g) => ({ id: g.id, nome: g.nome, itens: g.itens.map((i) => i.cod) })));
      onFechar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar");
      setSalvando(false);
    }
  }

  const incompletos = grupos.filter((g) => g.itens.length === 1).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => onFechar(false)}>
      <div
        className="w-full max-w-3xl h-[80vh] max-h-[760px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="flex items-center gap-2 text-[13px] font-black uppercase tracking-tight">
              <Link2 className="w-4 h-4 text-blue-500" /> Itens similares
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Códigos do mesmo grupo somam vendas, estoque e compra pendente na reposição. O 1º código é o principal.
            </p>
          </div>
          <button onClick={() => onFechar(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </header>

        {erro && (
          <p className="mx-5 mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-bold text-rose-500">{erro}</p>
        )}

        <div className="flex-1 min-h-0 overflow-auto p-5 space-y-3">
          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[12px] font-bold text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
            </div>
          ) : (
            <>
              <button
                onClick={novoGrupo}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-500/50 px-3 py-2 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
              >
                <Plus className="w-3.5 h-3.5" /> Novo grupo
              </button>
              {!grupos.length && (
                <p className="py-6 text-center text-[11px] text-muted-foreground">
                  Nenhum grupo ainda. Crie um e adicione os códigos equivalentes.
                </p>
              )}
              {grupos.map((g) => (
                <section key={g.id} className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={g.nome}
                      onChange={(e) => alterar((gs) => gs.map((x) => (x.id === g.id ? { ...x, nome: e.target.value } : x)))}
                      placeholder="Nome do grupo (ex.: Caixa d'água 1000L)"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] font-bold outline-none focus:border-blue-500/60"
                    />
                    <button
                      onClick={() => alterar((gs) => gs.filter((x) => x.id !== g.id))}
                      title="Apagar o grupo"
                      className="rounded-lg border border-border p-2 text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {g.itens.map((i, idx) => (
                      <li key={i.cod} className="flex items-center gap-2 rounded-lg bg-secondary/30 px-3 py-1.5 text-[11px]">
                        <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400">{i.cod}</span>
                        <span className="flex-1 truncate">{i.descricao || "—"}</span>
                        {idx === 0 && (
                          <span className="rounded-md border border-blue-500/30 bg-blue-500/10 px-1.5 py-px text-[8px] font-black uppercase text-blue-600 dark:text-blue-400">
                            principal
                          </span>
                        )}
                        <button
                          onClick={() => alterar((gs) => gs.map((x) => (x.id === g.id ? { ...x, itens: x.itens.filter((y) => y.cod !== i.cod) } : x)))}
                          title="Tirar do grupo"
                          className="text-muted-foreground/60 hover:text-rose-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <BuscaItem aoEscolher={(p) => adicionar(g.id, p)} />
                </section>
              ))}
            </>
          )}
        </div>

        <footer className="shrink-0 flex items-center justify-between gap-3 px-5 py-3 border-t border-border">
          <span className="text-[10px] text-muted-foreground">
            {incompletos > 0 ? `${incompletos} grupo(s) com 1 item só não serão salvos.` : ""}
          </span>
          <button
            onClick={salvar}
            disabled={salvando || !mudou}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Salvar e recalcular
          </button>
        </footer>
      </div>
    </div>
  );
}

/** Busca no cadastro por código ou descrição para adicionar ao grupo. */
function BuscaItem({ aoEscolher }: { aoEscolher: (p: ProdutoBusca) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<ProdutoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    const termo = q.trim();
    if (termo.length < 2) return;
    let vivo = true;
    const t = setTimeout(() => {
      setBuscando(true);
      apiComprasBuscarProdutos(termo)
        .then((r) => vivo && setRes(r.data || []))
        .catch(() => vivo && setRes([]))
        .finally(() => vivo && setBuscando(false));
    }, 300);
    return () => { vivo = false; clearTimeout(t); };
  }, [q]);

  const lista = q.trim().length >= 2 ? res : [];

  return (
    <div className="relative">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Adicionar código ou descrição…"
        className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-[11px] outline-none focus:border-blue-500/60"
      />
      {buscando && <Loader2 className="w-3.5 h-3.5 absolute right-2.5 top-2 animate-spin text-muted-foreground" />}
      {/* Lista no fluxo (não flutuante): flutuando, a área com rolagem do modal cortava os resultados. */}
      {q.trim().length >= 2 && !buscando && !lista.length && (
        <p className="mt-1 px-3 py-1.5 text-[10px] text-muted-foreground">Nenhum item encontrado.</p>
      )}
      {lista.length > 0 && (
        <ul className="mt-1 w-full max-h-60 overflow-auto rounded-lg border border-border bg-card divide-y divide-border/50">
          {lista.slice(0, 15).map((p) => (
            <li key={p.cod}>
              <button
                onClick={() => { aoEscolher(p); setQ(""); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] hover:bg-secondary"
              >
                <Plus className="w-3 h-3 shrink-0 text-muted-foreground" />
                <span className="w-12 shrink-0 font-bold tabular-nums text-blue-600 dark:text-blue-400">{p.cod}</span>
                <span className="truncate">{p.produto}</span>
                {p.marca && <span className="ml-auto shrink-0 text-[9px] font-bold uppercase text-muted-foreground">{p.marca}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
