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
const HORAS = [60,40,30,60,40,30,100,20,20,60,120,40,50,60,60,50,30,40,120,120,140,50,80,50,30,40,60,50,30,30,40,40,30,80,30,80,40,30,100,50,80,30,60,80,50,20,40,30,20,30,60,50,40,60,30,40,20,20,30,20,20,20,30,40,40,60,80,100,30,40,80];

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

/**
 * Que "seção" do HUB (o que fica gravado em hub_acessos quando alguém abre a
 * tela) corresponde a cada ferramenta. Ferramenta fora daqui não tem medição
 * de cliques: app do Coletor, páginas externas, servidores e janelas que não
 * trocam de tela (Chat, Organograma).
 */
const SECOES: Record<string, string[]> = {
  // Coletor (app): gravado pelo próprio app (origem 'coletor').
  [slug("Coletor (app)-Separação")]: ["Coletor › Separação"],
  [slug("Coletor (app)-Conferência de entrada")]: ["Coletor › Conferência de entrada"],
  [slug("Coletor (app)-Conferência de saída")]: ["Coletor › Conferência de saída"],
  [slug("Coletor (app)-Inventário")]: ["Coletor › Inventário"],
  [slug("Coletor (app)-Consulta de estoque")]: ["Coletor › Consulta de estoque"],
  [slug("Coletor (app)-Armazenamento")]: ["Coletor › Armazenamento"],
  [slug("Coletor (app)-Localização")]: ["Coletor › Localização"],
  [slug("Coletor (app)-Cadastro de código de barras")]: ["Coletor › Cadastro de código de barras"],
  [slug("Coletor (app)-Impressão de etiqueta")]: ["Coletor › Impressão de etiqueta"],
  [slug("Coletor (app)-Faturamento")]: ["Coletor › Faturamento"],
  [slug("Coletor (app)-Ranking")]: ["Coletor › Ranking"],
  [slug("Coletor (app)-Comunicados e mensagens")]: ["Coletor › Mensagens"],
  [slug("Coletor (app)-Painel administrativo")]: ["Coletor › Painel administrativo"],
  "hub-dashboard-geral": ["Geral"],
  "hub-dashboard-produtos": ["Produtos"],
  "hub-dashboard-ranking-do-dia-tv": ["Ranking"],
  "hub-essencial-esteira": ["Esteira", "Minha Esteira"],
  "hub-essencial-agenda": ["Agenda"],
  "hub-essencial-ferias": ["Férias"],
  "hub-essencial-sugestoes": ["Sugestões"],
  "hub-comercial-minha-carteira": ["Carteira"],
  "hub-comercial-orcamentos": ["Orçamentos"],
  "hub-comercial-meus-pedidos": ["Meus Pedidos"],
  "hub-comercial-prospeccoes": ["Prospecções"],
  "hub-comercial-campanhas": ["Campanhas"],
  "hub-comercial-alugueis": ["Alugueis"],
  "hub-comercial-pos-venda": ["Pós-Venda"],
  "hub-comercial-pesquisa-do-cliente": ["Pesquisa Cliente"],
  "hub-comercial-relatorios-comerciais": ["Relatórios"],
  "hub-comercial-vendedor-no-celular-vendedor": ["Vendedor no celular"],
  "hub-marketing-whatsapp-api": ["Whatsapp API"],
  "hub-marketing-leads": ["Leads"],
  "hub-marketing-gestao-de-trafego": ["Gestao Trafego"],
  "hub-marketing-eventos": ["Eventos Marketing"],
  "hub-marketing-relatorios-de-marketing": ["Relatórios Mkt"],
  "hub-estoque-separacao": ["Separação"],
  "hub-estoque-conferencia": ["Conferência"],
  "hub-estoque-retirada": ["Retirada"],
  "hub-estoque-furos": ["Furos"],
  "hub-estoque-cabos": ["Cabos"],
  "hub-estoque-relatorios-de-estoque": ["Relatórios Estoque"],
  "hub-compras-produtos-a-comprar": ["Compras"],
  "hub-compras-relatorios-de-compras": ["Relatórios Compras"],
  "hub-entregas-romaneios": ["Romaneios"],
  "hub-entregas-coletas": ["Coletas"],
  "hub-entregas-ocorrencias": ["Ocorrências Entregas"],
  "hub-entregas-mapa-ao-vivo": ["Mapa Entregas"],
  "hub-entregas-relatorios-de-entregas": ["Relatórios Entregas"],
  "hub-rh-triagem-de-curriculos": ["Triagem"],
  "hub-gestao-painel-do-gestor-gestor": ["Painel do Gestor"],
  "hub-gestao-scrum-board": ["Scrum"],
  "hub-gestao-relatorios-scrum": ["Relatórios Scrum"],
  "hub-gestao-usuarios-e-permissoes": ["Usuários"],
  "hub-gestao-db-admin": ["DB Admin"],
};

type Periodo = "hoje" | "7d" | "30d";
const PERIODOS: { key: Periodo; label: string; dias: number }[] = [
  { key: "hoje", label: "Hoje", dias: 1 },
  { key: "7d", label: "7 dias", dias: 7 },
  { key: "30d", label: "30 dias", dias: 30 },
];

interface Acesso { secao: string; user_id: string | null; created_at: string }

const inicioDoDia = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

interface Avaliacao { impacto: number | null; uso: Uso | null; obs: string; removido: boolean }
const VAZIA: Avaliacao = { impacto: null, uso: null, obs: "", removido: false };

export function FerramentasView({ userId }: { userId?: string }) {
  const [estado, setEstado] = useState<Record<string, Avaliacao>>({});
  const [, setStatus] = useState("Conectando ao armazenamento…");
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; desfazer: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [acessos, setAcessos] = useState<Acesso[] | null>(null);
  const periodo = "7d" as Periodo;
  // Ferramenta que acabou de receber um clique pisca por 2 s.
  const [pulsando, setPulsando] = useState<Set<string>>(new Set());

  // Cliques em cada tela: 30 dias de histórico + cada novo acesso ao vivo.
  useEffect(() => {
    let vivo = true;
    const desde = inicioDoDia(new Date(Date.now() - 29 * 864e5)).toISOString();
    supabase
      .from("hub_acessos")
      .select("secao, user_id, created_at")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(50000)
      .then(({ data }) => vivo && setAcessos((data || []) as Acesso[]));
    const canal = supabase
      .channel("ferramentas-acessos")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "hub_acessos" }, (p) => {
        const a = p.new as Acesso;
        setAcessos((prev) => [a, ...(prev || [])]);
        const item = Object.entries(SECOES).find(([, secs]) => secs.includes(a.secao));
        if (item) {
          setPulsando((prev) => new Set(prev).add(item[0]));
          setTimeout(() => setPulsando((prev) => {
            const n = new Set(prev);
            n.delete(item[0]);
            return n;
          }), 2000);
        }
      })
      .subscribe();
    return () => {
      vivo = false;
      supabase.removeChannel(canal);
    };
  }, []);

  /** Por ferramenta: total no período, pessoas diferentes e série por dia. */
  const uso = useMemo(() => {
    const dias = PERIODOS.find((p) => p.key === periodo)!.dias;
    const hoje0 = inicioDoDia(new Date()).getTime();
    const inicio = hoje0 - (dias - 1) * 864e5;
    // Série: hoje = 24 barras por hora; 7 e 30 dias = 1 barra por dia.
    const nBarras = periodo === "hoje" ? 24 : dias;
    const porSecao = new Map<string, { total: number; pessoas: Set<string>; serie: number[] }>();
    for (const a of acessos || []) {
      const t = new Date(a.created_at).getTime();
      if (t < inicio) continue;
      const cur = porSecao.get(a.secao) ?? { total: 0, pessoas: new Set<string>(), serie: Array(nBarras).fill(0) };
      cur.total++;
      if (a.user_id) cur.pessoas.add(a.user_id);
      const idx = periodo === "hoje" ? new Date(t).getHours() : Math.floor((t - inicio) / 864e5);
      if (idx >= 0 && idx < nBarras) cur.serie[idx]++;
      porSecao.set(a.secao, cur);
    }
    const porItem = new Map<string, { total: number; pessoas: number; serie: number[] }>();
    for (const [id, secs] of Object.entries(SECOES)) {
      const serie = Array(nBarras).fill(0);
      const pessoas = new Set<string>();
      let total = 0;
      for (const sec of secs) {
        const c = porSecao.get(sec);
        if (!c) continue;
        total += c.total;
        c.pessoas.forEach((p) => pessoas.add(p));
        c.serie.forEach((v, k) => (serie[k] += v));
      }
      porItem.set(id, { total, pessoas: pessoas.size, serie });
    }
    // Faixa de uso pela própria distribuição: zero = sem acesso; abaixo da
    // mediana das que têm uso = pouco; acima = usam.
    const positivos = [...porItem.values()].map((v) => v.total).filter((v) => v > 0).sort((a, b) => a - b);
    const mediana = positivos.length ? positivos[Math.floor(positivos.length / 2)] : 0;
    const nivel = (id: string): Uso | null => {
      const v = porItem.get(id);
      if (!v) return null; // sem medição
      if (v.total === 0) return "nao";
      return v.total >= mediana ? "sim" : "pouco";
    };
    return { porItem, nivel };
  }, [acessos, periodo]);

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

  const visivel = (i: Item) => !av(i.id).removido;

  return (
    <div className="ferr">
      <div className="wrap">
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
                    const nivel = uso.nivel(i.id);
                    const u = uso.porItem.get(i.id);
                    return (
                      <div
                        key={i.id}
                        className={["row", aberta && "open", s.removido && "removed", nivel && `u-${nivel}-card`, pulsando.has(i.id) && "pulse"].filter(Boolean).join(" ")}
                      >
                        <div className="name">
                          <b>{i.n}</b>
                          <span>{i.d}</span>
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
                            <span className="lbl">Acessos · {PERIODOS.find((p) => p.key === periodo)!.label.toLowerCase()}</span>
                            {!u ? (
                              <p className="sem-medicao">Sem medição de cliques (fora do HUB)</p>
                            ) : acessos === null ? (
                              <p className="sem-medicao">Carregando…</p>
                            ) : (
                              <div className="uso">
                                <div className="uso-num">
                                  <strong className={nivel ? `t-${nivel}` : undefined}>{u.total.toLocaleString("pt-BR")}</strong>
                                  <small>
                                    {u.total === 1 ? "acesso" : "acessos"} · {u.pessoas} {u.pessoas === 1 ? "pessoa" : "pessoas"}
                                  </small>
                                </div>
                                <div className="barras" aria-label={`Acessos por ${periodo === "hoje" ? "hora" : "dia"}`}>
                                  {(() => {
                                    const max = Math.max(1, ...u.serie);
                                    return u.serie.map((v, k) => (
                                      <span
                                        key={k}
                                        title={`${periodo === "hoje" ? `${k}h` : `dia ${k + 1}`}: ${v}`}
                                        className={nivel ? `b-${nivel}` : undefined}
                                        style={{ height: `${v ? Math.max(8, (v / max) * 100) : 4}%`, opacity: v ? 1 : 0.35 }}
                                      />
                                    ));
                                  })()}
                                </div>
                              </div>
                            )}
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
