import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { authHeaders } from "@/lib/api";
import { BarraFiltros, Carregando, Filtro, Vazio } from "./salacabos/ui";

// Relatórios de Estoque › NCM: estoque físico de hoje de cada item nas 3
// empresas, com NCM e CMV (custo médio). Fonte em
// db/src/handlers/HUB/Estoque/estoqueNcmHandler.js.

const EMPRESAS: [string, string][] = [["001", "Carflax"], ["002", "Zelex"], ["003", "JCM"]];
const POR_PAGINA = 100;

interface ItemNcm {
  codigo: string;
  descricao: string;
  ncm: string;
  empresas: Record<string, { saldo: number; cmv: number }>;
  saldo: number;
  cmv: number;
  valor: number;
}

const fmtQtd = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const fmtMoeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNcm = (n: string) => (n.length === 8 ? `${n.slice(0, 4)}.${n.slice(4, 6)}.${n.slice(6)}` : n);
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function EstoqueNcmTab({ barraFiltros }: { barraFiltros?: HTMLElement | null }) {
  const [itens, setItens] = useState<ItemNcm[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(window.location.origin + "/api-marketing/api/estoque/ncm", { headers: await authHeaders() });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string }).error || `Erro ${res.status}`);
        setItens(data as ItemNcm[]);
      } catch (e) {
        setErro((e as Error).message);
        setItens([]);
      }
    })();
  }, []);

  const lista = useMemo(() => {
    const f = semAcento(filtro.trim()).replace(/\./g, "");
    if (!f) return itens || [];
    return (itens || []).filter((i) => semAcento(`${i.codigo} ${i.ncm} ${i.descricao}`).includes(f));
  }, [itens, filtro]);

  // Busca nova volta para a primeira página.
  useEffect(() => { setPagina(1); }, [filtro]);
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = lista.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  const totalValor = useMemo(() => lista.reduce((a, i) => a + i.valor, 0), [lista]);

  const exportar = () => {
    const ws = XLSX.utils.json_to_sheet(lista.map((i) => ({
      Código: i.codigo,
      Descrição: i.descricao,
      NCM: i.ncm,
      ...Object.fromEntries(EMPRESAS.map(([e, nome]) => [`Estoque ${nome}`, i.empresas[e].saldo])),
      "Estoque total": i.saldo,
      "CMV médio": i.cmv,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque NCM");
    XLSX.writeFile(wb, `Estoque por NCM ${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <BarraFiltros alvo={barraFiltros}>
        <Filtro valor={filtro} onChange={setFiltro} placeholder="Código, NCM ou descrição" />
        {lista.length > 0 && (
          <button onClick={exportar} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-bold">
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
        )}
      </BarraFiltros>
      {erro && <p className="text-xs text-destructive">{erro}</p>}

      {!itens ? <Carregando /> : lista.length === 0 ? (
        <Vazio texto="Nenhum item encontrado." />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {lista.length.toLocaleString("pt-BR")} itens · valor em estoque (CMV) <span className="font-bold text-foreground">{fmtMoeda(totalValor)}</span>
          </p>
          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-bold">Código</th>
                  <th className="text-left px-3 py-2 font-bold">Descrição</th>
                  <th className="text-left px-3 py-2 font-bold">NCM</th>
                  {EMPRESAS.map(([e, nome]) => (
                    <th key={e} className="text-right px-3 py-2 font-bold whitespace-nowrap">{nome}</th>
                  ))}
                  <th className="text-right px-3 py-2 font-bold">Total</th>
                  <th className="text-right px-3 py-2 font-bold whitespace-nowrap">CMV médio</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i) => (
                  <tr key={i.codigo} className="border-t border-border/40 hover:bg-secondary/30">
                    <td className="px-3 py-2 font-mono">{i.codigo}</td>
                    <td className="px-3 py-2 min-w-[240px] font-semibold">{i.descricao}</td>
                    <td className="px-3 py-2 font-mono whitespace-nowrap">{i.ncm ? fmtNcm(i.ncm) : "—"}</td>
                    {EMPRESAS.map(([e]) => {
                      const saldo = i.empresas[e].saldo;
                      return (
                        <td key={e} className={`px-3 py-2 text-right whitespace-nowrap tabular-nums font-bold ${saldo < 0 ? "text-destructive" : ""}`}>
                          {fmtQtd(saldo)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right tabular-nums font-black">{fmtQtd(i.saldo)}</td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">{i.cmv > 0 ? fmtMoeda(i.cmv) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>
                {((paginaAtual - 1) * POR_PAGINA + 1).toLocaleString("pt-BR")}–{Math.min(paginaAtual * POR_PAGINA, lista.length).toLocaleString("pt-BR")} de {lista.length.toLocaleString("pt-BR")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagina(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary font-bold disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </button>
                <span className="font-bold text-foreground tabular-nums">Página {paginaAtual} de {totalPaginas}</span>
                <button
                  onClick={() => setPagina(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary font-bold disabled:opacity-40 disabled:pointer-events-none"
                >
                  Próxima <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
