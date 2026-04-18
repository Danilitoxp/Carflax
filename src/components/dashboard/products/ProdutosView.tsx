import { useState } from "react";
import { 
  Search, 
  ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ProdutosView() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const products = [
    { cod: "00001", desc: "TUBO ROSCAVEL PVC 3/4\" (10464) AMANCO", stock: 20.130, debit: 92.99, credit: 97.32, brand: "AMANCO" },
    { cod: "00002", desc: "TUBO ROSCAVEL PVC 1/2\" (10463) AMANCO", stock: 144.720, debit: 68.99, credit: 72.20, brand: "AMANCO" },
    { cod: "00003", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 3/4 (11477) AMANCO", stock: 1.000, debit: 22.99, credit: 24.05, brand: "AMANCO" },
    { cod: "00004", desc: "TUBO ROSCAVEL PVC 1\" (10465) AMANCO", stock: 11.760, debit: 183.99, credit: 192.56, brand: "AMANCO" },
    { cod: "00005", desc: "TUBO ROSCAVEL PVC 1.1/4\" (10466) AMANCO", stock: 3.620, debit: 218.99, credit: 229.19, brand: "AMANCO" },
    { cod: "00006", desc: "TUBO ROSCAVEL PVC 1.1/2\" (10467) AMANCO", stock: 4.620, debit: 286.99, credit: 300.36, brand: "AMANCO" },
    { cod: "00007", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 1/2\" (11474) AMANCO", stock: 4.000, debit: 17.99, credit: 18.83, brand: "AMANCO" },
    { cod: "00008", desc: "TUBO ROSCAVEL PVC 2\" (10468) AMANCO", stock: 5.000, debit: 427.99, credit: 447.93, brand: "AMANCO" },
    { cod: "00009", desc: "TUBO ROSCAVEL PVC 2 1/2\"", stock: 0.000, debit: 133.76, credit: 139.99, brand: "AMANCO" },
    { cod: "00010", desc: "TUBO ROSCAVEL PVC 3\"", stock: 0.000, debit: 231.75, credit: 242.55, brand: "AMANCO" },
    { cod: "00011", desc: "TUBO ROSCAVEL PVC 4\"", stock: 0.000, debit: 260.92, credit: 273.08, brand: "AMANCO" },
    { cod: "00012", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 1\" (11475) AMANCO", stock: 3.000, debit: 30.99, credit: 32.43, brand: "AMANCO" },
    { cod: "00013", desc: "JOELHO 90 PVC MARROM 25MM TIGRE", stock: 45.000, debit: 1.50, credit: 1.65, brand: "TIGRE" },
    { cod: "00014", desc: "TE 90 PVC MARROM 25MM TIGRE", stock: 32.000, debit: 2.10, credit: 2.30, brand: "TIGRE" },
    { cod: "00015", desc: "LUVA PVC MARROM 25MM TIGRE", stock: 120.000, debit: 0.95, credit: 1.10, brand: "TIGRE" },
    { cod: "00016", desc: "ADAPTADOR PVC MARROM 25MM X 3/4 TIGRE", stock: 50.000, debit: 1.25, credit: 1.40, brand: "TIGRE" },
    { cod: "00017", desc: "COLA PVC FRASCO 175G TIGRE", stock: 15.000, debit: 18.90, credit: 20.50, brand: "TIGRE" },
    { cod: "00018", desc: "FITA VEDA ROSCA 18MM X 25M TIGRE", stock: 25.000, debit: 6.50, credit: 7.20, brand: "TIGRE" },
    { cod: "00019", desc: "REGISTRO ESFERA VS 25MM TIGRE", stock: 8.000, debit: 12.40, credit: 13.80, brand: "TIGRE" },
    { cod: "00020", desc: "TUBO ESGOTO SN 100MM TIGRE (METRO)", stock: 60.000, debit: 15.30, credit: 17.10, brand: "TIGRE" },
    { cod: "00021", desc: "JOELHO 90 ESGOTO 100MM TIGRE", stock: 22.000, debit: 5.80, credit: 6.40, brand: "TIGRE" },
    { cod: "00022", desc: "TE ESGOTO 100MM TIGRE", stock: 14.000, debit: 9.20, credit: 10.20, brand: "TIGRE" },
    { cod: "00023", desc: "CAIXA SIFONADA 150X150X50 TIGRE", stock: 5.000, debit: 34.50, credit: 38.00, brand: "TIGRE" },
    { cod: "00024", desc: "RALO LINEAR 50CM TIGRE", stock: 3.000, debit: 89.90, credit: 98.00, brand: "TIGRE" },
    { cod: "00025", desc: "TORNEIRA COZINHA PAREDE DECA", stock: 10.000, debit: 145.00, credit: 160.00, brand: "DECA" },
    { cod: "00026", desc: "DUCHA HIGIENICA DECA", stock: 7.000, debit: 189.00, credit: 210.00, brand: "DECA" },
    { cod: "00027", desc: "VALVULA DESCARGA HYDRA MAX DECA", stock: 4.000, debit: 245.00, credit: 275.00, brand: "DECA" },
    { cod: "00028", desc: "ASSENTO SANITARIO LIFT DECA", stock: 12.000, debit: 78.00, credit: 86.00, brand: "DECA" },
    { cod: "00029", desc: "MISTURADOR LAVATORIO DECA", stock: 2.000, debit: 450.00, credit: 500.00, brand: "DECA" },
    { cod: "00030", desc: "PAPELEIRA DE PAREDE DECA", stock: 15.000, debit: 45.00, credit: 52.00, brand: "DECA" },
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
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 min-h-0">
        <div className="bg-white border border-border rounded-lg shadow-sm h-full flex flex-col overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-2">CÓDIGO <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">DESCRIÇÃO</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">MARCA</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">ESTOQUE</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">DÉBITO</th>
                  <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">CRÉDITO 3X</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProducts.map((p, i) => (
                  <tr key={i} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-4 text-xs font-bold text-muted-foreground">{p.cod}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground line-clamp-1">{p.desc}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-widest leading-none">
                        {p.brand}
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
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-bold text-emerald-600">
                        R$ {p.debit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs font-bold text-amber-600">
                        R$ {p.credit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
        </div>
      </div>
    </div>
  );
}
