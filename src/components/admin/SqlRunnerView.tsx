import React, { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
import {
  Database, Play, Trash2, Table as TableIcon, ChevronRight,
  Grid3X3, FileCode, Search, HardDrive, RefreshCw, AlertCircle, Copy, 
  Check, XCircle, Sparkles, Bot, X, ArrowUpDown, ChevronUp, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiAdminSQL, apiAdminSchema } from "@/lib/api";
import { DB_KNOWLEDGE } from "./dbKnowledge";

// COMPONENTE PARA A BARRA LATERAL (MEMOIZADO)
const ObjectBrowser = memo(({ schema, onSelectTable }: { schema: any, onSelectTable: (name: string) => void }) => {
  const [expandedDb, setExpandedDb] = useState(true);
  const [expandedTables, setExpandedTables] = useState(false);
  const [expandedViews, setExpandedViews] = useState(true);
  const [filter, setFilter] = useState("");

  const filteredTables = useMemo(() =>
    schema?.tables.filter((t: any) => t.name.toLowerCase().includes(filter.toLowerCase())) || [],
    [schema, filter]
  );

  const filteredViews = useMemo(() =>
    schema?.views.filter((v: any) => v.name.toLowerCase().includes(filter.toLowerCase())) || [],
    [schema, filter]
  );

  return (
    <div className="w-64 bg-card/50 backdrop-blur-md border-r border-border flex flex-col shrink-0 font-sans">
      <div className="h-8 bg-secondary/80 border-b border-border flex items-center px-4 justify-between">
        <span className="text-[10px] font-black text-foreground/50 uppercase tracking-widest">Object Browser</span>
      </div>

      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar Tabelas / Views..."
            className="w-full h-8 pl-8 pr-2 bg-secondary/40 border border-border rounded-lg text-[11px] font-bold text-foreground outline-none focus:border-blue-500/50 uppercase placeholder:text-muted-foreground/20 transition-all font-mono"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2 scrollbar-hide">
        <div className="space-y-1">
          <div onClick={() => setExpandedDb(!expandedDb)} className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-secondary cursor-pointer group transition-all">
            {expandedDb ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            <Database className="w-4 h-4 text-amber-500" />
            <span className="text-[11px] font-black text-foreground uppercase tracking-tighter">{schema?.dbName || "DATABASE"}</span>
          </div>

          {expandedDb && (
            <div className="pl-4 space-y-1">
              {/* TABLES */}
              <div onClick={() => setExpandedTables(!expandedTables)} className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-secondary/40 cursor-pointer text-muted-foreground transition-all">
                {expandedTables ? <ChevronDown className="w-3 h-3 opacity-30" /> : <ChevronRight className="w-3 h-3 opacity-30" />}
                <span className="text-[10px] font-black uppercase tracking-widest">Tabelas ({filteredTables.length})</span>
              </div>
              {expandedTables && filteredTables.map((table: any) => (
                <div key={table.name} className="flex items-center gap-2 pl-4 p-1.5 rounded-lg hover:bg-blue-500/10 cursor-pointer text-foreground/80 group transition-all" onClick={() => onSelectTable(table.name)}>
                  <TableIcon className="w-3.5 h-3.5 text-blue-500 opacity-40 group-hover:opacity-100" />
                  <span className="text-[11px] font-bold truncate uppercase">{table.name}</span>
                </div>
              ))}

              {/* VIEWS */}
              <div onClick={() => setExpandedViews(!expandedViews)} className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-secondary/40 cursor-pointer text-muted-foreground mt-2 transition-all">
                {expandedViews ? <ChevronDown className="w-3 h-3 opacity-30" /> : <ChevronRight className="w-3 h-3 opacity-30" />}
                <span className="text-[10px] font-black uppercase tracking-widest">Views ({filteredViews.length})</span>
              </div>
              {expandedViews && filteredViews.map((view: any) => (
                <div key={view.name} className="flex items-center gap-2 pl-4 p-1.5 rounded-lg hover:bg-indigo-500/10 cursor-pointer text-foreground/80 group transition-all" onClick={() => onSelectTable(view.name)}>
                  <TableIcon className="w-3.5 h-3.5 text-indigo-500 opacity-50 group-hover:opacity-100" />
                  <span className="text-[11px] font-bold truncate uppercase">{view.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// COMPONENTE PARA A GRADE DE RESULTADOS (MEMOIZADO)
const ResultsGrid = memo(({ results, error, loading }: { results: any[], error: string | null, loading: boolean }) => {
  const [filter, setFilter] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const columns = useMemo(() => results.length > 0 ? Object.keys(results[0]) : [], [results]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };


    const copyTop5AsSQL = () => {
      const top5 = results.slice(0, 5);
      if (top5.length === 0) return;
      
      const cols = Object.keys(top5[0]);
      let sql = `-- ESTRUTURA E EXEMPLOS DE DADOS PARA IA\n`;
      sql += `-- Colunas: ${cols.join(", ")}\n`;
      sql += `-- Total de registros na consulta original: ${results.length}\n\n`;

      const rowsSql = top5.map(row => {
        const values = cols.map(c => {
          const val = row[c];
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'number') return val;
          // Escapar aspas simples
          const escaped = String(val).replace(/'/g, "''");
          return `'${escaped}'`;
        }).join(", ");
        return `INSERT INTO TB_DADOS (${cols.join(", ")}) VALUES (${values});`;
      }).join("\n");

      navigator.clipboard.writeText(sql + rowsSql);
      setCopiedId("top5-sql");
      setTimeout(() => setCopiedId(null), 2000);
    };

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null });

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return { key: '', direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredResults = useMemo(() => {
    let items = results;
    if (filter) {
      const term = filter.toLowerCase();
      items = results.filter(row =>
        Object.values(row).some(val => String(val).toLowerCase().includes(term))
      );
    }

    if (sortConfig.key && sortConfig.direction) {
      items = [...items].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        const res = aVal > bVal ? 1 : -1;
        return sortConfig.direction === 'asc' ? res : -res;
      });
    }

    return items;
  }, [results, filter, sortConfig]);

  if (error) {
    return (
      <div className="p-10 flex flex-col items-center gap-4 text-center bg-card">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div>
          <h5 className="text-[12px] font-black text-foreground uppercase tracking-tight mb-2">Erro de Execução</h5>
          <p className="text-[10px] font-bold text-red-500 font-mono max-w-lg bg-red-950/20 p-4 rounded-xl border border-red-900/20">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* LOCAL GRID FILTER */}
      <div className="h-9 bg-secondary/80 backdrop-blur-sm border-b border-border flex items-center px-4 justify-between">
        <div className="h-full px-4 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 bg-card text-blue-500 border-t-2 border-t-blue-500 shadow-sm shrink-0">
          <Grid3X3 className="w-3.5 h-3.5" />
          Result Area
        </div>
        <div className="flex-1 max-w-xs px-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Pesquisar nestes resultados..."
              className="w-full h-6 pl-7 pr-2 bg-background border border-border rounded text-[10px] font-bold text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-blue-500/30 transition-all uppercase"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-card scrollbar-hide">
        {loading ? (
          <table className="w-full border-separate border-spacing-0 animate-pulse">
            <thead>
              <tr className="bg-secondary/30">
                <th className="w-16 h-8 border-b border-r border-border" />
                {Array.from({ length: 12 }).map((_, i) => (
                  <th key={i} className="px-4 py-2 border-b border-r border-border">
                    <div className="h-2 bg-secondary rounded w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 15 }).map((_, i) => (
                <tr key={i}>
                  <td className="w-16 h-8 border-r border-border bg-secondary/10" />
                  {Array.from({ length: 12 }).map((_, j) => (
                    <td key={j} className="px-4 py-2 border-r border-border">
                      <div className={cn("h-2 bg-secondary/50 rounded", j % 3 === 0 ? "w-24" : j % 2 === 0 ? "w-16" : "w-12")} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : filteredResults.length > 0 ? (
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="w-16 border-b border-r border-border bg-secondary relative group/expand">
                  <button 
                    onClick={copyTop5AsSQL}
                    title="Copiar TOP 5 como INSERT SQL"
                    className="absolute inset-0 flex items-center justify-center hover:bg-blue-600 transition-colors text-muted-foreground hover:text-white"
                  >
                    {copiedId === "top5-sql" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </th>
                {columns.map(col => (
                  <th 
                    key={col} 
                    className="group px-4 py-2 border-b border-r border-border bg-secondary text-left whitespace-nowrap cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                        {col.toUpperCase()}
                      </span>
                      <div className="text-muted-foreground/30">
                        {sortConfig.key === col ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-blue-500" /> : <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-100" />
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredResults.slice(0, 500).map((row, i) => (
                <tr key={i} className="hover:bg-blue-900/10 group">
                <td className="w-16 text-[10px] text-right pr-4 text-muted-foreground border-r border-border bg-secondary/30 font-medium tracking-tighter">
                  {i + 1}
                </td>
                  {columns.map(col => {
                    const value = row[col];
                    const isPassword = col.toUpperCase().includes("SENHA") || col.toUpperCase().includes("SENOPE");
                    const cellId = `${i}-${col}`;

                    const smartFormat = (val: any) => {
                      if (val === null || val === undefined || String(val).trim() === "") return <span>NULL</span>;
                      const sVal = String(val);
                      
                      // Detectar ISO Date (YYYY-MM-DDTHH:mm:ss...)
                      if (sVal.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                        try {
                          const d = new Date(sVal);
                          if (isNaN(d.getTime())) return sVal;
                          const pad = (n: number) => String(n).padStart(2, '0');
                          const datePart = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
                          const hasTime = !sVal.includes('T00:00:00');
                          if (hasTime) {
                            return `${datePart} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
                          }
                          return datePart;
                        } catch { return sVal; }
                      }

                      if (isPassword) return "********";
                      return sVal;
                    };

                    let displayValue = smartFormat(value);
                    let rawValue = String(value ?? "");

                    return (
                        <td
                        key={col}
                        onClick={() => handleCopy(rawValue, cellId)}
                        className={cn(
                          "px-4 py-2 text-[11px] border-r border-border/50 whitespace-nowrap min-w-[100px] text-foreground/70 cursor-pointer hover:bg-secondary/30 transition-colors relative group/cell",
                          isPassword && "font-mono opacity-40 text-[9px]"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="truncate">{displayValue}</span>
                          <div className="opacity-0 group-hover/cell:opacity-100 shrink-0">
                            {copiedId === cellId ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5 text-muted-foreground/30" />}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <Database className="w-12 h-12 text-muted-foreground mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">No results found</p>
          </div>
        )}
      </div>
    </div>
  );
});

export function SqlRunnerView() {
  const [query, setQuery] = useState("SELECT * FROM VW_ROMANEIOS LIMIT 100");
  const [results, setResults] = useState<any[]>([]);
  const [schema, setSchema] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSchema = useCallback(async () => {
    try {
      const res = await apiAdminSchema() as any;
      if (res.success) setSchema(res);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchSchema(); }, [fetchSchema]);

  const handleRun = async (manualQueryOrEvent?: string | React.MouseEvent) => {
    const q = typeof manualQueryOrEvent === 'string' ? manualQueryOrEvent : query;
    if (!q || !q.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      
      // Criar controlador para cancelamento
      abortControllerRef.current = new AbortController();

      const response = await apiAdminSQL(q, abortControllerRef.current.signal);
      
      if (response.success) {
        setResults(response.data || []);
      } else {
        setError(response.error || "Erro desconhecido");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Consulta cancelada pelo usuário");
      } else {
        setError(err.message || "Erro ao executar query");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "F9") {
      e.preventDefault();
      handleRun();
    }
  };

  const handleSelectTable = useCallback((name: string) => {
    setQuery(`SELECT * FROM ${name} LIMIT 100`);
  }, []);

  const [resultsHeight, setResultsHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY - 24; // Ajuste para a barra de status
      if (newHeight > 100 && newHeight < window.innerHeight - 200) {
        setResultsHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden rounded-tl-2xl border-t border-l border-border font-sans select-none">

      {/* TOOLBAR */}
      <div className="h-10 bg-card border-b border-border flex items-center px-1 gap-1">
        <button className="p-1.5 hover:bg-secondary rounded" title="Nova Query" onClick={() => setQuery("")}>
          <FileCode className="w-4 h-4 text-blue-400" />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1 hover:bg-emerald-900/30 rounded text-emerald-400 font-black text-[11px] transition-all disabled:opacity-50"
        >
          {loading ? <div className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          EXECUTE (F9)
        </button>
        <button
          onClick={handleStop}
          disabled={!loading}
          className="flex items-center gap-2 px-3 py-1 hover:bg-red-900/30 rounded text-red-500 font-black text-[11px] transition-all disabled:opacity-30"
          title="Parar Pesquisa"
        >
          <XCircle className="w-3.5 h-3.5" />
          STOP
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button className="p-1.5 hover:bg-secondary rounded" title="Limpar" onClick={() => setQuery("")}>
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
        <button className="p-1.5 hover:bg-secondary rounded" onClick={fetchSchema} title="Recarregar Schema">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin text-blue-400")} />
        </button>
        <div className="flex-1" />
        <button 
          onClick={() => setIsAiOpen(true)}
          className="flex items-center gap-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white font-black text-[11px] transition-all shadow-lg shadow-indigo-600/30 group mr-2 active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5 group-hover:animate-pulse" />
          DANILO AI
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ObjectBrowser schema={schema} onSelectTable={handleSelectTable} />

        <div className="flex-1 flex flex-col overflow-hidden bg-card">
          {/* EDITOR CONTAINER */}
          <div className="flex-1 relative bg-card dark:bg-[#09090B] overflow-hidden font-mono text-[13px]">
            {(() => {
              const highlightSql = (code: string) => {
                if (!code) return "";
                
                // Regex mestre: Grupo 1=Keywords, Grupo 2=Functions, Grupo 3=Strings, Grupo 4=Numbers
                const regex = /\b(SELECT|FROM|WHERE|LIMIT|UPDATE|INSERT|DELETE|JOIN|LEFT|RIGHT|INNER|ORDER|GROUP|BY|HAVING|IN|AND|OR|AS|ON|SET|INTO|VALUES|CREATE|TABLE|DATABASE|DESC|ASC)\b|(\b(?:COUNT|SUM|AVG|MIN|MAX|NOW|CURDATE|DATE_FORMAT|CONCAT|COALESCE|IFNULL)\b)|('[^']*'|"[^"]*")|(\b\d+\b)/gi;

                return code
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(regex, (match, g1, g2, g3, g4) => {
                    if (g1) return `<span style="color:var(--sql-keyword)" class="font-black">${match}</span>`;
                    if (g2) return `<span style="color:var(--sql-function)" class="font-bold">${match}</span>`;
                    if (g3) return `<span style="color:var(--sql-string)">${match}</span>`;
                    if (g4) return `<span style="color:var(--sql-number)">${match}</span>`;
                    return match;
                  });
              };

              return (
                <>
                  <div 
                    id="sql-highlight"
                    className="absolute inset-0 p-6 pointer-events-none whitespace-pre-wrap break-words overflow-auto scrollbar-hide text-foreground/80 font-bold tracking-tight"
                    dangerouslySetInnerHTML={{ __html: highlightSql(query) + "\n" }}
                  />
                  <textarea 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onScroll={(e) => {
                      const div = document.getElementById("sql-highlight");
                      if (div) div.scrollTop = e.currentTarget.scrollTop;
                    }}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    className="absolute inset-0 w-full h-full p-6 bg-transparent text-transparent caret-blue-400 leading-relaxed outline-none resize-none overflow-auto scrollbar-hide"
                    placeholder="DIGITE SUA QUERY SQL AQUI... (F9 PARA EXECUTAR)"
                  />
                </>
              );
            })()}
          </div>

          {/* RESIZER BAR */}
          <div
            className="h-1 bg-border hover:bg-blue-500/50 cursor-row-resize transition-colors"
            onMouseDown={startResizing}
          />

          {/* RESULTS AREA */}
          <div
            style={{ height: resultsHeight }}
            className="flex flex-col overflow-hidden bg-card"
          >

            <div className="flex-1 overflow-hidden">
              <ResultsGrid results={results} error={error} loading={loading} />
            </div>

            {/* STATUS BAR */}
            <div className="h-6 bg-secondary/50 border-t border-border px-3 flex items-center justify-between text-[10px] font-bold text-muted-foreground font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 uppercase"><HardDrive className="w-3 h-3" /> {schema?.dbName || "DATABASE"}</span>
              </div>
              <div className="flex items-center gap-4">
                <span>ROWS: {results.length} {results.length === 500 && "(LIMIT)"}</span>
                <span className="text-[9px] text-amber-500 uppercase tracking-tighter">Auto-Limit 500 active</span>
                <span className="text-emerald-500 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> READY</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SqlAiAssistant 
        isOpen={isAiOpen} 
        onClose={() => setIsAiOpen(false)} 
        setQuery={setQuery} 
        onExecute={handleRun}
      />
    </div>
  );
}

// ── ASSISTENTE IA (MODAL) ──────────────────────────────────────────────────
const SqlAiAssistant = ({ isOpen, onClose, setQuery, onExecute }: { isOpen: boolean, onClose: () => void, setQuery: (q: string) => void, onExecute: (q: string) => void }) => {
  const [prompt, setPrompt] = useState("");
  const [thinking, setThinking] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setThinking(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDUWAG8o4Wffhap5T__awTPckyNJTYs0Ns";
      
      const systemPrompt = `Você é um analista de dados especialista no ERP Autcom. 
      ESTRUTURA DO BANCO: ${JSON.stringify({ primary: DB_KNOWLEDGE.primaryTables, allTableNames: DB_KNOWLEDGE.allTables })}
      
      LOGICA DE NOMENCLATURA AUTCOM:
      - 'CAD...': Tabelas de Cadastro (Ex: CADCLI = Clientes, CADITE = Itens, CADVENDEDOR = Vendedores).
      - 'MOV...': Tabelas de Movimentação (Ex: MOVGER = Movimento Geral, MOVITE = Movimento de Itens).
      - 'NOT...': Tabelas de Notas Fiscais.
      - 'BAN...': Tabelas de Movimentação Bancária/Financeira.
      - 'VW_...': Views simplificadas (use para relatórios rápidos).

      OBJETIVO: Converta o pedido do usuário em SQL.
      REGRAS: 
      1. Se o usuário quiser dados brutos, detalhados ou cadastros específicos, use tabelas 'CAD' ou 'MOV'.
      2. Use as tabelas da lista 'allTableNames' para encontrar o assunto pedido.
      3. Importante: Se escolher uma tabela que não está na lista 'primary', use '*' (pois não sabemos as colunas).
      4. Responda APENAS com o código SQL, sem explicações, sem markdown.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nPedido do Usuário: ${prompt}` }] }]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error("Erro Gemini:", errData);
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      const generatedSql = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      
      // Limpar possíveis marcas de markdown
      const cleanSql = generatedSql.replace(/```sql|```/g, "").trim();

      if (cleanSql) {
        setQuery(cleanSql);
        onClose();
        setPrompt("");
        // Execução direta e imediata
        onExecute(cleanSql);
      } else {
        alert("Não consegui gerar o SQL para esse pedido.");
      }
    } catch (err) {
      console.error("Erro na IA:", err);
      alert("Erro ao conectar com o Gemini.");
    } finally {
      setThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl shadow-indigo-900/40 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-indigo-600/90 backdrop-blur-sm p-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-tight">Danilo AI Assistant</h3>
              <p className="text-[10px] opacity-80 font-bold uppercase">Baseado no seu Banco de Dados (Autcom)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 block">O que você deseja buscar?</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                autoFocus
                placeholder="Ex: 'Quero ver as vendas de cada vendedor' ou 'Quais entregas estão pendentes em Curitiba?'"
                className="w-full h-32 p-4 bg-secondary/30 border border-border rounded-xl text-[13px] text-foreground outline-none focus:border-indigo-500/50 transition-all resize-none font-medium placeholder:text-muted-foreground/20"
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={thinking || !prompt.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-black transition-all shadow-lg shadow-indigo-200"
                >
                  {thinking ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      PROCESSANDO...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      GERAR SQL
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-3">Sugestões Rápidas:</span>
            <div className="space-y-2">
              {DB_KNOWLEDGE.commonQueries.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => { setPrompt(q.label); }}
                  className="w-full text-left p-3 hover:bg-secondary/50 rounded-lg border border-transparent hover:border-border transition-all flex items-center justify-between group"
                >
                  <span className="text-[12px] font-bold text-foreground/70">{q.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-secondary/20 p-4 border-t border-border flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">A IA analisa tabelas como VW_ROMANEIOS, CADITE e VW_CONTAS_A_RECEBER.</span>
        </div>
      </div>
    </div>
  );
};
