import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ArrowUpDown,
  Tag,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TinyDropdown } from "@/components/ui/TinyDropdown";

interface Product {
  cod: string;
  desc: string;
  stock: number;
  debit: number;
  credit: number;
  brand: string;
  location: string;
}

export function ProdutosView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("Todas as Marcas");
  const [filterStock, setFilterStock] = useState("TODOS");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch("https://marketing-banco-de-dados.velbav.easypanel.host/api/produtos");
        const json = await response.json();
        
        if (json.success && json.data) {
          const mapped = json.data.map((p: any) => {
            return {
              cod: p.ITE_CODITE,
              desc: p.ITE_DESITE,
              stock: parseFloat(p.TOTAL_DISPONIVEL) || 0,
              debit: parseFloat(p.PRECO_VENDA || 0) || 0,
              credit: (parseFloat(p.PRECO_VENDA || 0) || 0) * 1.0465,
              brand: p.MARCA || "OUTROS",
              location: p.ITE_LOCFIS || "---"
            };
          });
          setProducts(mapped);
        }
      } catch (error) {
        console.error("[Products] Erro ao carregar:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const brands = useMemo(() => ["Todas as Marcas", ...Array.from(new Set(products.map(p => p.brand))).sort()], [products]);

  const [visibleCount, setVisibleCount] = useState(50);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.desc.toLowerCase().includes(searchTerm.toLowerCase()) || p.cod.includes(searchTerm);
    const matchesBrand = filterBrand === "Todas as Marcas" || p.brand === filterBrand;
    const matchesStock = filterStock === "TODOS" ||
      (filterStock === "COM ESTOQUE" && p.stock > 0) ||
      (filterStock === "SEM ESTOQUE" && p.stock <= 0);

    return matchesSearch && matchesBrand && matchesStock;
  });

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredProducts.length) {
        setVisibleCount(prev => prev + 50);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 pt-4 pb-6 px-6 overflow-hidden h-full max-h-screen bg-[#F8FAFC]">
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(50); // Reset count on search
              }}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>

          <TinyDropdown
            value={filterBrand}
            options={brands}
            onChange={(val) => {
              setFilterBrand(val);
              setVisibleCount(50); // Reset count on brand filter
            }}
            icon={Tag}
            variant="blue"
            placeholder="Todas as Marcas"
          />

          <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
            {["TODOS", "COM ESTOQUE", "SEM ESTOQUE"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilterStock(s);
                  setVisibleCount(50); // Reset count on stock filter
                }}
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
        <div 
          className="flex-1 overflow-y-auto scrollbar-hide"
          onScroll={handleScroll}
        >
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin opacity-40" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando Estoque Atualizado...</p>
                    </div>
                  </td>
                </tr>
              ) : visibleProducts.map((p, i) => (
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
              
              {!loading && visibleCount < filteredProducts.length && (
                <tr>
                  <td colSpan={6} className="py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Carregando mais itens...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
