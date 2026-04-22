import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationProvider } from "@/components/ui/NotificationProvider";
import { ThemeProvider } from "@/context/theme-provider";
import { AppSidebar } from "@/components/ui/AppSidebar";
import { ChatModal } from "@/components/ui/ChatModal";
import { supabase } from "@/lib/supabase";
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
import { type CrmItem } from "@/lib/api";
import { type CrmConversa } from "@/lib/crm-service";
import { GeralView } from "@/components/dashboard/Geral/GeralView";
import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { SugestaoModal } from "@/components/sugestao";
import { ColetorView } from "@/components/coletor/ColetorView";
import { EntregasView } from "@/components/entregas";
import { MotoristaView } from "@/components/entregas/motorista/MotoristaView";
import { UsersView } from "@/components/users/UsersView";
import { LoginView } from "@/components/auth/LoginView";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { OrgChartView } from "@/components/ui/OrgChartModal";
import { SqlRunnerView } from "@/components/admin/SqlRunnerView";
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
  permissions?: string[];
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
  const [activeItem, setActiveItem] = useState(() => {
    return localStorage.getItem("carflax-active-section") || "Geral";
  });
  const [isSugestaoModalOpen, setIsSugestaoModalOpen] = useState(false);
  const [geralLoading, setGeralLoading] = useState(true);

  useEffect(() => {
    if (activeItem === "Geral") {
      // Usar setTimeout para evitar renderização em cascata síncrona
      const startTimer = setTimeout(() => setGeralLoading(true), 0);
      const endTimer = setTimeout(() => setGeralLoading(false), 500);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    }

    const role = userProfile?.role?.toUpperCase();
    const isVendedorRole = role === "VENDEDOR";
    const sellerAllowedItems = [
      "Geral", "Produtos", "Calendário", "Eventos", "Férias", 
      "Orçamentos", "Campanhas", "Relatórios", "Coletor", "Painel Coletor",
      "Entregas", "Romaneios", "Concluídas", 
      "Sugestões", "Meu Perfil", "Notificações", "Segurança", "Aparência"
    ];

    const isPublic = [
      "Geral", "Dashboard", "Meu Perfil", "Notificações", 
      "Segurança", "Aparência", "Organograma", "Sugestões", 
      "Relatórios", "Coletor", "Painel Coletor"
    ].includes(activeItem);

    const hasPermission = userProfile?.permissions?.includes(activeItem) || (isVendedorRole && sellerAllowedItems.includes(activeItem));

    if (!isPublic && !hasPermission && activeItem !== "Geral") {
      console.warn(`[Security] Acesso negado para: ${activeItem}. Redirecionando para Geral.`);
      setTimeout(() => {
        setActiveItem("Geral");
        localStorage.setItem("carflax-active-section", "Geral");
      }, 0);
    }
  }, [activeItem, userProfile?.permissions, userProfile?.role]);

  // ── Sincronização Global do Chat (Realtime) ───────────────────────────
  // Chat Multijanelas
  interface ActiveChat {
    id: number;
    doc: string;
    title: string;
    sellerName?: string;
    sellerCode?: string;
    items?: CrmItem[];
  }
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  
  // Reset de estado durante o render ao trocar de usuário (Recomendado pelo React 18+)
  const [prevUserId, setPrevUserId] = useState(userProfile?.id);
  if (userProfile?.id !== prevUserId) {
    setPrevUserId(userProfile?.id);
    setActiveChats([]);
  }

  const [isCentralizer, setIsCentralizer] = useState(false);
  const initialCheckPerformed = useRef(false);

  // 1. Cache Global de Usuários (Preload similar ao CRM Legado)
  useEffect(() => {
    if (!userProfile?.id) return;
    
    async function preloadUsers() {
      try {
        const { data } = await supabase.from("usuarios").select("id, name, avatar");
        if (data) {
          const cache: Record<string, { id: string; name: string; avatar: string | null }> = {};
          data.forEach(u => cache[u.id] = u);
          (window as unknown as { _carflaxUserCache: typeof cache })._carflaxUserCache = cache;
        }
      } catch (e) {
        console.error("[CRM] Falha ao carregar cache de usuários:", e);
      }
    }
    
    preloadUsers();
  }, [userProfile?.id]);

  // 0. Permissão para Notificações do Navegador
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, []);

  // 2. Realtime e Verificação Inicial
  const isCentRef = useRef(false);

  useEffect(() => {
    if (!userProfile?.id) return;

    // Função para inicializar sessão e identidade
    async function initSession() {
      try {
        const { data: config } = await supabase.from("crm_config").select("value").eq("key", "centralizer_user_id").maybeSingle();
        const isCent = config?.value === userProfile?.id;
        isCentRef.current = isCent;
        setIsCentralizer(isCent);
      } catch (e) {
        console.error("[CRM] Erro ao resolver identidade:", e);
      }
    }

    initSession();

    // Listener de Mensagens
    const channelName = `global_crm_${userProfile.id}`;
    const channel = supabase.channel(channelName);
    
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_conversas' }, (payload) => {
        const newMsg = payload.new as CrmConversa;
        if (newMsg.enviado_por === userProfile?.id) return;

        // USA O REF que é atualizado pelo initSession
        const isForMe = newMsg.destino === userProfile?.id || (isCentRef.current && newMsg.destino === "todos");
        
        if (isForMe) {
          const isSystem = newMsg.enviado_por_nome?.toUpperCase() === "SISTEMA";
          let resolvedSellerName = newMsg.enviado_por_nome;
          let displayTitle = isSystem ? `Aviso: #${newMsg.documento}` : `Mensagem de ${newMsg.enviado_por_nome}`;

          if (isSystem && newMsg.obs) {
            const vMatch = newMsg.obs.match(/Vendedor:.*?\*?\s*(.*?)(?:\n|$)/i);
            if (vMatch) {
              resolvedSellerName = vMatch[1].replace(/\*/g, "").trim();
              displayTitle = `Divergência: ${resolvedSellerName}`;
            }
          }
          
          setActiveChats(prev => {
            // Verifica se este chat já está aberto
            if (prev.some(c => c.doc === newMsg.documento)) return prev;
            return [...prev, {
              id: Date.now(),
              doc: newMsg.documento,
              title: displayTitle,
              sellerName: resolvedSellerName,
              sellerCode: undefined
            }];
          });

          // Notificação Nativa (Chrome/Edge/Safari)
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              try {
                new Notification(displayTitle, {
                  body: newMsg.obs || "Nova mensagem recebida",
                  icon: "/favicon.svg", // Certifique-se que este arquivo existe em /public
                  tag: "carflax-chat-msg",
                  silent: false
                });
              } catch (err) {
                console.error("[CRM] Erro ao disparar notificação:", err);
              }
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission();
            }
          }

          try { 
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {}); 
          } catch { /* silêncio */ }
        }
      })
      .subscribe();

    // Verificação Inicial de Mensagens não lidas (Apenas uma vez ao carregar)
    if (!initialCheckPerformed.current) {
      initialCheckPerformed.current = true;
      supabase
        .from("crm_conversas")
        .select("*")
        .eq("destino", userProfile.id)
        .eq("lida", false)
        .order("timestamp", { ascending: false })
        .limit(1)
        .then(({ data: unread }) => {
          if (unread && unread.length > 0) {
            const msg = unread[0];
            const isSystem = msg.enviado_por_nome?.toUpperCase() === "SISTEMA";
            let resolvedSellerName = msg.enviado_por_nome;
            let displayTitle = isSystem ? `Aviso: #${msg.documento}` : `Mensagem pendente: ${msg.enviado_por_nome}`;

            if (isSystem && msg.obs) {
              const vMatch = msg.obs.match(/Vendedor:.*?\*?\s*(.*?)(?:\n|$)/i);
              if (vMatch) {
                resolvedSellerName = vMatch[1].replace(/\*/g, "").trim();
                displayTitle = `Pendente: ${resolvedSellerName}`;
              }
            }

            setActiveChats(prev => {
              if (prev.some(c => c.doc === msg.documento)) return prev;
              return [...prev, {
                id: Date.now(),
                doc: msg.documento,
                title: displayTitle,
                sellerName: resolvedSellerName,
                sellerCode: undefined
              }];
            });
          }
        });
    }

    const handleOpenChat = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        const isSystem = detail.title?.toUpperCase() === "SISTEMA" || detail.sellerName?.toUpperCase() === "SISTEMA";
        const resolvedSellerName = detail.sellerName;
        const displayTitle = isSystem ? `Aviso: #${detail.doc}` : detail.title;

        // Se for sistema, tentamos descobrir o vendedor real se houver contexto (itens ou mensagens anteriores)
        // No caso do open-crm-chat manual do OrcamentosView, o sellerName já vem preenchido.
        
        setActiveChats(prev => {
          if (prev.some(c => c.doc === detail.doc)) return prev;
          return [...prev, {
            id: Date.now(),
            doc: detail.doc,
            title: displayTitle,
            sellerName: resolvedSellerName,
            sellerCode: detail.sellerCode,
            items: detail.items
          }];
        });
      }
    };
    window.addEventListener('open-crm-chat', handleOpenChat);

    return () => { 
      supabase.removeChannel(channel);
      window.removeEventListener('open-crm-chat', handleOpenChat);
    };
  }, [userProfile?.id]);

  const handleActiveItemChange = (item: string) => {
    if (item === "Sugestões") {
      setIsSugestaoModalOpen(true);
    } else {
      setActiveItem(item);
      localStorage.setItem("carflax-active-section", item);
    }
  };

  const isDashboardView = ["Geral", "Performance", "Campanhas", "Dashboard", "Orçamentos", "Ligações"].includes(activeItem);
  const isSettingsView = ["Configurações", "Meu Perfil", "Config. Orçamentos", "Notificações", "Segurança", "Aparência", "Banners"].includes(activeItem);
  const isCrmView = ["Orçamentos", "CRM", "Produtos", "Campanhas", "Ligações", "Relatórios"].includes(activeItem);
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
        userProfile={userProfile || undefined}
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
            <CalendarSection activeTab={activeItem} userProfile={userProfile} />
          ) : isSettingsView ? (
            <SettingsSection externalTab={activeItem} userProfile={userProfile} />
          ) : isCrmView ? (
            <CrmSection activeTab={activeItem} userProfile={userProfile} />
          ) : ["Entregas", "Romaneios", "Concluídas"].includes(activeItem) ? (
            <EntregasView activeTab={activeItem} userProfile={userProfile} />
          ) : ["Coletor", "Painel Coletor"].includes(activeItem) ? (
            <div className="p-6 pt-4 h-full overflow-y-auto scrollbar-hide">
              <ColetorView />
            </div>
          ) : activeItem === "Usuários" ? (
            <div className="p-6 pt-4 h-full overflow-y-auto scrollbar-hide">
              <UsersView />
            </div>
          ) : activeItem === "DB Admin" ? (
            <SqlRunnerView />
          ) : activeItem === "Geral" ? (
            <GeralView userProfile={userProfile || undefined} loading={geralLoading} />
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
                <SalesMetricsCard userProfile={userProfile || undefined} data={vendedorMetrics || undefined} loading={geralLoading} />
              ) : (
                <>
                  <EmployeeOfMonthCard loading={geralLoading} />
                  <UpcomingEventsCard loading={geralLoading} />
                </>
              )}
              
              <BirthdayList loading={geralLoading} />
            </div>
          </div>
        )}
      </main>

        <SugestaoModal 
          isOpen={isSugestaoModalOpen} 
          onClose={() => setIsSugestaoModalOpen(false)} 
        />

        {/* Chat Multijanelas */}
        <div className="fixed bottom-0 right-0 z-[9999] flex flex-row-reverse gap-4 p-4 pointer-events-none">
          {activeChats.map((chat) => (
            <div key={chat.doc || chat.id} className="pointer-events-auto">
              <ChatModal
                isOpen={true}
                onClose={() => setActiveChats(prev => prev.filter(c => c.doc !== chat.doc))}
                documento={chat.doc}
                empresa="001"
                title={chat.title}
                userProfile={userProfile || undefined}
                sellerName={chat.sellerName}
                sellerCode={chat.sellerCode}
                itemsInitial={chat.items}
                amICentralizer={isCentralizer}
              />
            </div>
          ))}
        </div>
    </div>
  );
}


function App() {
  const [session, setSession] = useState<unknown>(null); // From Supabase Auth
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vendedorMetrics, setVendedorMetrics] = useState<VendedorResumo | null>(null);

  const fetchVendedorMetrics = useCallback(async (profile: UserProfile) => {
    try {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dataStr = `${yyyy}-${mm}-${dd}`;
      
      const { apiDashboardGeral } = await import("@/lib/api");
      
      const role = profile.role?.toUpperCase() || "";
      const isManager = role.includes("GERENTE") || role === "ADMIN";
      const codVendedor = profile.operator_code || profile.operatorCode || "049";

      // Se for gerente, buscamos tudo (omitindo o código do vendedor)
      // Senão, buscamos apenas o dele
      const response = await apiDashboardGeral(isManager ? undefined : codVendedor, dataStr);
      
      if (response && response.length > 0) {
        if (isManager && response.length > 1) {
          // Agrega os dados de todos os vendedores
          const aggregated: VendedorResumo = {
            COD_VENDEDOR: "TOTAL",
            NOME_VENDEDOR: "TOTAL GERAL",
            META: response.reduce((acc, r) => acc + Number(r.META || 0), 0),
            FATURADO: response.reduce((acc, r) => acc + Number(r.FATURADO || 0), 0),
            EM_ABERTO: response.reduce((acc, r) => acc + Number(r.EM_ABERTO || 0), 0),
            TOTAL: response.reduce((acc, r) => acc + Number(r.TOTAL || 0), 0),
            FALTANTE: response.reduce((acc, r) => acc + Number(r.FALTANTE || 0), 0),
            TOTAL_VENDIDO_HOJE: response.reduce((acc, r) => acc + Number(r.TOTAL_VENDIDO_HOJE || 0), 0),
            QTD_VENDAS: response.reduce((acc, r) => acc + Number(r.QTD_VENDAS || 0), 0),
            QTD_ORCAMENTOS: response.reduce((acc, r) => acc + Number(r.QTD_ORCAMENTOS || 0), 0),
            ORC_FECHADOS: response.reduce((acc, r) => acc + Number(r.ORC_FECHADOS || 0), 0),
            PRAZO_MEDIO_DIAS: response.reduce((acc, r) => acc + Number(r.PRAZO_MEDIO_DIAS || 0), 0) / response.length,
            TICKET_MEDIO: 0,
            TAXA_CONVERSAO: 0,
            dias_trabalhados: response[0].dias_trabalhados 
          };

          // Cálculos derivados
          aggregated.TICKET_MEDIO = aggregated.QTD_VENDAS > 0 ? Number(aggregated.TOTAL) / aggregated.QTD_VENDAS : 0;
          aggregated.TAXA_CONVERSAO = Number(aggregated.QTD_ORCAMENTOS) > 0 
            ? (Number(aggregated.ORC_FECHADOS) / Number(aggregated.QTD_ORCAMENTOS)) * 100 
            : 0;

          setVendedorMetrics(aggregated);
        } else {
          const myData = response.find((r: VendedorResumo) => r.COD_VENDEDOR === codVendedor) || response[0];
          setVendedorMetrics(myData);
        }
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
        fetchVendedorMetrics(data);
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

  const isMotoristaRoute = window.location.pathname.includes("/motorista") || window.location.search.includes("v=");

  if (isMotoristaRoute) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="carflax-theme">
        <NotificationProvider>
          <MotoristaView />
        </NotificationProvider>
      </ThemeProvider>
    );
  }

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
