import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import "./ferramentas.css";

/**
 * Ferramentas — inventário de todas as telas e ferramentas internas da Carflax.
 *
 * Para cada uma: impacto (0 a 10), se a equipe está usando e uma observação.
 * Telas que não fazem mais sentido podem ser removidas (e restauradas).
 * Salva na hora em `hub_ferramentas_avaliacao` e aparece em tempo real para
 * quem estiver com a tela aberta.
 *
 * Mesmo desenho e mesma lista da página externa que existia antes
 * (claude.ai/artifact/L7iKSt4bNQR9zoN3u72vxc); as marcações de lá foram
 * trazidas pela migração.
 */

/* Horas estimadas para uma software house construir cada tela (mesma ordem de ITENS) × valor-hora médio 2026 */
const VALOR_HORA = 120;
const HORAS = [60,40,30,60,40,30,100,20,20,60,120,40,50,60,60,50,30,40,120,120,140,50,80,50,30,40,60,50,30,30,40,40,30,80,30,80,40,30,100,50,80,30,60,80,50,20,40,30,20,30,60,50,40,60,30,40,20,20,30,20,20,20,30,40,40,60,80,100,30,40,80];

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Item { g: string; n: string; d: string; h: number; id: string }

const ITENS: Item[] = ([
  ["HUB · Dashboard", "Geral", "Faturamento e margem do mês"],
  ["HUB · Dashboard", "Produtos", "Vendas por produto"],
  ["HUB · Dashboard", "Ranking do dia (TV)", "Placar de vendas no telão"],
  ["HUB · Essencial", "Esteira", "Tarefas de cada pessoa com aviso"],
  ["HUB · Essencial", "Agenda", "Reuniões, aniversários, feriados"],
  ["HUB · Essencial", "Férias", "Controle de férias"],
  ["HUB · Essencial", "Chat Center", "Conversas internas"],
  ["HUB · Essencial", "Organograma", "Estrutura da empresa"],
  ["HUB · Essencial", "Sugestões", "Ideias da equipe"],
  ["HUB · Comercial", "Minha Carteira", "Clientes de cada vendedor"],
  ["HUB · Comercial", "Orçamentos", "Orçamentos ligados ao ERP"],
  ["HUB · Comercial", "Meus Pedidos", "Pedidos do vendedor"],
  ["HUB · Comercial", "Prospecções", "Clientes em prospecção"],
  ["HUB · Comercial", "Campanhas", "Campanhas de venda com prêmio"],
  ["HUB · Comercial", "Aluguéis", "Controle de aluguéis"],
  ["HUB · Comercial", "Pós-Venda", "Contato preventivo após a compra"],
  ["HUB · Comercial", "Pesquisa do Cliente", "Pesquisa de satisfação"],
  ["HUB · Comercial", "Relatórios Comerciais", "Relatórios de vendas"],
  ["HUB · Comercial", "Vendedor no celular (/vendedor)", "Orçamento e pedido pelo celular"],
  ["HUB · Marketing", "WhatsApp API", "WhatsApp oficial da empresa"],
  ["HUB · Marketing", "Carlinhos (atendente virtual)", "IA que atende lead novo"],
  ["HUB · Marketing", "Leads", "Leads de marketing"],
  ["HUB · Marketing", "Gestão de Tráfego", "Google e Meta Ads com teto mensal"],
  ["HUB · Marketing", "Eventos", "Fornecedores, convidados e verba"],
  ["HUB · Marketing", "Avaliações", "Avaliações de clientes"],
  ["HUB · Marketing", "Relatórios de Marketing", "Resultados de marketing"],
  ["HUB · Estoque", "Separação", "Separação de pedidos"],
  ["HUB · Estoque", "Conferência", "Conferência de pedidos"],
  ["HUB · Estoque", "Retirada", "Retirada no balcão"],
  ["HUB · Estoque", "Furos", "Furos de estoque"],
  ["HUB · Estoque", "Cabos", "Cortes na sala de cabos"],
  ["HUB · Estoque", "Etiqueta de preço", "Impressão direto na impressora"],
  ["HUB · Estoque", "Relatórios de Estoque", "Relatórios de estoque"],
  ["HUB · Compras", "Produtos a comprar", "Estoque, lead time e pedidos abertos"],
  ["HUB · Compras", "Relatórios de Compras", "Relatórios de compras"],
  ["HUB · Entregas", "Romaneios", "Montagem dos romaneios"],
  ["HUB · Entregas", "Coletas", "Coleta em fornecedor"],
  ["HUB · Entregas", "Ocorrências", "Problemas na entrega"],
  ["HUB · Entregas", "Mapa ao Vivo", "Frota em tempo real"],
  ["HUB · Entregas", "Frota & Custos", "Km rodado e custo por veículo"],
  ["HUB · Entregas", "Tela do Motorista", "Rota e baixa da entrega"],
  ["HUB · Entregas", "Relatórios de Entregas", "Relatórios de logística"],
  ["HUB · RH", "Triagem de currículos", "Nota por distância e perfil"],
  ["HUB · Gestão", "Painel do Gestor (/gestor)", "Resumo da diretoria e liberação de pedidos"],
  ["HUB · Gestão", "Scrum Board", "Board dos líderes"],
  ["HUB · Gestão", "Relatórios Scrum", "Relatórios do board"],
  ["HUB · Gestão", "Usuários e permissões", "Cadastro de acessos"],
  ["HUB · Gestão", "DB Admin", "Consultas ao banco"],
  ["HUB · Páginas externas", "Avaliar atendimento", "Cliente avalia pelo link"],
  ["HUB · Páginas externas", "Convites de eventos", "Clientes e fornecedores"],
  ["Coletor (app)", "Separação", "Separar pelo celular"],
  ["Coletor (app)", "Conferência de entrada", "Conferir mercadoria recebida"],
  ["Coletor (app)", "Conferência de saída", "Conferir pedido antes de sair"],
  ["Coletor (app)", "Inventário", "Contagem de estoque"],
  ["Coletor (app)", "Consulta de estoque", "Saldo e dados do produto"],
  ["Coletor (app)", "Armazenamento", "Guardar produto no endereço"],
  ["Coletor (app)", "Localização", "Onde está o produto"],
  ["Coletor (app)", "Cadastro de código de barras", "Vincular código ao produto"],
  ["Coletor (app)", "Impressão de etiqueta", "Etiqueta pelo celular"],
  ["Coletor (app)", "Furos", "Registrar furo de estoque"],
  ["Coletor (app)", "Faturamento", "Acompanhar faturamento"],
  ["Coletor (app)", "Ranking", "Ranking da equipe"],
  ["Coletor (app)", "Comunicados e mensagens", "Avisos para a equipe"],
  ["Coletor (app)", "Painel administrativo", "Gestão do app"],
  ["Outras ferramentas", "Servidor de Etiquetas", "Impressão local de etiquetas"],
  ["Outras ferramentas", "Automação XML", "Baixa XML de NF-e de fornecedores"],
  ["Outras ferramentas", "E-commerce: preço e estoque", "Citel → Shopify a cada 10 min"],
  ["Outras ferramentas", "E-commerce: pedidos", "Pedido da loja vira pedido no ERP"],
  ["Outras ferramentas", "Painel de Pedidos", "Status dos pedidos em tela"],
  ["Outras ferramentas", "Carflax Display", "Telão da loja"],
  ["Outras ferramentas", "Carflax Treinamento", "Trilhas de treinamento"],
] as const).map(([g, n, d], k) => ({ g, n, d, h: HORAS[k], id: slug(`${g}-${n}`) }));

const GRUPOS = [...new Set(ITENS.map((i) => i.g))];

type Uso = "sim" | "pouco" | "nao";
const USO: [Uso, string][] = [["sim", "Usam"], ["pouco", "Pouco"], ["nao", "Não usam"]];

interface Avaliacao { impacto: number | null; uso: Uso | null; obs: string; removido: boolean }
const VAZIA: Avaliacao = { impacto: null, uso: null, obs: "", removido: false };

export function FerramentasView({ userId }: { userId?: string }) {
  const [estado, setEstado] = useState<Record<string, Avaliacao>>({});
  const [status, setStatus] = useState("Conectando ao armazenamento…");
  const [filtro, setFiltro] = useState("Todos");
  const [mostrarValor, setMostrarValor] = useState(false);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; desfazer: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aplicarLinhas = useCallback((linhas: Array<Record<string, unknown>>) => {
    setEstado((prev) => {
      const novo = { ...prev };
      for (const v of linhas) {
        novo[String(v.id)] = {
          impacto: v.impacto == null ? null : Number(v.impacto),
          uso: (v.uso as Uso) ?? null,
          obs: String(v.obs ?? ""),
          removido: !!v.removido,
        };
      }
      return novo;
    });
  }, []);

  useEffect(() => {
    let vivo = true;
    supabase
      .from("hub_ferramentas_avaliacao")
      .select("id, impacto, uso, obs, removido")
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) {
          setStatus("Não foi possível carregar as marcações salvas. Recarregue a página.");
          return;
        }
        aplicarLinhas(data || []);
        setStatus("Conectado. As marcações são salvas automaticamente.");
      });
    const canal = supabase
      .channel("hub-ferramentas-avaliacao")
      .on("postgres_changes", { event: "*", schema: "public", table: "hub_ferramentas_avaliacao" }, (p) => {
        if (p.new && (p.new as Record<string, unknown>).id) aplicarLinhas([p.new as Record<string, unknown>]);
      })
      .subscribe();
    return () => {
      vivo = false;
      supabase.removeChannel(canal);
    };
  }, [aplicarLinhas]);

  const av = (id: string) => estado[id] ?? VAZIA;
  const removida = (i: Item) => av(i.id).removido;

  const salvar = useCallback(
    async (id: string, mudanca: Partial<Avaliacao>) => {
      const atual = { ...(estado[id] ?? VAZIA), ...mudanca };
      setEstado((prev) => ({ ...prev, [id]: atual }));
      const { error } = await supabase.from("hub_ferramentas_avaliacao").upsert({
        id,
        impacto: atual.impacto,
        uso: atual.uso,
        obs: atual.obs,
        removido: atual.removido,
        atualizado: new Date().toISOString(),
        atualizado_por: userId ?? null,
      });
      setStatus(error ? "Não foi possível salvar. Verifique sua conexão e tente de novo." : "Salvo.");
    },
    [estado, userId],
  );

  const mostrarToast = (msg: string, desfazer: () => void) => {
    setToast({ msg, desfazer });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };

  const ativos = ITENS.filter((i) => !removida(i));
  const gruposComItens = GRUPOS.filter((g) => ITENS.some((i) => i.g === g && !removida(i)));
  const filtroAtual = GRUPOS.includes(filtro) && !gruposComItens.includes(filtro) ? "Todos" : filtro;

  const visivel = (i: Item) => {
    const s = av(i.id);
    if (s.removido) return false;
    if (filtroAtual === "Todos") return true;
    if (filtroAtual === "Não usam") return s.uso === "nao";
    if (filtroAtual === "Sem nota") return s.impacto == null;
    return i.g === filtroAtual;
  };

  const resumo = useMemo(() => {
    const c = { sim: 0, pouco: 0, nao: 0, none: 0 };
    const notas: number[] = [];
    for (const i of ativos) {
      const s = estado[i.id] ?? VAZIA;
      c[s.uso ?? "none"]++;
      if (s.impacto != null) notas.push(s.impacto);
    }
    const media = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1).replace(".", ",") : "—";
    const horas = ativos.reduce((a, i) => a + i.h, 0);
    return { c, notas: notas.length, media, horas };
  }, [ativos, estado]);

  return (
    <div className="ferr">
      <div className="wrap">
        <header>
          <h1>Inventário de Ferramentas Carflax</h1>
          <p className="sub">
            Todas as ferramentas e telas criadas internamente. Para cada uma, marque o impacto (0 a 10) e se as pessoas estão usando. Telas que não
            fazem mais sentido podem ser removidas da lista. Tudo é salvo na hora e fica visível para quem abrir esta página.
          </p>
          <button className="btn-valor" aria-expanded={mostrarValor} onClick={() => setMostrarValor((v) => !v)}>
            {mostrarValor ? "Ocultar valor economizado" : "Mostrar valor economizado pela Carflax"}
          </button>
          {mostrarValor && (
            <div className="valor">
              <span className="lbl">Valor economizado pela Carflax (2026)</span>
              <strong>{brl(resumo.horas * VALOR_HORA)}</strong>
              <small>
                {ativos.length} telas · {resumo.horas.toLocaleString("pt-BR")} horas × {brl(VALOR_HORA)}/h que a Carflax deixou de pagar a uma empresa
                de fora por ter desenvolvido internamente
              </small>
            </div>
          )}
          <p className="status">{status}</p>
        </header>

        <div className="summary">
          <span className="chip c-ok">{resumo.c.sim} usam</span>
          <span className="chip c-warn">{resumo.c.pouco} pouco uso</span>
          <span className="chip c-bad">{resumo.c.nao} não usam</span>
          <span className="chip c-unk">{resumo.c.none} sem avaliação</span>
          <span className="chip c-unk">
            Impacto médio {resumo.media} · {resumo.notas}/{ativos.length} com nota
          </span>
        </div>

        <div className="filters" role="group" aria-label="Filtrar">
          {["Todos", "Não usam", "Sem nota", ...gruposComItens].map((k) => (
            <button key={k} aria-pressed={k === filtroAtual} onClick={() => setFiltro(k)}>
              {k}
            </button>
          ))}
        </div>

        <div className="list">
          {GRUPOS.map((g) => {
            const itens = ITENS.filter((i) => i.g === g && visivel(i));
            if (!itens.length) return null;
            return (
              <section key={g} className="grp">
                <h2>
                  <span>{g}</span>
                  <small>
                    {itens.length} {itens.length > 1 ? "telas" : "tela"}
                  </small>
                </h2>
                <div className="cards">
                  {itens.map((i) => {
                    const s = av(i.id);
                    const aberta = abertas.has(i.id) || !!s.obs;
                    return (
                      <div
                        key={i.id}
                        className={["row", aberta && "open", s.removido && "removed", s.uso && `u-${s.uso}-card`].filter(Boolean).join(" ")}
                      >
                        <div className="name">
                          <b>{i.n}</b>
                          <span>{i.d}</span>
                          {mostrarValor && (
                            <div className="preco">
                              <strong>{brl(i.h * VALOR_HORA)}</strong>
                              <small>economizados · {i.h} h</small>
                            </div>
                          )}
                        </div>

                        <div className="ctrls">
                          <div>
                            <label className="lbl" htmlFor={`imp-${i.id}`}>Impacto</label>
                            <select
                              id={`imp-${i.id}`}
                              value={s.impacto ?? ""}
                              onChange={(e) => salvar(i.id, { impacto: e.target.value === "" ? null : Number(e.target.value) })}
                            >
                              <option value="">—</option>
                              {Array.from({ length: 11 }, (_, n) => (
                                <option key={n} value={n}>{String(n).padStart(2, "0")}/10</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <span className="lbl">Estão usando?</span>
                            <div className="seg">
                              {USO.map(([v, t]) => (
                                <button
                                  key={v}
                                  className={`u-${v}`}
                                  aria-pressed={s.uso === v}
                                  onClick={() => salvar(i.id, { uso: s.uso === v ? null : v })}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {aberta && (
                          <div className="obs">
                            <input
                              autoFocus={abertas.has(i.id) && !s.obs}
                              defaultValue={s.obs}
                              placeholder="Observação (ex.: só o turno da manhã usa)"
                              aria-label={`Observação sobre ${i.n}`}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v !== s.obs) salvar(i.id, { obs: v });
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              }}
                            />
                          </div>
                        )}

                        <div className="actions">
                          <button
                            className="note-btn"
                            onClick={() =>
                              setAbertas((prev) => {
                                const n = new Set(prev);
                                if (n.has(i.id)) n.delete(i.id);
                                else n.add(i.id);
                                return n;
                              })
                            }
                          >
                            {s.obs ? "Editar observação" : "+ Observação"}
                          </button>
                          {s.removido ? (
                            <button
                              className="note-btn rs"
                              aria-label={`Restaurar ${i.n}`}
                              onClick={() => {
                                salvar(i.id, { removido: false });
                                mostrarToast(`“${i.n}” voltou para a lista.`, () => salvar(i.id, { removido: true }));
                              }}
                            >
                              Restaurar
                            </button>
                          ) : (
                            <button
                              className="note-btn rm"
                              aria-label={`Remover ${i.n} da lista`}
                              onClick={() => {
                                salvar(i.id, { removido: true });
                                mostrarToast(`“${i.n}” removida.`, () => salvar(i.id, { removido: false }));
                              }}
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {!ITENS.some(visivel) && <p className="status">Nenhuma tela neste filtro.</p>}
        </div>
      </div>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.msg}</span>
          <button
            onClick={() => {
              toast.desfazer();
              setToast(null);
            }}
          >
            Desfazer
          </button>
        </div>
      )}
    </div>
  );
}
