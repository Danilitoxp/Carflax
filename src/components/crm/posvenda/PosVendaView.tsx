import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, Filter,
  Loader2, MoreHorizontal, Pencil, Phone, Search, Settings, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  atualizarContato, carregarConfig, carregarFila, carregarPeriodo,
  carregarTratativas, carregarOportunidades, carregarUsuarios, sincronizarDia,
  diaJaMontado, CONTATOS_POR_DIA, DIAS_APOS_VENDA,
} from "./posvenda-service";
import { RegistroLigacaoModal } from "./RegistroLigacaoModal";
import { ConfigModal } from "./ConfigModal";
import {
  CONFIG_PADRAO, isGestorGeral, isSomenteVendedor,
  type HubUser, type PosVendaConfig, type PosVendaContato, type PosVendaUserProfile,
} from "./types";

/**
 * Pós-venda: cartões de situação, uma tabela e o registro da ligação.
 *
 * Os cartões do topo e as abas apontam para o mesmo filtro de propósito — o
 * cartão dá o número de relance, a aba troca a lista. Antes isso eram cinco
 * telas separadas para um fluxo que é um só.
 */

type Filtro = "ligar" | "pendencias" | "oportunidades" | "feitas";
type Ordem = "data_desc" | "data_asc" | "valor_desc" | "valor_asc";
type Refino = "todos" | "prioridade" | "sem_telefone";

const POR_PAGINA = 10;

const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const somarDias = (iso: string, n: number) => {
  const [a, m, d] = iso.split("-").map(Number);
  return isoLocal(new Date(a, m - 1, d + n));
};
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dataBR = (iso: string) => iso.split("-").reverse().join("/");

/** (11) 99574-5396 — o ERP devolve só dígitos. */
const formatarTelefone = (t?: string | null) => {
  const d = String(t || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || "";
};

const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();

// Cor estável por cliente: a mesma inicial sempre com a mesma cor ajuda a
// reconhecer a linha ao voltar para a lista.
const CORES = [
  "bg-blue-500/20 text-blue-400", "bg-violet-500/20 text-violet-400",
  "bg-emerald-500/20 text-emerald-400", "bg-amber-500/20 text-amber-400",
  "bg-rose-500/20 text-rose-400", "bg-cyan-500/20 text-cyan-400",
];
const corDoNome = (nome: string) =>
  CORES[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length];

export const POS_VENDA_DESTINO_KEY = "carflax_pos_venda_destino";

interface PosVendaViewProps {
  userProfile?: PosVendaUserProfile | null;
}

export function PosVendaView({ userProfile }: PosVendaViewProps) {
  const [config, setConfig] = useState<PosVendaConfig>(CONFIG_PADRAO);
  const [usuarios, setUsuarios] = useState<HubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [configAberta, setConfigAberta] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("ligar");
  const [refino, setRefino] = useState<Refino>("todos");
  const [refinoAberto, setRefinoAberto] = useState(false);
  const [ordem, setOrdem] = useState<Ordem>("data_desc");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [emLigacao, setEmLigacao] = useState<PosVendaContato | null>(null);
  const [montando, setMontando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  const [fila, setFila] = useState<PosVendaContato[]>([]);
  const [tratativas, setTratativas] = useState<PosVendaContato[]>([]);
  const [oportunidades, setOportunidades] = useState<PosVendaContato[]>([]);
  const [feitas, setFeitas] = useState<PosVendaContato[]>([]);

  const somenteVendedor = !loading && isSomenteVendedor(userProfile, config);
  const podeConfigurar = isGestorGeral(userProfile) || !!userProfile?.is_leader;

  const carregar = useCallback(async () => {
    const hoje = isoLocal(new Date());
    const [f, trat, op, periodo] = await Promise.all([
      carregarFila(),
      carregarTratativas(),
      carregarOportunidades(somenteVendedor ? userProfile?.id : undefined),
      carregarPeriodo(somarDias(hoje, -30), hoje),
    ]);
    setFila(f);
    setTratativas(trat.filter((c) => c.tratativa_status === "aberta"));
    setOportunidades(op.filter((c) => !c.vendedor_retorno_em));
    setFeitas(periodo.filter((c) => ["contatado", "nao_contatado"].includes(c.status)));
  }, [somenteVendedor, userProfile?.id]);

  useEffect(() => {
    Promise.all([carregarConfig(), carregarUsuarios()])
      .then(([c, u]) => { setConfig(c); setUsuarios(u); })
      .catch((err) => console.error("[PosVenda] carregar:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (loading) return;
    carregar().catch((err) => console.error("[PosVenda] listas:", err));
  }, [loading, carregar]);

  /** Monta a lista do dia sozinha; só chama o ERP se o dia ainda não existe. */
  const montarListaDoDia = useCallback(async () => {
    const dia = somarDias(isoLocal(new Date()), -DIAS_APOS_VENDA);
    try {
      if (await diaJaMontado(dia)) return;
      setMontando(true);
      const r = await sincronizarDia(dia, config, usuarios);
      if (r.novos) {
        setAviso(`${r.novos} cliente(s) das vendas de ${dataBR(dia)}.`
          + (r.limitados ? ` Outros ${r.limitados} ficaram de fora pelo limite de ${CONTATOS_POR_DIA} por dia.` : ""));
      }
      await carregar();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "Falha ao montar a lista do dia");
    } finally {
      setMontando(false);
    }
  }, [config, usuarios, carregar]);

  useEffect(() => {
    if (loading || somenteVendedor) return;
    montarListaDoDia();
  }, [loading, somenteVendedor, montarListaDoDia]);

  useEffect(() => { if (somenteVendedor) setFiltro("oportunidades"); }, [somenteVendedor]);
  useEffect(() => { setPagina(1); }, [filtro, busca, refino]);

  const tirarDaLista = async (c: PosVendaContato) => {
    setMenuAberto(null);
    if (!confirm(`Tirar ${c.cliente_nome} da lista?`)) return;
    await atualizarContato(c.id, { status: "excluido" });
    await carregar();
  };

  const atualizarTelefone = async (c: PosVendaContato) => {
    setMenuAberto(null);
    const novo = prompt(`Telefone de ${c.cliente_nome}:`, c.celular || c.telefone || "");
    if (!novo?.trim()) return;
    await atualizarContato(c.id, { celular: novo.replace(/\D/g, "") });
    await carregar();
  };

  const listaAtiva = filtro === "ligar" ? fila
    : filtro === "pendencias" ? tratativas
    : filtro === "oportunidades" ? oportunidades
    : feitas;

  const filtrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return listaAtiva
      .filter((c) => !q || c.cliente_nome.toLowerCase().includes(q) || c.cod_cliente.includes(q))
      .filter((c) => refino === "todos"
        || (refino === "prioridade" && c.prioridade === 1)
        || (refino === "sem_telefone" && !c.celular && !c.telefone))
      .sort((a, b) => {
        if (ordem === "valor_desc") return b.valor_total - a.valor_total;
        if (ordem === "valor_asc") return a.valor_total - b.valor_total;
        const d = a.data_venda.localeCompare(b.data_venda);
        return ordem === "data_asc" ? d : -d;
      });
  }, [listaAtiva, busca, refino, ordem]);

  const paginas = Math.max(1, Math.ceil(filtrada.length / POR_PAGINA));
  const visiveis = filtrada.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const ABAS: { id: Filtro; label: string; icone: typeof Phone; total: number }[] = [
    { id: "ligar", label: "A ligar", icone: Phone, total: fila.length },
    { id: "pendencias", label: "Pendências", icone: AlertTriangle, total: tratativas.length },
    { id: "oportunidades", label: "Oportunidades", icone: Calendar, total: oportunidades.length },
    { id: "feitas", label: "Feitas (30d)", icone: Check, total: feitas.length },
  ];
  const abas = somenteVendedor ? ABAS.filter((a) => a.id === "oportunidades") : ABAS;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full bg-background text-foreground overflow-hidden">
      <div className="px-6 pt-6 pb-4 shrink-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Pós-venda</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acompanhe a experiência dos clientes após a compra.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="text-right text-[11px] text-muted-foreground mt-1 hidden sm:block">
              {montando ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Montando a lista…
                </span>
              ) : (
                <>
                  Até {CONTATOS_POR_DIA} clientes por dia
                  <span className="opacity-40"> • </span>
                  Vendas de {DIAS_APOS_VENDA} dias atrás
                </>
              )}
            </div>
            {podeConfigurar && (
              <button
                onClick={() => setConfigAberta(true)}
                title="Configurações"
                className="p-2 rounded-xl border border-border bg-card hover:bg-secondary"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setFiltro(a.id)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors",
                filtro === a.id ? "border-primary/60 bg-primary/10" : "border-border bg-card hover:border-primary/30",
              )}
            >
              <a.icone className={cn("w-5 h-5 shrink-0", filtro === a.id ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-bold flex-1">{a.label}</span>
              <span className={cn("text-2xl font-black tabular-nums", filtro === a.id ? "text-primary" : "text-foreground")}>
                {a.total}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 pb-6">
        <div className="h-full flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-4 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-1 overflow-x-auto">
              {abas.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setFiltro(a.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-colors",
                    filtro === a.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <a.icone className="w-3.5 h-3.5" /> {a.label} ({a.total})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto py-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Cliente ou código..."
                  className="w-56 rounded-xl border border-border bg-background pl-8 pr-3 py-2 text-xs outline-none focus:border-primary/60"
                />
              </div>
              <div className="relative">
                <button
                  onClick={() => setRefinoAberto((v) => !v)}
                  className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold hover:border-primary/40"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {refino === "todos" ? "Filtrar" : refino === "prioridade" ? "Prioridade" : "Sem telefone"}
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {refinoAberto && (
                  <div className="absolute right-0 mt-1 z-30 w-44 rounded-xl border border-border bg-card shadow-xl py-1">
                    {([["todos", "Todos"], ["prioridade", "Só prioridade"], ["sem_telefone", "Sem telefone"]] as const).map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => { setRefino(id); setRefinoAberto(false); }}
                        className={cn(
                          "block w-full text-left px-3 py-1.5 text-xs hover:bg-secondary",
                          refino === id && "text-primary font-bold",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-auto">
            {aviso && (
              <p className="flex items-center gap-2 m-4 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold">
                {aviso}
                <button onClick={() => setAviso(null)} className="ml-auto opacity-60 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </p>
            )}

            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="text-[11px] text-muted-foreground border-b border-border/60">
                  <th className="text-left font-semibold px-4 py-3">Cliente</th>
                  <th className="text-left font-semibold px-3 py-3">
                    <button
                      onClick={() => setOrdem((o) =>
                        o === "data_desc" ? "data_asc" : o === "data_asc" ? "valor_desc" : o === "valor_desc" ? "valor_asc" : "data_desc")}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      title="Alterna entre data e valor, crescente e decrescente"
                    >
                      Compra <ChevronDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="text-left font-semibold px-3 py-3">Vendedor</th>
                  <th className="text-left font-semibold px-3 py-3">Telefone</th>
                  <th className="text-left font-semibold px-3 py-3">Prioridade</th>
                  <th className="text-left font-semibold px-3 py-3">Ação</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((c) => {
                  const telefone = c.celular || c.telefone;
                  const vendedor = usuarios.find((u) => u.id === c.vendedor_user_id)?.name || c.nome_vendedor || "";
                  return (
                    <tr key={c.id} className="border-b border-border/40 hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black shrink-0",
                            corDoNome(c.cliente_nome),
                          )}>
                            {iniciais(c.cliente_nome)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate max-w-[22rem]">{c.cliente_nome}</div>
                            <div className="text-[11px] text-muted-foreground">{c.cod_cliente}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-muted-foreground">{dataBR(c.data_venda)}</span>
                        <span className="ml-4 font-bold">{brl(c.valor_total)}</span>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{vendedor.split(" ")[0] || "—"}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {telefone ? formatarTelefone(telefone) : (
                          <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Sem telefone
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.prioridade === 1 && (
                          <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-rose-500/15 text-rose-400">
                            Prioridade
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {telefone ? (
                            <button
                              onClick={() => setEmLigacao(c)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap"
                            >
                              <Phone className="w-3.5 h-3.5" /> Registrar ligação
                            </button>
                          ) : (
                            <button
                              onClick={() => atualizarTelefone(c)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-primary/50 text-primary text-xs font-bold whitespace-nowrap hover:bg-primary/10"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Atualizar contato
                            </button>
                          )}
                          <div className="relative">
                            <button
                              onClick={() => setMenuAberto((m) => (m === c.id ? null : c.id))}
                              className="p-2 rounded-lg border border-border hover:bg-secondary"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                            {menuAberto === c.id && (
                              <div className="absolute right-0 mt-1 z-30 w-44 rounded-xl border border-border bg-card shadow-xl py-1">
                                <button
                                  onClick={() => { setMenuAberto(null); setEmLigacao(c); }}
                                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-secondary"
                                >
                                  Abrir registro
                                </button>
                                <button
                                  onClick={() => atualizarTelefone(c)}
                                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-secondary"
                                >
                                  Atualizar telefone
                                </button>
                                <button
                                  onClick={() => tirarDaLista(c)}
                                  className="block w-full text-left px-3 py-1.5 text-xs text-rose-500 hover:bg-secondary"
                                >
                                  Tirar da lista
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {visiveis.length === 0 && (
              <p className="py-16 text-center text-xs text-muted-foreground">
                {filtro === "ligar" && `Ninguém na fila hoje. A lista é montada sozinha com as vendas de ${DIAS_APOS_VENDA} dias atrás.`}
                {filtro === "pendencias" && "Nenhuma pendência aberta."}
                {filtro === "oportunidades" && "Nenhuma oportunidade registrada."}
                {filtro === "feitas" && "Nenhuma ligação registrada nos últimos 30 dias."}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border/60 shrink-0">
            <span className="text-[11px] text-muted-foreground">
              Exibindo {visiveis.length} de {filtrada.length} cliente{filtrada.length === 1 ? "" : "s"}
            </span>
            {paginas > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-secondary"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPagina(n)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold",
                      n === pagina ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary",
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPagina((p) => Math.min(paginas, p + 1))}
                  disabled={pagina === paginas}
                  className="p-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-secondary"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {emLigacao && (
        <RegistroLigacaoModal
          contato={emLigacao}
          config={config}
          usuarios={usuarios}
          userProfile={userProfile}
          onClose={() => setEmLigacao(null)}
          onSaved={() => { setEmLigacao(null); carregar(); }}
        />
      )}

      {configAberta && (
        <ConfigModal
          config={config}
          usuarios={usuarios}
          userId={userProfile?.id}
          onClose={() => setConfigAberta(false)}
          onSaved={(c) => { setConfig(c); setConfigAberta(false); }}
        />
      )}
    </div>
  );
}
