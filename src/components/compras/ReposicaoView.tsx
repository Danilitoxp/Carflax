// Compras › Reposição — o que comprar agora.
//
// Mostra a venda dos 3 últimos meses fechados por item; a média ignora o mês de
// venda esporádica (pico que foi para um ou dois clientes só). A base de estoque
// é de 3 meses. O saldo exibido é o DISPONÍVEL (físico − reservado em pedido de
// venda); o pedido de compra em aberto abate a sugestão. Quem calcula é o
// backend (reposicaoHandler.js) — aqui é só apresentação, filtro e paginação.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Search, Loader2, Truck, Download, ChevronLeft, ChevronRight, AlertCircle, PackageX, CalendarClock, Link2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { apiComprasReposicao, type ReposicaoItem, type ReposicaoResponse } from "@/lib/api";
import { anexarGuiaImportacao } from "@/lib/guia-importacao-produtos";
import { KardexMesModal } from "./KardexMesModal";
import { AgendaReposicaoModal } from "./AgendaReposicaoModal";
import { PropostasCompraPainel } from "./PropostasCompraPainel";
import { SimilaresModal } from "./SimilaresModal";

/** Mês aberto no modal de detalhe das vendas. */
interface MesAberto {
  item: string;
  descricao: string;
  unidade: string | null;
  mes: string;
}

const POR_PAGINA = [15, 25, 50, 100];
const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const brNum = (n: number, dec = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

/** "2026-07" → "Jul/26" */
function rotuloMes(mes: string) {
  const [ano, m] = mes.split("-");
  return `${MESES_CURTOS[Number(m) - 1]}/${ano.slice(2)}`;
}

export function ReposicaoView({ userProfile }: { userProfile?: { id?: string; name?: string; operator_code?: string } } = {}) {
  const [dados, setDados] = useState<ReposicaoResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [porPagina, setPorPagina] = useState(15);
  const [mesAberto, setMesAberto] = useState<MesAberto | null>(null);
  const [agendaAberta, setAgendaAberta] = useState(false);
  // "lista" = tabela de reposição · "propostas" = conferência dos pedidos montados
  const [aba, setAba] = useState<"lista" | "propostas">("lista");
  const [pendentes, setPendentes] = useState(0);

  // Propostas aguardando conferência, para o botão mostrar o contador.
  const contarPendentes = useCallback(() => {
    supabase
      .from("reposicao_propostas")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente")
      .then(({ count }) => setPendentes(count || 0));
  }, []);

  useEffect(() => {
    contarPendentes();
  }, [contarPendentes]);
  const [pagina, setPagina] = useState(1);
  const [similaresAberto, setSimilaresAberto] = useState(false);
  // Muda ao salvar os similares: recalcula a reposição com os grupos novos.
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    apiComprasReposicao()
      .then(setDados)
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar"))
      .finally(() => setCarregando(false));
  }, [versao]);

  const itens = useMemo(() => {
    const termo = semAcento(busca.trim());
    return (dados?.itens || []).filter((i) => {
      if (fornecedor && i.cod_fornecedor !== fornecedor) return false;
      if (!termo) return true;
      return semAcento(`${i.cod} ${i.descricao} ${i.fornecedor || ""}`).includes(termo);
    });
  }, [dados, busca, fornecedor]);

  // Mudou o filtro: volta para a primeira página, senão some a lista inteira.
  useEffect(() => setPagina(1), [busca, fornecedor, porPagina]);

  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = itens.slice((paginaAtual - 1) * porPagina, paginaAtual * porPagina);
  const rotulos = dados?.rotulos || [];

  async function exportar() {
    const XLSX = await import("xlsx-js-style");
    const linhas = itens.map((i) => ({
      Código: i.cod,
      Produto: i.descricao,
      Fornecedor: i.fornecedor || "",
      ...Object.fromEntries(i.venda_mensal.map((m) => [rotuloMes(m.mes), m.qtd])),
      "Média mensal": i.media_ajustada,
      "Média sem ajuste": i.media_bruta,
      Saldo: i.disponivel,
      "Compra pendente": i.em_pedido,
      "Lead time (dias)": i.lead_time_dias ?? "",
      Sugestão: i.sugestao_compra,
      Unidade: i.unidade || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), "Reposição");
    // Todo Excel de produtos leva o guia de importação junto (regra do Danilo).
    anexarGuiaImportacao(XLSX, wb);
    XLSX.writeFile(wb, `reposicao-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-background">
      {/* Título, filtros e exportação numa linha só. */}
      <div className="px-4 sm:px-6 py-4 shrink-0 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 mr-1">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none whitespace-nowrap">Reposição de estoque</h1>
            <p className="text-[11px] text-muted-foreground mt-1 whitespace-nowrap">
              Sugestões com base nas vendas dos últimos {dados?.meses_historico ?? 3} meses
            </p>
          </div>
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto ou código…"
            className="w-full pl-11 pr-4 py-2.5 text-[12px] bg-card border border-border rounded-xl outline-none focus:border-blue-500/60"
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl">
          <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
          <select
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            className="text-[12px] font-semibold bg-transparent outline-none cursor-pointer max-w-[210px]"
          >
            <option value="" className="bg-card text-foreground">Todos os fornecedores</option>
            {(dados?.fornecedores || []).map((f) => (
              <option key={f.cod} value={f.cod} className="bg-card text-foreground">
                {(f.nome || f.cod).slice(0, 40)} ({f.itens})
              </option>
            ))}
          </select>
        </div>

        {/* Propostas montadas pela agenda, esperando conferência. */}
        {pendentes > 0 && (
          <button
            onClick={() => setAba("propostas")}
            title="Propostas de compra para conferir"
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-colors",
              aba === "propostas"
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-card border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10",
            )}
          >
            <ClipboardList className="w-4 h-4" />
            {pendentes} {pendentes === 1 ? "proposta" : "propostas"}
          </button>
        )}

        {/* Itens similares: códigos equivalentes somados como um item só. */}
        <button
          onClick={() => setSimilaresAberto(true)}
          title="Itens similares (somar códigos equivalentes)"
          className="inline-flex items-center justify-center p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-blue-500 hover:border-blue-500/40 transition-colors"
        >
          <Link2 className="w-4 h-4" />
        </button>

        {/* Agenda de reposição: compra recorrente por curva de fornecedor. */}
        <button
          onClick={() => setAgendaAberta(true)}
          title="Agenda de reposição"
          className="inline-flex items-center justify-center p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-blue-500 hover:border-blue-500/40 transition-colors"
        >
          <CalendarClock className="w-4 h-4" />
        </button>

        <button
          onClick={exportar}
          disabled={!itens.length}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-[12px] font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Download className="w-4 h-4" /> Exportar Excel
        </button>
      </div>

      {agendaAberta && (
        <AgendaReposicaoModal
          usuario={{ id: userProfile?.id, nome: userProfile?.name }}
          onFechar={() => {
            setAgendaAberta(false);
            contarPendentes();
          }}
        />
      )}

      {similaresAberto && (
        <SimilaresModal
          onFechar={(mudou) => {
            setSimilaresAberto(false);
            if (mudou) setVersao((v) => v + 1);
          }}
        />
      )}

      {mesAberto && (
        <KardexMesModal
          item={mesAberto.item}
          descricao={mesAberto.descricao}
          mes={mesAberto.mes}
          unidade={mesAberto.unidade}
          onFechar={() => setMesAberto(null)}
        />
      )}

      <div className="flex-1 min-h-0 flex px-4 sm:px-6 pb-6">
        {aba === "propostas" ? (
          <PropostasCompraPainel
            usuario={{ id: userProfile?.id, operatorCode: userProfile?.operator_code }}
            onVoltar={() => {
              setAba("lista");
              contarPendentes();
            }}
            aoMudar={contarPendentes}
          />
        ) : (
        <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
          {carregando ? (
            <div className="flex-1 flex items-center justify-center gap-2 text-[12px] font-bold text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Calculando a reposição…
            </div>
          ) : erro ? (
            <p className="flex-1 flex items-center justify-center text-[12px] font-bold text-rose-500">{erro}</p>
          ) : !itens.length ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Boxes className="w-10 h-10 text-muted-foreground/20 mb-3" />
              <p className="text-[13px] font-black text-muted-foreground">Nada para repor com esses filtros</p>
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-auto scrollbar-hide">
                <table className="w-full border-collapse min-w-[1100px]">
                  <thead className="sticky top-0 z-10 bg-card">
                    <tr className="border-b border-border bg-secondary/40">
                      <th rowSpan={2} className={THC}>Código</th>
                      <th rowSpan={2} className={cn(THC, "text-left w-[32%]")}>Produto / Fornecedor</th>
                      <th colSpan={rotulos.length} className={cn(THC, "border-l border-border/60")}>
                        Vendas mensais
                      </th>
                      <th rowSpan={2} className={cn(THC, "border-l border-border/60")}>Média mensal</th>
                      <th rowSpan={2} className={THC}>Saldo</th>
                      <th rowSpan={2} className={THC}>Compra pendente</th>
                      <th rowSpan={2} className={THC}>Lead time</th>
                      <th rowSpan={2} className={cn(THC, "bg-blue-500/5")}>
                        Sugestão
                        <span className="block text-[9px] font-bold normal-case tracking-normal text-muted-foreground/80">
                          para {dados?.meses_estoque ?? 3} meses
                        </span>
                      </th>
                    </tr>
                    <tr className="border-b border-border bg-secondary/40">
                      {rotulos.map((mes, idx) => (
                        <th key={mes} className={cn(THC, "font-bold", idx === 0 && "border-l border-border/60")}>
                          {rotuloMes(mes)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {visiveis.map((i) => (
                      <Linha
                        key={i.cod}
                        item={i}
                        aoAbrirMes={(mes) =>
                          setMesAberto({ item: i.cod, descricao: i.descricao, unidade: i.unidade, mes })
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border bg-secondary/20">
                <div className="flex items-center gap-2">
                  <select
                    value={porPagina}
                    onChange={(e) => setPorPagina(Number(e.target.value))}
                    className="text-[11px] font-bold bg-card border border-border rounded-lg px-3 py-2 outline-none cursor-pointer"
                  >
                    {POR_PAGINA.map((n) => (
                      <option key={n} value={n} className="bg-card text-foreground">{n} por página</option>
                    ))}
                  </select>
                  <span className="text-[11px] text-muted-foreground">
                    {brNum(itens.length)} {itens.length === 1 ? "item" : "itens"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <BotaoPagina onClick={() => setPagina(paginaAtual - 1)} desabilitado={paginaAtual <= 1}>
                    <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                  </BotaoPagina>
                  {paginasVisiveis(paginaAtual, totalPaginas).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPagina(p)}
                      className={cn(
                        "min-w-[2rem] h-8 px-2 rounded-lg text-[11px] font-bold transition-colors",
                        p === paginaAtual
                          ? "bg-blue-600 text-white"
                          : "border border-border hover:bg-secondary",
                      )}
                    >
                      {p}
                    </button>
                  ))}
                  <BotaoPagina onClick={() => setPagina(paginaAtual + 1)} desabilitado={paginaAtual >= totalPaginas}>
                    Próxima <ChevronRight className="w-3.5 h-3.5" />
                  </BotaoPagina>
                </div>
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

const THC = "px-4 py-3 text-center text-[11px] font-black uppercase tracking-wider text-muted-foreground";

/** Até 3 páginas em volta da atual, para a barra não virar uma régua. */
function paginasVisiveis(atual: number, total: number): number[] {
  const inicio = Math.max(1, Math.min(atual - 1, total - 2));
  return Array.from({ length: Math.min(3, total) }, (_, i) => inicio + i).filter((p) => p <= total);
}

function BotaoPagina({
  children, onClick, desabilitado,
}: { children: React.ReactNode; onClick: () => void; desabilitado: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={desabilitado}
      className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-[11px] font-bold hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function Linha({ item: i, aoAbrirMes }: { item: ReposicaoItem; aoAbrirMes: (mes: string) => void }) {
  return (
    <tr className="hover:bg-secondary/30 transition-colors">
      <td className="px-4 py-3 text-center text-[12px] font-bold tabular-nums text-blue-600 dark:text-blue-400">
        {i.cod}
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-bold leading-tight">{i.descricao}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {i.fornecedor || "sem fornecedor definido"}
            {i.fornecedor_interno ? " · empresa do grupo" : ""}
          </span>
          {!!i.similares?.length && (
            <span
              title={i.similares.map((s) => `${s.cod} ${s.descricao} — saldo ${brNum(s.saldo)}`).join("\n")}
              className="inline-flex w-fit items-center gap-1 rounded-md border border-blue-500/30 bg-blue-500/10 px-1.5 py-px text-[9px] font-bold text-blue-600 dark:text-blue-400"
            >
              <Link2 className="w-2.5 h-2.5" />
              + {i.similares.map((s) => s.cod).join(", ")} somado{i.similares.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </td>

      {i.venda_mensal.map((m, idx) => (
        <td key={m.mes} className={cn("px-3 py-3 text-center", idx === 0 && "border-l border-border/60")}>
          {/* Clique abre quem comprou no mês — o kardex que o comprador olharia. */}
          <button
            onClick={() => aoAbrirMes(m.mes)}
            title={
              m.esporadico
                ? `Venda extraordinária: ${brNum(m.qtd)} para ${m.clientes} cliente${m.clientes > 1 ? "s" : ""} — fora da média. Clique para ver os clientes.`
                : m.ruptura
                  ? `Ruptura: ${brNum(m.qtd)} vendido e ${brNum(m.perda_qtd ?? 0)} perdido por falta de estoque (marcado pelo vendedor e conferido no kardex) — fora da média. Clique para ver o mês.`
                  : `${brNum(m.qtd)} para ${m.clientes} cliente${m.clientes === 1 ? "" : "s"}${m.orcamentos ? ` · ${m.orcamentos} orçamento${m.orcamentos > 1 ? "s" : ""}` : ""}. Clique para ver o detalhe.`
            }
            className={cn(
              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[12px] font-bold tabular-nums transition-colors",
              m.esporadico
                ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                : m.ruptura
                  ? "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-400 hover:bg-slate-500/20"
                  : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {m.esporadico && <AlertCircle className="w-3 h-3" />}
            {m.ruptura && <PackageX className="w-3 h-3" />}
            {brNum(m.qtd, m.qtd % 1 ? 1 : 0)}
          </button>
        </td>
      ))}

      <td
        className="px-4 py-3 text-center text-[12px] font-black tabular-nums border-l border-border/60"
        title={
          i.meses_esporadicos.length || i.meses_sem_estoque.length
            ? [
                i.meses_esporadicos.length ? `Fora da média (pico): ${i.meses_esporadicos.join(", ")}` : "",
                i.meses_sem_estoque.length ? `Fora da média (ruptura):${i.meses_sem_estoque.join(", ")}` : "",
                `Sem ajuste: ${brNum(i.media_bruta, 1)}`,
              ].filter(Boolean).join(" · ")
            : undefined
        }
      >
        <div className="flex flex-col items-center gap-0.5">
          <span>{brNum(i.media_ajustada, 1)}</span>
          {(i.meses_esporadicos.length > 0 || i.meses_sem_estoque.length > 0) && (
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-[8px] font-black uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              ajustada
            </span>
          )}
        </div>
      </td>

      {/* Saldo disponível: físico menos o reservado em pedido de venda.
          Cor pela cobertura: sem estoque, menos de 1 mês, ou acima disso. */}
      <td className="px-4 py-3 text-center">
        <span
          title={
            (i.reservado ? `Físico ${brNum(i.saldo)} − reservado ${brNum(i.reservado)}. ` : `Físico ${brNum(i.saldo)}. `) +
            `Cobertura: ${brNum(i.cobertura_meses, 1)} ${i.cobertura_meses === 1 ? "mês" : "meses"}`
          }
          className={cn(
            "inline-block min-w-[2.75rem] px-2 py-1 rounded-lg border text-[12px] font-bold tabular-nums",
            i.disponivel <= 0
              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              : i.disponivel < i.media_ajustada
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          )}
        >
          {brNum(i.disponivel, i.disponivel % 1 ? 2 : 0)}
        </span>
      </td>

      <td className="px-4 py-3 text-center text-[12px] tabular-nums text-muted-foreground">
        {i.em_pedido ? brNum(i.em_pedido) : "—"}
      </td>

      {/* Média de dias entre pedido e entrega do fornecedor, nos últimos 12 meses. */}
      <td
        className="px-4 py-3 text-center text-[12px] tabular-nums text-muted-foreground"
        title={i.lead_time_dias != null ? `Do pedido à chegada: média de ${i.lead_time_pedidos} pedido${i.lead_time_pedidos === 1 ? "" : "s"} recebido${i.lead_time_pedidos === 1 ? "" : "s"} nos últimos 12 meses` : "Sem pedido recebido deste fornecedor nos últimos 12 meses"}
      >
        {i.lead_time_dias != null ? `${i.lead_time_dias} ${i.lead_time_dias === 1 ? "dia" : "dias"}` : "—"}
      </td>

      <td className="px-4 py-3 bg-blue-500/5">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="w-20 text-right text-[14px] font-black tabular-nums text-blue-600 dark:text-blue-400">
            {brNum(i.sugestao_compra)}
          </span>
          <span className="w-8 text-left text-[10px] font-bold uppercase text-muted-foreground">
            {i.unidade || ""}
          </span>
        </div>
      </td>
    </tr>
  );
}
