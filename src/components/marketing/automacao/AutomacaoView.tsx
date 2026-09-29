import { CampanhaEnvioPanel } from "./CampanhaEnvioPanel";

// Automação = só a campanha de café da manhã com os clientes frequentes.
// As abas de Avaliações e Café (tráfego) saíram da tela a pedido do marketing;
// o motor genérico (campanhaEnvioHandler) continua atendendo por tipo.
export function AutomacaoView() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground overflow-y-auto pt-6 md:pt-8">
      <CampanhaEnvioPanel tipo="cafe_clientes" />
    </div>
  );
}
