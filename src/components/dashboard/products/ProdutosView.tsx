import { useState } from "react";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Filter, 
  Package,
  ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ProdutosView() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const products = [
    { cod: "00001", desc: "TUBO ROSCAVEL PVC 3/4\" (10464) AMANCO", stock: 20.130, pending: 0, debit: 92.99, credit: 97.32, category: "Hidráulica" },
    { cod: "00002", desc: "TUBO ROSCAVEL PVC 1/2\" (10463) AMANCO", stock: 144.720, pending: 0, debit: 68.99, credit: 72.20, category: "Hidráulica" },
    { cod: "00003", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 3/4 (11477) AMANCO", stock: 1.000, pending: 20, debit: 22.99, credit: 24.05, category: "Hidráulica" },
    { cod: "00004", desc: "TUBO ROSCAVEL PVC 1\" (10465) AMANCO", stock: 11.760, pending: 0, debit: 183.99, credit: 192.56, category: "Hidráulica" },
    { cod: "00005", desc: "TUBO ROSCAVEL PVC 1.1/4\" (10466) AMANCO", stock: 3.620, pending: 0, debit: 218.99, credit: 229.19, category: "Hidráulica" },
    { cod: "00006", desc: "TUBO ROSCAVEL PVC 1.1/2\" (10467) AMANCO", stock: 4.620, pending: 0, debit: 286.99, credit: 300.36, category: "Hidráulica" },
    { cod: "00007", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 1/2\" (11474) AMANCO", stock: 4.000, pending: 20, debit: 17.99, credit: 18.83, category: "Hidráulica" },
    { cod: "00008", desc: "TUBO ROSCAVEL PVC 2\" (10468) AMANCO", stock: 5.000, pending: 0, debit: 427.99, credit: 447.93, category: "Hidráulica" },
    { cod: "00009", desc: "TUBO ROSCAVEL PVC 2 1/2\"", stock: 0.000, pending: 0, debit: 133.76, credit: 139.99, category: "Hidráulica" },
    { cod: "00010", desc: "TUBO ROSCAVEL PVC 3\"", stock: 0.000, pending: 0, debit: 231.75, credit: 242.55, category: "Hidráulica" },
    { cod: "00011", desc: "TUBO ROSCAVEL PVC 4\"", stock: 0.000, pending: 0, debit: 260.92, credit: 273.08, category: "Hidráulica" },
    { cod: "00012", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 1\" (11475) AMANCO", stock: 3.000, pending: 20, debit: 30.99, credit: 32.43, category: "Hidráulica" },
  ];

  const filteredProducts = products.filter(p => 
    p.desc.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.cod.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      {/* Search & Tool Bar - Streamlined */}
      <div className="p-6 pb-0 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por código ou descrição..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-border rounded-lg pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
           <div className="flex bg-white rounded-lg border border-border p-1 shadow-sm">
              <button className="px-3 py-1.5 text-[10px] font-bold bg-secondary text-primary rounded-md">TODOS</button>
              <button className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground rounded-md">COM ESTOQUE</button>
              <button className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground rounded-md">SEM ESTOQUE</button>
           </div>
           <Button className="h-10 bg-primary hover:bg-primary/90 text-white gap-2 text-[10px] font-bold px-5 rounded-lg shadow-sm shrink-0">
            <Plus className="w-4 h-4" />
            NOVO PRODUTO
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 min-h-0">
        <div className="bg-white border border-border rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-[#F9FAFB] border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <div className="flex items-center gap-2">CÓDIGO <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">DESCRIÇÃO</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">CATEGORIA</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">ESTOQUE</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">DÉBITO</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">CRÉDITO 3X</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4 text-xs font-bold text-muted-foreground">{p.cod}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground line-clamp-1">{p.desc}</span>
                        <span className="text-[10px] text-muted-foreground/60 font-medium">Marca: AMANCO</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase tracking-wider">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-xs font-bold",
                          p.stock <= 0 ? "text-rose-600" : p.stock < 5 ? "text-amber-600" : "text-foreground"
                        )}>
                          {p.stock.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                        </span>
                        {p.pending > 0 && (
                          <div className="flex items-center gap-1 text-[9px] font-bold text-blue-500 uppercase">
                            <ShoppingCart className="w-2.5 h-2.5" />
                            {p.pending} PEND.
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-bold text-foreground">
                        R$ {p.debit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-bold text-primary">
                        R$ {p.credit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Footer / Pagination */}
          <div className="px-6 py-3 border-t border-border bg-[#F9FAFB] flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider" id="products-count-label">
              Exibindo {filteredProducts.length} de {products.length} produtos
            </span>
            <div className="flex items-center gap-2">
               <Button variant="outline" className="h-8 px-3 text-[10px] font-bold rounded-md" disabled>Anterior</Button>
               <Button variant="outline" className="h-8 px-3 text-[10px] font-bold rounded-md">Próximo</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
