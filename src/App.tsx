import { ThemeProvider } from "@/context/theme-provider";
import { AppSidebar } from "@/components/ui/AppSidebar";
import { CommunicationSection } from "@/components/dashboard/Geral/CommunicationSection";
import { CalendarSection } from "@/components/calendar";
import { SettingsSection } from "@/components/settings";
import { CrmSection } from "@/components/crm";
import {
  SalesMetricsCard,
  BirthdayList,
  UpcomingEventsCard,
  EmployeeOfMonthCard,
} from "@/components/dashboard/Geral/RightPanelComponents";
import { GeralView } from "@/components/dashboard/Geral/GeralView";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { SugestaoModal } from "@/components/sugestao";
import { EntregasView } from "@/components/entregas";
import { UsersView } from "@/components/users/UsersView";
import { LoginView } from "@/components/auth/LoginView";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { OrgChartView } from "@/components/ui/OrgChartModal";
import { type VendedorResumo } from "@/lib/api";

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department?: string;
  operator_code?: string;
  operatorCode?: string;
}

interface DashboardContentProps {
  userProfile: UserProfile | null;
  vendedorMetrics: VendedorResumo | null; 
  onLogout: () => void;
}

function DashboardContent({ 
  userProfile, 
  vendedorMetrics, 
  onLogout 
}: DashboardContentProps) {
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

  const isDashboardView = ["Geral", "Performance", "Campanhas", "Dashboard", "Orçamentos", "Ligações"].includes(activeItem);
  const isSettingsView = ["Configurações", "Meu Perfil", "Notificações", "Segurança", "Aparência", "Banners"].includes(activeItem);
  const isCrmView = ["Orçamentos", "CRM", "Produtos", "Campanhas", "Ligações"].includes(activeItem);
  const isComercial = 
    userProfile?.department === "Comercial" || 
    userProfile?.department === "Vendas" ||
    userProfile?.role?.toLowerCase().includes("vendedor") ||
    userProfile?.role?.toLowerCase().includes("venda") ||
    isVendedor;

  const showRightPanel = activeItem === "Geral"; // Mostrar para todos no dashboard principal

  return (
    <div className="h-screen bg-background font-sans transition-colors duration-300 overflow-hidden flex relative">
      <AppSidebar
        userProfile={userProfile}
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
              src={userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.name || 'Danilo'}`}
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
            <CrmSection activeTab={activeItem} userProfile={userProfile} />
          ) : ["Entregas", "Romaneios", "Concluídas"].includes(activeItem) ? (
            <EntregasView activeTab={activeItem} />
          ) : activeItem === "Usuários" ? (
            <div className="p-6 pt-4 h-full overflow-y-auto scrollbar-hide">
              <UsersView />
            </div>
          ) : activeItem === "Geral" ? (
            <GeralView userProfile={userProfile} />
          ) : activeItem === "Organograma" ? (

            <OrgChartView />
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
          <div className="hidden xl:flex flex-col w-80 fixed right-0 top-0 h-screen bg-transparent py-4 pr-6 pl-0 overflow-hidden z-40">
            <button
              onClick={() => setIsVendedor(!isVendedor)}
              className="absolute top-2 right-8 text-[8px] font-bold opacity-0 hover:opacity-100 transition-opacity text-primary uppercase z-50"
            >
              Simular {isVendedor ? 'Interno' : 'Vendedor'}
            </button>
            <div className="flex-1 flex flex-col gap-4 pb-0 overflow-y-auto scrollbar-hide">
              {isComercial ? (
                <SalesMetricsCard userProfile={userProfile} data={vendedorMetrics} />
              ) : (
                <>
                  <EmployeeOfMonthCard />
                  <UpcomingEventsCard />
                </>
              )}
              
              <BirthdayList />
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

import { NotificationProvider } from "@/components/ui/NotificationProvider";
import { supabase } from "@/lib/supabase";
import { useEffect, useState, useCallback } from "react";

function App() {
  const [session, setSession] = useState<unknown>(null); // From Supabase Auth
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vendedorMetrics, setVendedorMetrics] = useState<VendedorResumo | null>(null);

  const fetchVendedorMetrics = useCallback(async (codVendedor: string) => {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dataStr = `${yyyy}-${mm}-${dd}`;
      
      const { apiDashboardGeral } = await import("@/lib/api");
      const response = await apiDashboardGeral(codVendedor, dataStr);
      
      if (response && response.length > 0) {
        const myData = response.find((r: VendedorResumo) => r.COD_VENDEDOR === codVendedor) || response[0];
        setVendedorMetrics(myData);
      }
    } catch (error) {
      console.error("Erro ao buscar métricas:", error);
    }
  }, []);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      // 1. Tentar buscar pelo ID (vínculo direto)
      const { data: idMatches } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", uid);
      
      let data = idMatches?.[0];

      // 2. AUTO-CURA: Se não achou pelo ID, tenta pelo e-mail da sessão
      if (!data) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          console.log("[App] Perfil não achou ID, tentando por e-mail:", user.email);
          const { data: emailMatches } = await supabase
            .from("usuarios")
            .select("*")
            .eq("email", user.email);
          
          const byEmail = emailMatches?.[0];

          if (byEmail) {
            console.log("[App] Usuário achado por e-mail! Tentando sincronizar ID...");
            // Atualiza o registro antigo com o novo ID do Auth
            const { error: syncError } = await supabase
              .from("usuarios")
              .update({ id: uid })
              .eq("email", user.email);

            if (syncError) {
              console.error("[App] Erro na sincronização de ID:", syncError);
              // Mesmo se falhar o sync físico, usamos os dados do e-mail para a sessão atual
              data = { ...byEmail };
            } else {
              data = { ...byEmail, id: uid };
            }
          }
        }
      }

      if (data) {
        setProfile(data);
        const codVendedor = data.operator_code || data.operatorCode || "049";
        fetchVendedorMetrics(codVendedor);
      } else {
        // Fallback total para não travar a UI se o usuário for novo no banco
        const { data: { user } } = await supabase.auth.getUser();
        const fallbackProfile = {
          name: user?.email?.split('@')[0].toUpperCase() || "Usuário",
          email: user?.email || "",
          role: "Membro",
          avatar: ""
        };
        setProfile(fallbackProfile);
      }
    } catch (err) {
      console.error("Erro perfil:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchVendedorMetrics]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setVendedorMetrics(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  if (loading) return <LoadingScreen />;

  return (
    <ThemeProvider defaultTheme="light" storageKey="carflax-theme">
      <NotificationProvider>
        {session ? (
          <DashboardContent 
            userProfile={profile} 
            vendedorMetrics={vendedorMetrics}
            onLogout={() => supabase.auth.signOut()} 
          />
        ) : (
          <LoginView onLogin={() => {}} />
        )}
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;

