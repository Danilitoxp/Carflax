import { ProdutosView } from "@/components/dashboard/products/ProdutosView";
import { AnalyticsView } from "./analytics/AnalyticsView";
import { CampanhasView } from "./campanhas/CampanhasView";
import { OrcamentosView } from "./orcamentos/OrcamentosView";
import { RelatoriosView } from "./relatorios/RelatoriosView";
import { LigacoesView } from "@/components/crm/ligacoes/LigacoesView";
import { ClientesFRVView } from "./clientes/ClientesFRVView";
import { cn } from "@/lib/utils";

interface CrmSectionProps {
  activeTab: string;
  userProfile?: any;
}

export function CrmSection({ activeTab, userProfile }: CrmSectionProps) {
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
          ) : activeTab === "Clientes" ? (
            <ClientesFRVView />
          ) : activeTab === "Campanhas" ? (
            <div className="h-full overflow-y-auto scrollbar-hide">
              <CampanhasView userProfile={userProfile} />
            </div>
          ) : activeTab === "Ligações" ? (
            <div className="h-full overflow-y-auto scrollbar-hide">
              <LigacoesView />
            </div>
          ) : activeTab === "Relatórios" ? (
            <RelatoriosView orcamentos={[]} userProfile={userProfile} />
          ) : (
            <OrcamentosView userProfile={userProfile} />
          )}
        </div>
      </div>
    </div>
  );
}
