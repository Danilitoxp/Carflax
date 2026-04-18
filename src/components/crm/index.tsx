import { ProdutosView } from "@/components/dashboard/products/ProdutosView";
import { AnalyticsView } from "./analytics/AnalyticsView";
import { CampanhasView } from "./campanhas/CampanhasView";
import { OrcamentosView } from "./orcamentos/OrcamentosView";
import { cn } from "@/lib/utils";

interface CrmSectionProps {
  activeTab: string;
}

export function CrmSection({ activeTab }: CrmSectionProps) {
  return (
    <div className={cn(
      "flex flex-col h-full bg-[#F8FAFC] overflow-hidden p-0",
    )}>
      <div className="w-full h-full flex flex-col">
        <div className="flex-1 min-h-0">
          {activeTab === "Analytics" ? (
            <div className="h-full overflow-y-auto scrollbar-hide py-4">
              <AnalyticsView />
            </div>
          ) : activeTab === "Produtos" ? (
            <ProdutosView />
          ) : activeTab === "Campanhas" ? (
            <div className="h-full overflow-y-auto scrollbar-hide">
              <CampanhasView />
            </div>
          ) : (
            <OrcamentosView />
          )}
        </div>
      </div>
    </div>
  );
}
