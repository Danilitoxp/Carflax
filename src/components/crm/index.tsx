import { ProdutosView } from "@/components/dashboard/products/ProdutosView";
import { AnalyticsView } from "./analytics/AnalyticsView";
import { CampanhasView } from "./campanhas/CampanhasView";
import { OrcamentosView } from "./orcamentos/OrcamentosView";

interface CrmSectionProps {
  activeTab: string;
}

export function CrmSection({ activeTab }: CrmSectionProps) {
  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-8 overflow-hidden">
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
