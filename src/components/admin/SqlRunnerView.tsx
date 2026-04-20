import { useState } from "react";
import { 
  Database, 
  Play, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Search,
  Table as TableIcon,
  Code
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiAdminSQL } from "@/lib/api";

export function SqlRunnerView() {
  const [query, setQuery] = useState("SELECT * FROM VW_ROMANEIOS LIMIT 10");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const res = await apiAdminSQL(query);
      if (res.success) {
        setResults(res.data);
      } else {
        setError(res.error || "Erro desconhecido ao executar query.");
      }
    } catch (err: any) {
      setError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  const columns = results.length > 0 ? Object.keys(results[0]) : [];

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 overflow-hidden bg-[#F8FAFC]">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Console SQL Administrativo</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
            <Database className="w-3 h-3 text-blue-500" />
            Acesso Direto ao Banco de Dados Carflax (Easypanel)
          </p>
        </div>

        <div className="flex items-center gap-2">
            <button className="h-9 px-4 bg-white border border-slate-200 rounded-xl text-[11px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
                <Code className="w-3.5 h-3.5" />
                Histórico
            </button>
            <button 
                onClick={handleRun}
                disabled={loading}
                className="h-9 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 active:scale-95"
            >
                {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                Executar Query
            </button>
        </div>
      </div>

      {/* EDITOR AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[40%] min-h-[250px]">
        <div className="lg:col-span-12 flex flex-col bg-slate-900 rounded-[24px] shadow-2xl p-4 border border-slate-800 relative group">
           <div className="absolute top-4 right-4 flex gap-2">
              <button 
                onClick={() => setQuery("")}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Limpar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
           </div>
           <textarea 
             value={query}
             onChange={(e) => setQuery(e.target.value)}
             spellCheck={false}
             className="flex-1 bg-transparent border-none outline-none text-blue-300 font-mono text-[13px] leading-relaxed resize-none scrollbar-hide p-2"
             placeholder="Digite seu SQL aqui... (Ex: SELECT * FROM CADMOT)"
           />
           <div className="flex items-center justify-between pt-4 border-t border-slate-800/50 mt-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Editor de Comandos</span>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                 <span>Linhas: {query.split('\n').length}</span>
                 <span>SGBD: MySQL 8.0</span>
              </div>
           </div>
        </div>
      </div>

      {/* RESULTS AREA */}
      <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/50">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <TableIcon className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Grade de Resultados</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Mostrando {results.length} registros encontrados</p>
              </div>
           </div>

           <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="FILTRAR RESULTADOS..."
                  className="h-8 pl-9 pr-4 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 placeholder:text-slate-300 outline-none w-48 focus:border-blue-300 transition-all uppercase"
                />
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-auto scrollbar-hide">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-10">
               <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center mb-4 border border-red-100">
                  <AlertCircle className="w-8 h-8 text-red-500" />
               </div>
               <h5 className="text-[14px] font-black text-slate-900 uppercase tracking-tight mb-2">Erro na Execução</h5>
               <p className="text-[12px] font-bold text-red-400 font-mono max-w-lg bg-red-50/50 p-4 rounded-xl border border-red-100/50">{error}</p>
            </div>
          ) : results.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                  {columns.map(col => (
                    <th key={col} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors border-b border-slate-50">
                    {columns.map(col => (
                      <td key={col} className="px-6 py-3 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        {String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-30">
               <Database className="w-12 h-12 text-slate-300 mb-4" />
               <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Execute uma query para ver os dados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
