import { useState, useMemo, useEffect } from "react";
import {
  Search,
  ArrowUpDown,
  Tag,
  ChevronUp,
  ChevronDown,
  Printer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import { TinyLoader } from "@/components/ui/TinyLoader";
import { apiDashboardProdutos, type ProductInfo } from "@/lib/api";

interface Product {
  cod: string;
  desc: string;
  stock: number;
  sales: number;
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
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product; direction: 'asc' | 'desc' } | null>({ key: 'cod', direction: 'asc' });

  const requestSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setVisibleCount(50);
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const response = await apiDashboardProdutos();
        
        if (response && response.length > 0) {
          const mapped = response.map((p: ProductInfo) => {
            const precoVenda = typeof p.PRECO_VENDA === 'string' ? parseFloat(p.PRECO_VENDA) : Number(p.PRECO_VENDA || 0);
            return {
              cod: p.COD_ITEM,
              desc: p.DESCRICAO,
              stock: typeof p.TOTAL_DISPONIVEL === 'string' ? parseFloat(p.TOTAL_DISPONIVEL) : Number(p.TOTAL_DISPONIVEL || 0),
              sales: typeof p.TOTAL_VENDIDO === 'string' ? parseFloat(p.TOTAL_VENDIDO) : Number(p.TOTAL_VENDIDO || 0),
              debit: precoVenda,
              credit: precoVenda * 1.0466,
              brand: p.MARCA || "GERAL",
              location: "---"
            };
          }).filter((p) => p.cod !== "99999")
            .sort((a, b) => Number(a.cod) - Number(b.cod));
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

  const filteredProducts = useMemo(() => {
    const filtered = products.filter(p => {
      const searchLower = searchTerm.trim().toLowerCase();
      const words = searchLower.split(/\s+/).filter(Boolean);
      
      const matchesSearch = words.length === 0 || 
        words.every(word => p.desc.toLowerCase().includes(word)) || 
        p.cod.toLowerCase().includes(searchLower);

      const matchesBrand = filterBrand === "Todas as Marcas" || p.brand === filterBrand;
      const matchesStock = filterStock === "TODOS" ||
        (filterStock === "COM ESTOQUE" && p.stock > 0) ||
        (filterStock === "SEM ESTOQUE" && p.stock <= 0);

      return matchesSearch && matchesBrand && matchesStock;
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const key = sortConfig.key;
        const dir = sortConfig.direction;
        
        if (key === 'cod') {
          return dir === 'asc' ? Number(a.cod) - Number(b.cod) : Number(b.cod) - Number(a.cod);
        }
        
        const valA = a[key];
        const valB = b[key];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return dir === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return dir === 'asc' ? -1 : 1;
        if (strA > strB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [products, searchTerm, filterBrand, filterStock, sortConfig]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 100) {
      if (visibleCount < filteredProducts.length) {
        setVisibleCount(prev => prev + 50);
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permita pop-ups para imprimir o inventário.");
      return;
    }

    // Filter products dynamically in the print action to ensure we use the absolute latest state
    const searchLower = searchTerm.trim().toLowerCase();
    const words = searchLower.split(/\s+/).filter(Boolean);

    const itemsToPrint = products.filter(p => {
      const matchesSearch = words.length === 0 || 
        words.every(word => p.desc.toLowerCase().includes(word)) || 
        p.cod.toLowerCase().includes(searchLower);

      const matchesBrand = filterBrand === "Todas as Marcas" || p.brand === filterBrand;
      const matchesStock = filterStock === "TODOS" ||
        (filterStock === "COM ESTOQUE" && p.stock > 0) ||
        (filterStock === "SEM ESTOQUE" && p.stock <= 0);

      return matchesSearch && matchesBrand && matchesStock;
    });

    // Sort itemsToPrint if needed
    if (sortConfig !== null) {
      itemsToPrint.sort((a, b) => {
        const key = sortConfig.key;
        const dir = sortConfig.direction;
        
        if (key === 'cod') {
          return dir === 'asc' ? Number(a.cod) - Number(b.cod) : Number(b.cod) - Number(a.cod);
        }
        
        const valA = a[key];
        const valB = b[key];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return dir === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return dir === 'asc' ? -1 : 1;
        if (strA > strB) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const rowsHtml = itemsToPrint.map(p => `
      <tr style="page-break-inside: avoid; break-inside: avoid;">
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px; font-weight: bold; color: #1e293b;">${p.cod}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 500; color: #0f172a; text-transform: uppercase;">${p.desc}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; text-align: right; color: #334155;">${p.stock.toFixed(3)}</td>
        <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0; border-left: 1px solid #e2e8f0; width: 140px; background-color: #fafafa;"></td>
      </tr>
    `).join("");

    const activeFilters = [
      filterBrand !== "Todas as Marcas" ? `Marca: ${filterBrand}` : "",
      filterStock !== "TODOS" ? `Estoque: ${filterStock}` : "",
      searchTerm ? `Busca: "${searchTerm}"` : ""
    ].filter(Boolean).join(" | ") || "Nenhum";

    const pageHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventário - Carflax HUB</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #1e293b;
              margin: 30px;
              line-height: 1.5;
            }
            header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 20px;
            }
            .header-top {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
            }
            h1 {
              font-size: 20px;
              font-weight: 800;
              margin: 0;
              color: #0f172a;
              letter-spacing: -0.5px;
            }
            .brand-subtitle {
              font-size: 10px;
              font-weight: 700;
              color: #2563eb;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              margin-bottom: 4px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin-top: 12px;
              font-size: 11px;
              background-color: #f8fafc;
              padding: 10px 14px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .meta-item strong {
              color: #475569;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f1f5f9;
              color: #475569;
              padding: 8px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #cbd5e1;
              border-top: 1px solid #e2e8f0;
            }
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #475569;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .signature-box {
              width: 45%;
              border-top: 1px solid #cbd5e1;
              text-align: center;
              padding-top: 8px;
              margin-top: 30px;
            }
            @media print {
              body {
                margin: 0;
                color: #000;
              }
              .meta-grid {
                background-color: transparent !important;
                border-color: #cbd5e1;
              }
              th {
                background-color: #f1f5f9 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              td {
                border-bottom-color: #cbd5e1 !important;
              }
            }
          </style>
        </head>
        <body>
          <header>
            <div class="brand-subtitle">Carflax HUB</div>
            <div class="header-top">
              <h1>Folha de Inventário de Produtos</h1>
              <div style="font-size: 10px; color: #64748b; text-align: right;">
                Página 1 de 1
              </div>
            </div>
            <div class="meta-grid">
              <div class="meta-item"><strong>Filtros ativos:</strong> ${activeFilters}</div>
              <div class="meta-item"><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</div>
              <div class="meta-item" style="text-align: right;"><strong>Total de Itens:</strong> ${itemsToPrint.length}</div>
            </div>
          </header>
          <table>
            <thead>
              <tr>
                <th style="width: 15%; text-align: left;">Código</th>
                <th style="width: 50%; text-align: left;">Descrição do Item</th>
                <th style="width: 15%; text-align: right;">Saldo Atual</th>
                <th style="width: 20%; text-align: center; border-left: 1px solid #cbd5e1;">Qtd. Contada</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="signature-section">
            <div class="signature-box">
              Assinatura do Responsável pela Contagem
            </div>
            <div class="signature-box">
              Visto / Conferência de Lançamento
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(pageHtml);
    printWindow.document.close();
  };

  return (
    <div className="flex-1 flex flex-col gap-4 pt-4 pb-6 px-6 overflow-hidden h-full max-h-screen bg-background">
      {/* TINY TOOLBAR */}
      <div className="flex flex-col gap-3 shrink-0">
        
        {/* SEARCH & FILTERS */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setVisibleCount(50); // Reset count on search
              }}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-foreground outline-none focus:border-blue-600/50 transition-all placeholder:text-muted-foreground/30 shadow-sm"
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

          <div className="flex bg-card rounded-xl border border-border p-1 shadow-sm">
            {["TODOS", "COM ESTOQUE", "SEM ESTOQUE"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilterStock(s);
                  setVisibleCount(50); // Reset count on stock filter
                }}
                className={cn(
                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border",
                  filterStock === s
                    ? "bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-600/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 border-transparent"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            title="Imprimir Folha de Inventário"
            className="flex items-center justify-center p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all shadow-sm group shrink-0"
          >
            <Printer className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
          </button>
        </div>
      </div>

      {/* PRODUCTS TABLE CONTAINER */}
      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col relative">
        <div 
          className="flex-1 overflow-y-auto scrollbar-hide"
          onScroll={handleScroll}
        >
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-secondary/50 backdrop-blur-md border-b border-border">
              <tr>
                {[
                  { id: "cod", label: "CÓDIGO", align: "left" },
                  { id: "desc", label: "DESCRIÇÃO", align: "left" },
                  { id: "brand", label: "MARCA", align: "center" },
                  { id: "stock", label: "ESTOQUE", align: "right" },
                  { id: "debit", label: "DÉBITO", align: "right" },
                ].map((col) => (
                  <th
                    key={col.id}
                    onClick={() => requestSort(col.id as keyof Product)}
                    className={cn(
                       "py-2.5 px-6 text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-secondary/60 transition-colors",
                       col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    )}
                  >
                    <div className={cn("flex items-center gap-1.5", col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : "justify-start")}>
                      <span className="truncate">{col.label}</span>
                      <div className="shrink-0">
                        {sortConfig?.key === col.id ? (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-20 group-hover:opacity-40 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 15 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-2 w-10 bg-secondary rounded" /></td>
                    <td className="py-4 px-6"><div className="h-2 w-full max-w-[250px] bg-secondary rounded" /></td>
                    <td className="py-4 px-6"><div className="h-5 w-16 bg-secondary/50 rounded-lg mx-auto" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-2 w-12 bg-secondary rounded ml-auto" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-2 w-16 bg-secondary/50 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : (
                <>
                  {visibleProducts.map((p: Product, i) => (
                    <tr key={i} className="hover:bg-secondary/20 transition-colors group">
                      <td className="py-3 px-6 text-[10px] font-bold text-muted-foreground">{p.cod}</td>
                      <td className="py-3 px-6">
                        <span className="text-[11px] font-black text-foreground uppercase tracking-tight line-clamp-1">{p.desc}</span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 uppercase tracking-tight">
                          {p.brand}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className={cn(
                          "text-[11px] font-black tracking-tighter",
                          p.stock > 10 ? "text-foreground" : p.stock > 0 ? "text-amber-500" : "text-rose-500"
                        )}>
                          {p.stock.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span className="text-[11px] font-black text-emerald-500 dark:text-emerald-400 tracking-tighter">
                          R$ {p.debit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))}
                  
                  {visibleCount < filteredProducts.length && (
                    <tr>
                      <td colSpan={5} className="py-6">
                        <div className="flex justify-center w-full">
                          <TinyLoader size="sm" />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
