import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  PieChart,
  Settings,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  carregarComissoes,
  isDiretoria,
  podeVerComissoes,
  type ComissaoParametros,
  type EquipeComissao,
  type ComissaoUserProfile,
  type DadosComissoes,
  type LinhaComissao,
} from "./comissao-service";
import { ParametrosModal } from "./ParametrosModal";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
const pct = (v: number) => `${v.toFixed(1).replace(".", ",")}%`;

interface ComissoesViewProps {
  userProfile?: ComissaoUserProfile | null;
}

export function ComissoesView({ userProfile }: ComissoesViewProps) {
  const [mesRef, setMesRef] = useState<Date>(() => {
    const h = new Date();
    return new Date(h.getFullYear(), h.getMonth(), 1);
  });
  const [dados, setDados] = useState<DadosComissoes | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [paramsAberto, setParamsAberto] = useState(false);

  // Força uma releitura (salvou parâmetro) sem depender da identidade do objeto
  // de perfil, que muda a cada render do App e reentraria no efeito sem parar.
  const [recarga, setRecarga] = useState(0);

  const permitido = podeVerComissoes(userProfile);
  const podeEditar = isDiretoria(userProfile);

  const perfilKey = [
    userProfile?.id,
    userProfile?.role,
    userProfile?.department,
    userProfile?.operator_code || userProfile?.operatorCode,
    userProfile?.is_admin,
    userProfile?.is_leader,
  ].join("|");

  useEffect(() => {
    if (!permitido || !userProfile) return;
    let cancelado = false;

    (async () => {
      try {
        const d = await carregarComissoes(mesRef, userProfile);
        if (cancelado) return;
        setDados(d);
        setErro(null);
        setSelecionado((prev) =>
          prev && d.linhas.some((l) => l.codVendedor === prev)
            ? prev
            : (d.linhas[0]?.codVendedor ?? null),
        );
      } catch (err) {
        if (!cancelado)
          setErro(
            err instanceof Error
              ? err.message
              : "Erro ao carregar as comissões",
          );
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
    // userProfile sai das deps de propósito: o que importa dele está em perfilKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesRef, permitido, perfilKey, recarga]);

  const recarregar = () => {
    setLoading(true);
    setRecarga((n) => n + 1);
  };

  const linha = useMemo(
    () => dados?.linhas.find((l) => l.codVendedor === selecionado) ?? null,
    [dados, selecionado],
  );

  const totalGeral = useMemo(
    () => (dados?.linhas || []).reduce((acc, l) => acc + l.resultado.total, 0),
    [dados],
  );

  if (!permitido) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <Lock className="w-10 h-10 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Tela restrita</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          As comissões ficam visíveis apenas para a diretoria e para os
          supervisores, que veem os próprios liderados.
        </p>
      </div>
    );
  }

  const trocarMes = (delta: number) => {
    setLoading(true);
    setMesRef((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-hide p-4 space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight text-foreground">
            Comissões
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {isDiretoria(userProfile) ? "Todos os vendedores" : "Seu time"} ·
            mesma base do painel Geral
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-1 py-1">
            <button
              type="button"
              onClick={() => trocarMes(-1)}
              className="p-1 rounded hover:bg-secondary"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-2 min-w-[7.5rem] text-center">
              {MESES[mesRef.getMonth()]} {mesRef.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => trocarMes(1)}
              className="p-1 rounded hover:bg-secondary"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {podeEditar && (
            <button
              type="button"
              onClick={() => setParamsAberto(true)}
              className="flex items-center gap-1.5 text-xs font-bold bg-card border border-border rounded-lg px-3 py-2 hover:border-blue-500/50"
            >
              <Settings className="w-3.5 h-3.5" /> Parâmetros
            </button>
          )}
        </div>
      </div>

      {/* Uma equipe = uma "loja" para os bônus 4 e 5. O balcão responde pela
          meta do balcão; o B2B, pela dele. */}
      {dados && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {dados.equipes.map((eq) => (
            <div key={eq.id} className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-black uppercase tracking-tight truncate">{eq.nome}</span>
                {!eq.metaCadastrada && (
                  <span className="text-[9px] text-amber-600 font-bold shrink-0" title="Sem meta cadastrada em Parâmetros: usando a soma das metas dos membros">
                    meta somada
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniMetrica icon={Wallet} label="Faturamento" valor={brl(eq.faturamento)}
                  ok={eq.faturamento >= eq.meta} alvo={`meta ${brl(eq.meta)}`} />
                <MiniMetrica icon={TrendingUp} label="Margem bruta" valor={pct(eq.margemPct)}
                  ok={eq.margemPct >= dados.parametros.meta_margem_loja_pct}
                  alvo={`meta ${pct(dados.parametros.meta_margem_loja_pct)}`} />
              </div>
            </div>
          ))}
          <div className="bg-card border border-border rounded-xl p-3 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
              <PieChart className="w-3.5 h-3.5" /> Total a pagar
            </div>
            <div className="text-xl font-black text-blue-600 mt-1">{brl(totalGeral)}</div>
            <div className="text-[10px] text-muted-foreground">
              comissão + bônus · {dados.linhas.length} vendedor{dados.linhas.length === 1 ? "" : "es"}
            </div>
          </div>
        </div>
      )}

      {dados?.conversaoIndisponivel && (
        <div className="flex items-start gap-2 text-[11px] bg-amber-50 dark:bg-amber-900/20 border border-amber-300/60 rounded-lg px-3 py-2 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          Não foi possível carregar os orçamentos perdidos do mês. A conversão
          está contando como 100%, então o bônus de conversão aqui não vale —
          recarregue antes de pagar.
        </div>
      )}

      {erro && (
        <div className="text-xs bg-rose-50 dark:bg-rose-900/20 border border-rose-300/60 rounded-lg px-3 py-2 text-rose-700 dark:text-rose-300">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-xs font-semibold">Carregando comissões…</span>
        </div>
      ) : !dados || dados.linhas.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground">
          Nenhum vendedor no seu escopo com movimento neste mês.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_22rem] gap-4 items-start">
          <Tabela
            linhas={dados.linhas}
            equipes={dados.equipes}
            selecionado={selecionado}
            onSelecionar={setSelecionado}
          />
          {linha && <Simulador linha={linha} parametros={dados.parametros} />}
        </div>
      )}

      {paramsAberto && dados && (
        <ParametrosModal
          mesRef={mesRef}
          parametros={dados.parametros}
          equipes={dados.equipes}
          usuario={{ id: userProfile?.id, name: userProfile?.name }}
          onFechar={() => setParamsAberto(false)}
          onSalvo={() => {
            setParamsAberto(false);
            recarregar();
          }}
        />
      )}
    </div>
  );
}

/** Métrica da equipe dentro do card: o número e o alvo que ele precisa bater. */
function MiniMetrica({
  icon: Icon,
  label,
  valor,
  alvo,
  ok,
}: {
  icon: typeof Wallet;
  label: string;
  valor: string;
  alvo?: string;
  ok?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-tight text-muted-foreground">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div
        className={cn(
          "text-sm font-black mt-0.5",
          ok === undefined ? "text-foreground" : ok ? "text-emerald-600" : "text-rose-600",
        )}
      >
        {valor}
      </div>
      {alvo && <div className="text-[9px] text-muted-foreground">{alvo}</div>}
    </div>
  );
}

function Tabela({
  linhas,
  equipes,
  selecionado,
  onSelecionar,
}: {
  linhas: LinhaComissao[];
  equipes: EquipeComissao[];
  selecionado: string | null;
  onSelecionar: (cod: string) => void;
}) {
  // Só vale mostrar a coluna de equipe quando há mais de uma em tela (diretoria).
  const mostrarEquipe = equipes.length > 1;
  const nomeEquipe = new Map(equipes.map((e) => [e.id, e.nome]));
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-secondary/50 text-[10px] uppercase tracking-tight text-muted-foreground">
              <th className="text-left font-bold px-3 py-2">Vendedor</th>
              {mostrarEquipe && <th className="text-left font-bold px-3 py-2">Equipe</th>}
              <th className="text-right font-bold px-3 py-2">Meta</th>
              <th className="text-right font-bold px-3 py-2">Faturado</th>
              <th className="text-right font-bold px-3 py-2">Margem</th>
              <th className="text-right font-bold px-3 py-2">Conversão</th>
              <th className="text-right font-bold px-3 py-2">Índice</th>
              <th className="text-right font-bold px-3 py-2">Comissão</th>
              <th className="text-center font-bold px-3 py-2">Bônus</th>
              <th className="text-right font-bold px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={l.codVendedor}
                onClick={() => onSelecionar(l.codVendedor)}
                className={cn(
                  "border-t border-border/60 cursor-pointer transition-colors",
                  selecionado === l.codVendedor
                    ? "bg-blue-50/60 dark:bg-blue-900/20"
                    : "hover:bg-secondary/40",
                )}
              >
                <td className="px-3 py-2 font-bold text-foreground truncate max-w-[14rem]">
                  {l.nome}
                </td>
                {mostrarEquipe && (
                  <td className="px-3 py-2 text-muted-foreground truncate max-w-[10rem]">
                    {nomeEquipe.get(l.equipeId) || "—"}
                  </td>
                )}
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {brl(l.entrada.metaVendedor)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-bold",
                    l.entrada.faturado > l.entrada.metaVendedor
                      ? "text-emerald-600"
                      : "text-foreground",
                  )}
                >
                  {brl(l.entrada.faturado)}
                </td>
                <td className="px-3 py-2 text-right">
                  {pct(l.entrada.margemPct)}
                </td>
                <td className="px-3 py-2 text-right">
                  {pct(l.entrada.conversaoPct)}
                </td>
                <td className="px-3 py-2 text-right">
                  {pct(l.resultado.indicePct)}
                </td>
                <td className="px-3 py-2 text-right">
                  {brl(l.resultado.valorComissao)}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    {l.resultado.bonus.map((b) => (
                      <span
                        key={b.label}
                        title={`${b.label}: ${b.realizado} / alvo ${b.alvo}`}
                        className={cn(
                          "w-2 h-2 rounded-full",
                          b.atingido
                            ? "bg-emerald-500"
                            : "bg-slate-300 dark:bg-slate-700",
                        )}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-black text-blue-600">
                  {brl(l.resultado.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Mesmo desenho da planilha: metas, realizado e a remuneração variável. */
function Simulador({
  linha,
  parametros: p,
}: {
  linha: LinhaComissao;
  parametros: ComissaoParametros;
}) {
  const { entrada: e, resultado: r } = linha;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="bg-blue-600 text-white px-3 py-2 text-[11px] font-black uppercase tracking-tight truncate">
        {linha.nome}
      </div>

      <Secao titulo="Metas" />
      <Item label="Meta equipe" valor={brl(e.metaLoja)} />
      <Item label="Meta vendedor" valor={brl(e.metaVendedor)} />
      <Item label="Meta margem bruta" valor={pct(p.meta_margem_bruta_pct)} />
      <Item
        label="% conversão de orçamento"
        valor={pct(p.meta_conversao_pct)}
      />
      <Item
        label="Meta margem bruta equipe"
        valor={pct(p.meta_margem_loja_pct)}
      />
      <Secao titulo="Realizado" />
      <Item label="Faturamento" valor={brl(e.faturado)} />
      <Item label="Margem bruta individual" valor={pct(e.margemPct)} />
      <Item label="Conversão de orçamentos" valor={pct(e.conversaoPct)} />
      <Item label="Faturamento equipe" valor={brl(e.faturamentoLoja)} />
      <Item label="Margem bruta equipe" valor={pct(e.margemLojaPct)} />
      <Item label="Índice comissão" valor={pct(r.indicePct)} />
      <Item label="Valor comissão" valor={brl(r.valorComissao)} destaque />

      <Secao titulo="Remuneração variável" />
      {r.bonus.map((b) => (
        <div
          key={b.label}
          className="flex items-center justify-between gap-2 px-3 py-1.5 border-t border-border/50"
        >
          <span className="text-[11px] text-muted-foreground truncate">
            {b.label}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold">{brl(b.valor)}</span>
            <span
              className={cn(
                "text-[9px] font-black uppercase px-1.5 py-0.5 rounded",
                b.atingido
                  ? "bg-emerald-600 text-white"
                  : "bg-rose-600 text-white",
              )}
              title={`${b.realizado} / alvo ${b.alvo}`}
            >
              {b.atingido ? "Alcançada" : "Não atingiu"}
            </span>
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between px-3 py-2 bg-secondary/60 border-t border-border">
        <span className="text-[11px] font-black uppercase">Total</span>
        <span className="text-sm font-black text-blue-600">{brl(r.total)}</span>
      </div>

      <p className="text-[10px] text-muted-foreground px-3 py-2 border-t border-border/50">
        Os bônus são em cascata: cada um só conta se o anterior foi alcançado.
      </p>
    </div>
  );
}

function Secao({ titulo }: { titulo: string }) {
  return (
    <div className="bg-secondary/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-tight text-muted-foreground border-t border-border">
      {titulo}
    </div>
  );
}

function Item({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t border-border/50">
      <span className="text-[11px] text-muted-foreground truncate">
        {label}
      </span>
      <span
        className={cn(
          "text-[11px] font-bold shrink-0",
          destaque ? "text-blue-600" : "text-foreground",
        )}
      >
        {valor}
      </span>
    </div>
  );
}
