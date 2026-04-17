import { ThemeProvider } from "@/context/theme-provider";
import { AppSidebar } from "@/components/ui/AppSidebar";
import { CommunicationSection } from "@/components/dashboard/Geral/CommunicationSection";
import { CalendarSection } from "@/components/calendar";
import { SettingsSection } from "@/components/settings";
import { CrmSection } from "@/components/crm";
import {
  HighlightCard,
  SalesMetricsCard,
  BirthdayList,
} from "@/components/dashboard/Geral/RightPanelComponents";
import { GeralView } from "@/components/dashboard/Geral/GeralView";
import { LayoutGrid } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SugestaoModal } from "@/components/sugestao";
import { EntregasView } from "@/components/entregas";
import { UsersView } from "@/components/users/UsersView";
import { LoginView } from "@/components/auth/LoginView";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

function DashboardContent({ onLogout }: { onLogout: () => void }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVendedor, setIsVendedor] = useState(false); // Mock role
  const [activeItem, setActiveItem] = useState("Geral");
  const [isSugestaoModalOpen, setIsSugestaoModalOpen] = useState(false);

  const handleActiveItemChange = (item: string) => {
    if (item === "Sugestões") {
      setIsSugestaoModalOpen(true);
    } else {
      setActiveItem(item);
    }
  };

  const isDashboardView = ["Geral", "Analytics", "Performance", "Campanhas", "Dashboard", "Orçamentos"].includes(activeItem);
  const isSettingsView = ["Configurações", "Meu Perfil", "Notificações", "Segurança", "Aparência"].includes(activeItem);
  const isCrmView = ["Analytics", "Orçamentos", "CRM", "Produtos", "Campanhas"].includes(activeItem);
  const showRightPanel = false; // Reduzindo distrações como solicitado

  return (
    <div className="h-screen bg-background font-sans transition-colors duration-300 overflow-hidden flex relative">
      <AppSidebar
        activeItem={activeItem}
        onActiveItemChange={handleActiveItemChange}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        onLogout={onLogout}
      />

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main
        className={cn(
          "flex-1 flex flex-col h-screen w-full",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
          showRightPanel ? "xl:pr-80" : "pr-0",
        )}
      >
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-30">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-secondary rounded-xl text-primary transition-colors"
          >
            <LayoutGrid className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-primary tracking-tighter">CARFLAX</span>
          </div>
          <button
            onClick={() => setIsVendedor(!isVendedor)}
            className="w-10 h-10 rounded-full border border-border overflow-hidden"
          >
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Danilo"
              className="w-full h-full rounded-full"
              alt="User"
            />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-col h-full w-full mx-auto overflow-hidden">
          {["Calendário", "Eventos", "Férias"].includes(activeItem) ? (
            <CalendarSection activeTab={activeItem} />
          ) : isSettingsView ? (
            <SettingsSection externalTab={activeItem} />
          ) : isCrmView ? (
            <CrmSection activeTab={activeItem} />
          ) : ["Entregas", "Romaneios", "Concluídas"].includes(activeItem) ? (
            <EntregasView activeTab={activeItem} />
          ) : activeItem === "Usuários" ? (
            <div className="p-8 h-full overflow-y-auto scrollbar-hide">
              <UsersView />
            </div>
          ) : activeItem === "Geral" ? (
            <GeralView />
          ) : isDashboardView ? (
            <CommunicationSection />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <LayoutGrid className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-4xl font-black text-foreground mb-4 uppercase tracking-tighter">Seção: {activeItem}</h2>
                <p className="text-muted-foreground text-lg font-medium max-w-md mx-auto">
                  Esta página está em desenvolvimento e logo ocupará toda a largura da sua tela de forma dinâmica.
                </p>
              </div>
            </div>
          )}
        </div>

        {showRightPanel && (
          <div className="hidden xl:flex flex-col w-80 fixed right-0 top-0 h-screen bg-transparent py-6 pr-6 pl-0 overflow-hidden z-40">
            <button
              onClick={() => setIsVendedor(!isVendedor)}
              className="absolute top-2 right-8 text-[8px] font-bold opacity-0 hover:opacity-100 transition-opacity text-primary uppercase z-50"
            >
              Simular {isVendedor ? 'Interno' : 'Vendedor'}
            </button>
            <div className="flex-1 flex flex-col gap-3 pb-0">
              {isVendedor ? <SalesMetricsCard isCompact={isVendedor} /> : <HighlightCard />}
              <BirthdayList isCompact={isVendedor} />
            </div>
          </div>
        )}
      </main>

      <SugestaoModal 
        isOpen={isSugestaoModalOpen} 
        onClose={() => setIsSugestaoModalOpen(false)} 
      />
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    // Simulate data loading
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsLoading(false);
    }, 2000);
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="carflax-theme">
      {isLoading && <LoadingScreen />}
      
      {isAuthenticated ? (
        <DashboardContent onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <LoginView onLogin={handleLogin} />
      )}
    </ThemeProvider>
  );
}

export default App;
