import { useState, useEffect, useMemo } from "react";
import {
  Search, Target, Clock, TrendingUp, Phone,
  ChevronUp, ChevronDown, ChevronsUpDown, Users, IdCard, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiAnaliseFrv } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/Skeleton";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import { TinyLoader } from "@/components/ui/TinyLoader";
import {
  ProspeccaoModal,
  CONTATOS,
  MOTIVOS,
  INTERESSES,
  type ProspeccaoContato,
} from "./ProspeccaoModal";

interface ClienteFRV {
  cliente_id: string;
  nome_cliente: string;
  documento: string | null;
  tipo_pessoa: "PJ" | "PF" | null;
  telefone: string | null;
  telefone_whatsapp: boolean;
  ultima_compra: string;
  recencia_dias: number;
  frequencia: number;
  valor_total: number;
  cod_vendedor: string;
}

const soDigitos = (v: string) => v.replace(/\D/g, "");

/** CPF 000.000.000-00 e CNPJ 00.000.000/0000-00. */
function fmtDocumento(doc: string | null) {
  const d = soDigitos(doc || "");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return doc || "";
}

/** (11) 99999-9999 para celular e (11) 9999-9999 para fixo. */
function fmtTelefone(tel: string | null) {
  const d = soDigitos(tel || "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return tel || "";
}

const waLink = (tel: string) => `https://wa.me/55${soDigitos(tel).replace(/^55(?=\d{10,11}$)/, "")}`;

// Filtro de tempo parado em meses (pedido do Danilo): 1 a 6 meses.
const MESES_PARADO = [1, 2, 3, 4, 5, 6];
const DOC_FILTROS = ["Todos", "CNPJ", "CPF", "Sem documento"] as const;

interface Vendedor {
  label: string;
  value: string;
}

interface UserProfile {
  id?: string;
  operator_code?: string;
  operatorCode?: string;
  name?: string;
  role?: string;
  is_admin?: boolean;
  is_leader?: boolean;
}

interface ProspeccoesViewProps {
  userProfile?: UserProfile;
}

type SortField = "ultima_compra" | "recencia_dias" | "frequencia" | "valor_total";

/**
 * Quem enxerga a carteira inteira, e não só a própria. Supervisor e líder entram
 * aqui: o supervisor de vendas tem pouquíssimo cliente no próprio código, então
 * sem isso a tela abria vazia para ele.
 */
function isGerente(perfil?: UserProfile) {
  if (perfil?.is_admin || perfil?.is_leader) return true;
  const r = (perfil?.role || "").toLowerCase();
  return (
    r.includes("gerente") ||
    r.includes("supervisor") ||
    r.includes("diretor") ||
    r.includes("marketing") ||
    r.includes("admin")
  );
}

function fmt(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProspeccoesView({ userProfile }: ProspeccoesViewProps) {
  const [clientes, setClientes] = useState<ClienteFRV[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minValor, setMinValor] = useState(8000);
  const [minMeses, setMinMeses] = useState(3);
  const [filterDoc, setFilterDoc] = useState<(typeof DOC_FILTROS)[number]>("Todos");
  const minDias = minMeses * 30;
  const [sortField, setSortField] = useState<SortField>("recencia_dias");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [prospectando, setProspectando] = useState<ClienteFRV | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  // Última prospecção registrada de cada cliente, para a linha mostrar o que já foi feito.
  const [ultimoContato, setUltimoContato] = useState<Map<string, ProspeccaoContato>>(new Map());
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filterVendedor, setFilterVendedor] = useState("Todos");

  const gerente = isGerente(userProfile);
  const operatorCode = userProfile?.operator_code || userProfile?.operatorCode || "";

  // Carrega lista de vendedores para o dropdown do gerente
  useEffect(() => {
    if (!gerente) return;
    supabase
      .from("usuarios")
      .select("name, operator_code")
      .not("operator_code", "is", null)
      .order("name")
      .then(({ data }) => {
        if (!data) return;
        const opts: Vendedor[] = [
          { label: "Todos os Vendedores", value: "Todos" },
          ...data
            .filter(u => u.operator_code)
            .map(u => ({ label: u.name, value: u.operator_code! })),
        ];
        setVendedores(opts);
      });
  }, [gerente]);

  // Carrega clientes filtrando por vendedor (backend) para não-gerentes
  useEffect(() => {
    setLoading(true);

    const vendedor = gerente
      ? filterVendedor !== "Todos" ? filterVendedor : undefined
      : operatorCode || undefined;

    apiAnaliseFrv()
      .then((resp) => {
        const lista = (resp?.clientes || [])
          .filter((c) => !vendedor || c.cod_vendedor === vendedor)
          .map((c) => ({
            ...c,
            recencia_dias: Number(c.recencia_dias),
            frequencia: Number(c.frequencia),
            valor_total: parseFloat(String(c.valor_total)),
          })) as ClienteFRV[];
        setClientes(lista);
      })
      .finally(() => setLoading(false));
  }, [gerente, operatorCode, filterVendedor]);

  // Última prospecção de cada cliente (o registro mais novo vence).
  useEffect(() => {
    supabase
      .from("prospeccao_contatos")
      .select("*")
      .order("criado_em", { ascending: false })
      .limit(2000)
      .then(({ data }) => {
        const mapa = new Map<string, ProspeccaoContato>();
        for (const r of (data || []) as ProspeccaoContato[]) {
          if (!mapa.has(r.cliente_id)) mapa.set(r.cliente_id, r);
        }
        setUltimoContato(mapa);
      });
  }, []);

  const filtered = useMemo(() => {
    return clientes
      .filter(c => {
        const busca = search.trim().toLowerCase();
        const digitosBusca = soDigitos(busca);
        // A busca aceita nome, código do cliente e CPF/CNPJ (com ou sem máscara).
        const casaBusca =
          !busca ||
          c.nome_cliente.toLowerCase().includes(busca) ||
          c.cliente_id.includes(digitosBusca && digitosBusca.length >= 3 ? digitosBusca : busca) ||
          (digitosBusca.length >= 3 && soDigitos(c.documento || "").includes(digitosBusca));

        const casaDoc =
          filterDoc === "Todos" ||
          (filterDoc === "CNPJ" && c.tipo_pessoa === "PJ") ||
          (filterDoc === "CPF" && c.tipo_pessoa === "PF") ||
          (filterDoc === "Sem documento" && !c.tipo_pessoa);

        return c.valor_total >= minValor && c.recencia_dias >= minDias && casaBusca && casaDoc;
      })
      .sort((a, b) => {
        const va = a[sortField] as number | string;
        const vb = b[sortField] as number | string;
        if (typeof va === "number" && typeof vb === "number") {
          return sortDir === "asc" ? va - vb : vb - va;
        }
        return sortDir === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
  }, [clientes, search, minValor, minDias, filterDoc, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  };

  const registrarProspeccao = (registro: ProspeccaoContato) => {
    setUltimoContato(m => new Map(m).set(registro.cliente_id, registro));
    setSuccessId(registro.cliente_id);
    setProspectando(null);
    setTimeout(() => setSuccessId(null), 3000);
  };

  const totalPotencial = filtered.reduce((acc, c) => acc + c.valor_total, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-background">

      {/* Header */}
      <div className="px-3 sm:px-6 pt-5 pb-4 border-b border-border/60 bg-white dark:bg-card shrink-0">

        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tight text-foreground leading-none">
                Prospecções
              </h1>
              <p className="text-[10px] font-medium text-muted-foreground mt-0.5">
                Clientes com alto potencial parados há mais de {minMeses} {minMeses === 1 ? "mês" : "meses"}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center px-4 py-2.5 rounded-xl bg-card border border-border shadow-sm min-w-[90px]">
              <div className="flex items-center gap-1 mb-0.5">
                <Users className="w-3 h-3 text-muted-foreground opacity-40" />
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Clientes</span>
              </div>
              <span className="text-base font-black text-foreground tabular-nums">
                {loading ? <TinyLoader size="sm" /> : filtered.length}
              </span>
            </div>
            <div className="flex flex-col items-center px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-500/20 shadow-sm min-w-[150px]">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Potencial total</span>
              </div>
              <span className="text-[15px] font-black text-emerald-700 dark:text-emerald-300 tabular-nums">
                {loading ? <TinyLoader size="sm" /> : fmt(totalPotencial)}
              </span>
            </div>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-[260px] group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[11px] font-medium bg-secondary/50 border border-border/60 rounded-lg outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {/* Dropdown vendedor — só para gerentes */}
          {gerente && (
            <TinyDropdown
              value={filterVendedor}
              options={vendedores.map(v => v.label)}
              onChange={val => {
                const found = vendedores.find(v => v.label === val);
                setFilterVendedor(found?.value ?? "Todos");
              }}
              icon={Users}
              variant="slate"
              placeholder="Todos os Vendedores"
            />
          )}

          <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary/50 border border-border/60 rounded-lg">
            <span className="text-[10px] font-bold text-muted-foreground">Valor mín.</span>
            <select
              value={minValor}
              onChange={e => setMinValor(Number(e.target.value))}
              className="text-[10px] font-black bg-transparent outline-none cursor-pointer text-foreground"
            >
              <option value={5000}>R$ 5.000</option>
              <option value={8000}>R$ 8.000</option>
              <option value={15000}>R$ 15.000</option>
              <option value={30000}>R$ 30.000</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary/50 border border-border/60 rounded-lg">
            <IdCard className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground">Documento</span>
            <select
              value={filterDoc}
              onChange={e => setFilterDoc(e.target.value as (typeof DOC_FILTROS)[number])}
              className="text-[10px] font-black bg-transparent outline-none cursor-pointer text-foreground"
            >
              {DOC_FILTROS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary/50 border border-border/60 rounded-lg">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground">Sem comprar há</span>
            <select
              value={minMeses}
              onChange={e => setMinMeses(Number(e.target.value))}
              className="text-[10px] font-black bg-transparent outline-none cursor-pointer text-foreground"
            >
              {MESES_PARADO.map(m => (
                <option key={m} value={m}>{m} {m === 1 ? "mês" : "meses"}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-hide">
        <table className="w-full border-collapse min-w-[720px]">
          <thead className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-sm border-b border-border/60">
            <tr>
              <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-widest text-muted-foreground w-[32%]">
                Cliente
              </th>
              <th
                className="px-6 py-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => toggleSort("ultima_compra")}
              >
                <div className="flex items-center justify-center gap-1">
                  Última Compra <SortIcon field="ultima_compra" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => toggleSort("recencia_dias")}
              >
                <div className="flex items-center justify-center gap-1">
                  Sem Comprar <SortIcon field="recencia_dias" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => toggleSort("frequencia")}
              >
                <div className="flex items-center justify-center gap-1">
                  Qtd. Compras <SortIcon field="frequencia" />
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => toggleSort("valor_total")}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Histórico <SortIcon field="valor_total" />
                </div>
              </th>
              <th className="px-6 py-3 text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground w-[160px]">
                Ação
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/40">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="bg-white dark:bg-card">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <Skeleton className="h-4 w-full rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center">
                  <Target className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-[12px] font-black text-muted-foreground">Nenhum cliente encontrado</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Tente ajustar os filtros</p>
                </td>
              </tr>
            ) : (
              filtered.map(cliente => (
                <tr
                  key={cliente.cliente_id}
                  className="hover:bg-secondary/30 transition-colors group bg-white dark:bg-card"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                        {cliente.nome_cliente}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[9px] font-bold text-muted-foreground">
                          ID: {cliente.cliente_id}
                        </span>
                        {cliente.documento && (
                          <span className="text-[9px] font-medium text-muted-foreground">
                            • {fmtDocumento(cliente.documento)}
                          </span>
                        )}
                        {cliente.telefone && (
                          cliente.telefone_whatsapp ? (
                            <a
                              href={waLink(cliente.telefone)}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir conversa no WhatsApp"
                              onClick={e => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <MessageCircle className="w-2.5 h-2.5" />
                              {fmtTelefone(cliente.telefone)}
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                              <Phone className="w-2.5 h-2.5 opacity-50" />
                              {fmtTelefone(cliente.telefone)}
                            </span>
                          )
                        )}
                      </div>
                      {ultimoContato.get(cliente.cliente_id) && (() => {
                        const u = ultimoContato.get(cliente.cliente_id)!;
                        return (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className={cn("rounded border px-1.5 py-0.5 text-[8px] font-black uppercase", CONTATOS[u.contato].cls)}>
                              {CONTATOS[u.contato].label}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                              {u.motivo ? ` · ${MOTIVOS[u.motivo]}` : ""}
                              {u.interesse ? ` · ${INTERESSES[u.interesse].label}` : ""}
                              {u.proximo_contato ? ` · retorno ${u.proximo_contato.split("-").reverse().join("/")}` : ""}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </td>

                  <td className="px-6 py-3.5 text-center text-[10px] font-bold text-muted-foreground">
                    {cliente.ultima_compra
                      ? new Date(cliente.ultima_compra).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>

                  <td className="px-6 py-3.5 text-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black",
                      cliente.recencia_dias < 120
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    )}>
                      {cliente.recencia_dias}d
                    </span>
                  </td>

                  <td className="px-6 py-3.5 text-center font-black text-[11px] text-foreground">
                    {cliente.frequencia}x
                  </td>

                  <td className="px-6 py-3.5 text-right font-black text-[11px] text-foreground tabular-nums">
                    {fmt(cliente.valor_total)}
                  </td>

                  <td className="px-6 py-3.5 text-center">
                    {successId === cliente.cliente_id ? (
                      <span className="text-[10px] font-black text-emerald-500">✓ Registrado!</span>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        {cliente.telefone && (
                          <a
                            href={waLink(cliente.telefone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 inline-flex items-center justify-center"
                            title={`Conversar com ${cliente.nome_cliente} no WhatsApp`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => setProspectando(cliente)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black text-primary bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20"
                        >
                          <Phone className="w-3 h-3" />
                          Prospectar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {prospectando && (
        <ProspeccaoModal
          cliente={prospectando}
          usuario={{ id: userProfile?.id, nome: userProfile?.name, operatorCode: operatorCode }}
          onFechar={() => setProspectando(null)}
          onSalvo={registrarProspeccao}
        />
      )}
    </div>
  );
}
