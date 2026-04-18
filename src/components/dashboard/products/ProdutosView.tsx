import { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TinyDropdown } from "@/components/ui/TinyDropdown";

export function ProdutosView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("Todas as Marcas");
  const [filterStock, setFilterStock] = useState("TODOS");

  const products = [
    { cod: "00001", desc: "TUBO ROSCAVEL PVC 3/4\" (10464) AMANCO", stock: 20.130, debit: 92.99, credit: 97.32, brand: "AMANCO" },
    { cod: "00002", desc: "TUBO ROSCAVEL PVC 1/2\" (10463) AMANCO", stock: 144.720, debit: 68.99, credit: 72.20, brand: "AMANCO" },
    { cod: "00003", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 3/4 (11477) AMANCO", stock: 1.000, debit: 22.99, credit: 24.05, brand: "AMANCO" },
    { cod: "00004", desc: "TUBO ROSCAVEL PVC 1\" (10465) AMANCO", stock: 11.760, debit: 183.99, credit: 192.56, brand: "AMANCO" },
    { cod: "00005", desc: "TUBO ROSCAVEL PVC 1.1/4\" (10466) AMANCO", stock: 3.620, debit: 218.99, credit: 229.19, brand: "AMANCO" },
    { cod: "00006", desc: "TUBO ROSCAVEL PVC 1.1/2\" (10467) AMANCO", stock: 4.620, debit: 286.99, credit: 300.36, brand: "AMANCO" },
    { cod: "00007", desc: "ADAP ROSCAVEL PVC FLANGE P/ CX D'AGUA 1/2\" (11474) AMANCO", stock: 4.000, debit: 17.99, credit: 18.83, brand: "AMANCO" },
    { cod: "00008", desc: "TUBO ROSCAVEL PVC 2\" (10468) AMANCO", stock: 5.000, debit: 427.99, credit: 447.93, brand: "AMANCO" },
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
    { cod: "00025", desc: "TORNEIRA COZINHA PAREDE DECA", stock: 10.000, debit: 145.00, credit: 160.00, brand: "DECA" },
    { cod: "00026", desc: "DUCHA HIGIENICA DECA", stock: 7.000, debit: 189.00, credit: 210.00, brand: "DECA" },
    { cod: "00027", desc: "VALVULA DESCARGA HYDRA MAX DECA", stock: 4.000, debit: 245.00, credit: 275.00, brand: "DECA" },
    { cod: "00028", desc: "ASSENTO SANITARIO LIFT DECA", stock: 12.000, debit: 78.00, credit: 86.00, brand: "DECA" },
    { cod: "00029", desc: "MISTURADOR LAVATORIO DECA", stock: 2.000, debit: 450.00, credit: 500.00, brand: "DECA" },
    { cod: "00030", desc: "PAPELEIRA DE PAREDE DECA", stock: 15.000, debit: 45.00, credit: 52.00, brand: "DECA" },
  ];

  const brands = useMemo(() => ["Todas as Marcas", ...Array.from(new Set(products.map(p => p.brand)))], [products]);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.desc.toLowerCase().includes(searchTerm.toLowerCase()) || p.cod.includes(searchTerm);
    const matchesBrand = filterBrand === "Todas as Marcas" || p.brand === filterBrand;
    const matchesStock = filterStock === "TODOS" ||
      (filterStock === "COM ESTOQUE" && p.stock > 0) ||
      (filterStock === "SEM ESTOQUE" && p.stock <= 0);

    return matchesSearch && matchesBrand && matchesStock;
  });

  return (
    <div className="flex-1 flex flex-col gap-4 pt-4 pb-6 px-6 overflow-hidden bg-[#F8FAFC]">
      {/* TINY TOOLBAR */}
      <div className="flex flex-col gap-3 shrink-0">

        {/* SEARCH & FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>

          <TinyDropdown
            value={filterBrand}
            options={brands}
            onChange={setFilterBrand}
            icon={Tag}
            variant="blue"
            placeholder="Todas as Marcas"
          />

          <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            {["TODOS", "COM ESTOQUE", "SEM ESTOQUE"].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStock(s)}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all",
                  filterStock === s
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">CÓDIGO <ArrowUpDown className="w-3 h-3" /></div>
                </th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">DESCRIÇÃO</th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">MARCA</th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">ESTOQUE</th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">DÉBITO</th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">CRÉDITO 3X</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-3 px-6 text-[10px] font-bold text-slate-400">{p.cod}</td>
                  <td className="py-3 px-6">
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{p.desc}</span>
                  </td>
                  <td className="py-3 px-6">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tight">
                      {p.brand}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <span className={cn(
                      "text-[11px] font-black tracking-tighter",
                      p.stock > 10 ? "text-slate-900" : p.stock > 0 ? "text-amber-600" : "text-rose-500"
                    )}>
                      {p.stock.toFixed(3)}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <span className="text-[11px] font-black text-emerald-600 tracking-tighter">
                      R$ {p.debit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <span className="text-[11px] font-black text-slate-900 tracking-tighter">
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
  );
}
