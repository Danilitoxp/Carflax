import { useState } from "react";
import { Search, ShoppingCart } from "lucide-react";

/* ─────────────────────────────────────────────
   PRODUTOS VIEW
 ───────────────────────────────────────────── */
export function ProdutosView() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const products = [
    { cod: "00001", desc: "TUBO ROSCAVEL PVC 3/4\" (10464) AMANCO", stock: "20,130", pending: null, debit: "R$ 92,99", credit: "R$ 97,32" },
    { cod: "00002", desc: "TUBO ROSCAVEL PVC 1/2\" (10463) AMANCO", stock: "144,720", pending: null, debit: "R$ 68,99", credit: "R$ 72,20" },
    { cod: "00003", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 3/4 (11477) AMANCO", stock: "1,000", pending: "+20", debit: "R$ 22,99", credit: "R$ 24,05" },
    { cod: "00004", desc: "TUBO ROSCAVEL PVC 1\" (10465) AMANCO", stock: "11,760", pending: null, debit: "R$ 183,99", credit: "R$ 192,56" },
    { cod: "00005", desc: "TUBO ROSCAVEL PVC 1.1/4\" (10466) AMANCO", stock: "3,620", pending: null, debit: "R$ 218,99", credit: "R$ 229,19" },
    { cod: "00006", desc: "TUBO ROSCAVEL PVC 1.1/2\" (10467) AMANCO", stock: "4,620", pending: null, debit: "R$ 286,99", credit: "R$ 300,36" },
    { cod: "00007", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 1/2\" (11474) AMANCO", stock: "4,000", pending: "+20", debit: "R$ 17,99", credit: "R$ 18,83" },
    { cod: "00008", desc: "TUBO ROSCAVEL PVC 2\" (10468) AMANCO", stock: "5,000", pending: null, debit: "R$ 427,99", credit: "R$ 447,93" },
    { cod: "00009", desc: "TUBO ROSCAVEL PVC 2 1/2\"", stock: "0,000", pending: null, debit: "R$ 133,76", credit: "R$ 139,99" },
    { cod: "00010", desc: "TUBO ROSCAVEL PVC 3\"", stock: "0,000", pending: null, debit: "R$ 231,75", credit: "R$ 242,55" },
    { cod: "00011", desc: "TUBO ROSCAVEL PVC 4\"", stock: "0,000", pending: null, debit: "R$ 260,92", credit: "R$ 273,08" },
    { cod: "00012", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 1\" (11475) AMANCO", stock: "3,000", pending: "+20", debit: "R$ 30,99", credit: "R$ 32,43" },
  ];

  const filteredProducts = products.filter(p => 
    p.desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.cod.includes(searchTerm)
  );

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">Produtos</h2>
        <div className="flex items-center gap-4">
          <div className="relative group min-w-[320px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar produtos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-secondary/20 border border-border/40 rounded-xl pl-12 pr-4 py-2.5 text-xs font-semibold outline-none focus:border-primary/50 focus:bg-background/50 transition-all placeholder:text-muted-foreground/40" 
            />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border/50 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col mb-4">
        <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide py-1">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-card/50 backdrop-blur-md border-b border-border/30">
                <th className="px-10 py-5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Cód.</th>
                <th className="px-10 py-5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Descrição</th>
                <th className="px-10 py-5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-center">Estoque/Pendente</th>
                <th className="px-10 py-5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-right">Débito</th>
                <th className="px-10 py-5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] text-right">Crédito 3x</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {filteredProducts.map((p, i) => (
                <tr key={i} className="hover:bg-primary/[0.02] transition-colors group">
                  <td className="px-10 py-4.5 text-[11px] font-black text-muted-foreground/40">{p.cod}</td>
                  <td className="px-10 py-4.5 text-[11px] font-black text-foreground uppercase tracking-tight">{p.desc}</td>
                  <td className="px-10 py-4.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span className="bg-secondary/40 text-[10px] font-black px-4 py-1.5 rounded-full border border-border/50 text-foreground/70 min-w-[70px]">
                        {p.stock}
                      </span>
                      {p.pending && (
                        <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-full border border-blue-500/20">
                          <ShoppingCart className="w-3 h-3" />
                          <span className="text-[10px] font-black">{p.pending}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-10 py-4.5 text-right font-black text-[11px] text-emerald-500">{p.debit}</td>
                  <td className="px-10 py-4.5 text-right font-black text-[11px] text-amber-500/80">{p.credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
