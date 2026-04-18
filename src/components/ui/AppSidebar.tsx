import { useState } from "react";
import {
  LayoutGrid,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Sun,
  Moon,
  Calendar,
  BarChart3,
  Megaphone,
  Truck,
  Hexagon,
  Users,
  User,
  Bell,
  ShieldCheck,
  Palette,
  Lightbulb,
  FileBadge,
  Plane,
  FileText,
  CheckCircle2,
  Image,
  type LucideIcon,
} from "lucide-react";
import organogramaIcon from "@/assets/organograma.svg";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/theme-provider";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  hasArrow?: boolean;
  isDropdown?: boolean;
  isOpen?: boolean;
  subItems?: { label: string; icon?: LucideIcon }[];
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutGrid,
    label: "Dashboard",
    isDropdown: true,
    subItems: [
      { label: "Geral", icon: LayoutGrid },
      { label: "Produtos", icon: Hexagon },
    ],
  },
  { 
    icon: Calendar, 
    label: "Calendário",
    isDropdown: true,
    subItems: [
      { label: "Eventos", icon: Calendar },
      { label: "Férias", icon: Plane },
    ]
  },
  {
    icon: BarChart3,
    label: "CRM",
    isDropdown: true,
    subItems: [
      { label: "Orçamentos", icon: FileBadge },
      { label: "Campanhas", icon: Megaphone },
    ],
  },
  {
    icon: Truck,
    label: "Entregas",
    isDropdown: true,
    subItems: [
      { label: "Romaneios", icon: FileText },
      { label: "Concluídas", icon: CheckCircle2 },
    ],
  },
  { icon: Users, label: "Usuários" },
  { icon: Lightbulb, label: "Sugestões" },
];

const settingsItems: MenuItem[] = [
  { 
    icon: Settings, 
    label: "Configurações", 
    isDropdown: true,
    subItems: [
      { label: "Meu Perfil", icon: User },
      { label: "Notificações", icon: Bell },
      { label: "Segurança", icon: ShieldCheck },
      { label: "Aparência", icon: Palette },
      { label: "Banners", icon: Image },
    ]
  },
];

interface AppSidebarProps {
  userProfile?: any;
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  activeItem: string;
  onActiveItemChange: (item: string) => void;
  onLogout: () => void;
}

export function AppSidebar({ userProfile, isCollapsed, onToggle, isMobileOpen, onMobileClose, activeItem, onActiveItemChange, onLogout }: AppSidebarProps) {
  const { theme, setTheme } = useTheme();
  const [openMenus, setOpenMenus] = useState<string[]>(["Dashboard"]);

  const userAvatar = userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.name || 'User'}`;

  const toggleMenu = (label: string) => {
    if (isCollapsed) return;
    setOpenMenus((prev) =>
      prev.includes(label) ? [] : [label]
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-white border-r border-border flex flex-col z-50 transition-all duration-300",
        isCollapsed ? "w-20" : "w-64",
        "lg:translate-x-0",
        isMobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"
      )}
    >
      {/* Profile Section - Cleaner */}
      <div
        className={cn(
          "border-b border-border/50",
          isCollapsed ? "p-4" : "p-5",
        )}
      >
        <div
          className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center" : "justify-between gap-3",
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden flex-1 px-1">
              <div className="w-10 h-10 rounded-lg border border-border flex items-center justify-center bg-secondary/50 shrink-0">
                <img
                  src={userAvatar}
                  alt="Profile"
                  className="w-full h-full rounded-lg object-cover"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-bold text-foreground truncate">
                  {userProfile?.name || "Carregando..."}
                </span>
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest leading-none mt-1">
                  {userProfile?.role || "Membro"}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onToggle}
            className={cn(
              "p-1.5 text-muted-foreground hover:text-primary hover:bg-secondary rounded-md transition-all shrink-0",
              isCollapsed && "mx-auto",
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" strokeWidth={2} />
            ) : (
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* Main Navigation - More sober */}
      <div className="flex-1 overflow-y-auto pt-4 px-3 space-y-6 scrollbar-hide">
        <div>
          <div className="space-y-1">
            {menuItems.map((item, idx) => {
              const isOpen = openMenus.includes(item.label);
              const isActive = activeItem === item.label || item.subItems?.some(s => s.label === activeItem);

              return (
                <div key={idx} className="space-y-1">
                  <div
                    onClick={() => {
                      if (item.isDropdown) {
                        toggleMenu(item.label);
                      } else {
                        onActiveItemChange(item.label);
                        if (onMobileClose) onMobileClose();
                      }
                    }}
                    className={cn(
                      "flex items-center transition-all duration-200 group cursor-pointer relative py-2 rounded-lg",
                      isActive && !item.isDropdown
                        ? "bg-primary/5 text-primary"
                        : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground",
                      isCollapsed ? "justify-center h-11 px-0" : "gap-3 px-3",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-4.5 h-4.5 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                    {!isCollapsed && (
                      <div className="flex items-center flex-1 duration-200 overflow-hidden">
                        <span className={cn(
                          "text-xs font-bold flex-1 tracking-tight truncate",
                          isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                          {item.label}
                        </span>
                        {item.isDropdown && (
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 opacity-40 transition-transform duration-300",
                              isOpen ? "rotate-180" : "rotate-0",
                            )}
                            strokeWidth={2}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dropdown items - Subtler */}
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      isOpen && !isCollapsed
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0 overflow-hidden",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="pl-4 space-y-0.5 mt-1">
                        {item.subItems?.map((sub, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              onActiveItemChange(sub.label);
                              if (onMobileClose) onMobileClose();
                            }}
                            className={cn(
                              "text-[11px] font-bold py-2 px-3 rounded-md cursor-pointer transition-all flex items-center gap-3",
                              activeItem === sub.label
                                ? "bg-primary/5 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                            )}
                          >
                            <div className={cn(
                              "w-1 h-1 rounded-full",
                              activeItem === sub.label ? "bg-primary" : "bg-muted-foreground/30"
                            )} />
                            <span>{sub.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border/50 mx-1" />

        {/* Settings Section */}
        <div>
          <div className="space-y-1">
            {settingsItems.map((item, idx) => {
              const isOpen = openMenus.includes(item.label);
              const isSubActive = item.subItems?.some(sub => activeItem === sub.label);
              const isActive = activeItem === item.label || isSubActive;

              return (
                <div key={idx} className="space-y-1">
                  <div
                    onClick={() => {
                      if (item.isDropdown) {
                        toggleMenu(item.label);
                      } else {
                        onActiveItemChange(item.label);
                        if (onMobileClose) onMobileClose();
                      }
                    }}
                    className={cn(
                      "flex items-center rounded-lg transition-all duration-200 group cursor-pointer",
                      isActive && !item.isDropdown 
                        ? "bg-primary/5 text-primary" 
                        : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground",
                      isCollapsed
                        ? "justify-center h-11 px-0"
                        : "gap-3 px-3 py-2",
                    )}
                  >
                    <item.icon
                      className={cn(
                          "w-4.5 h-4.5 shrink-0 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground"
                      )}
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                    {!isCollapsed && (
                      <div className="flex items-center flex-1 duration-200 overflow-hidden">
                        <span className={cn(
                          "text-xs font-bold flex-1 tracking-tight truncate",
                        )}>
                          {item.label}
                        </span>
                        {item.isDropdown && (
                          <ChevronDown
                            className={cn(
                              "w-3.5 h-3.5 opacity-40 transition-transform duration-300",
                              isOpen ? "rotate-180" : "rotate-0",
                            )}
                            strokeWidth={2}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      isOpen && !isCollapsed
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0 overflow-hidden",
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="pl-4 space-y-0.5 mt-1">
                        {item.subItems?.map((sub, i) => (
                          <div
                            key={i}
                            onClick={() => {
                              onActiveItemChange(sub.label);
                              if (onMobileClose) onMobileClose();
                            }}
                            className={cn(
                              "text-[11px] font-bold py-2 px-3 rounded-md cursor-pointer transition-all flex items-center gap-3",
                              activeItem === sub.label
                                ? "bg-primary/5 text-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
                            )}
                          >
                             <div className={cn(
                              "w-1 h-1 rounded-full",
                              activeItem === sub.label ? "bg-primary" : "bg-muted-foreground/30"
                            )} />
                            <span>{sub.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer - Minimalist */}
      <div className="p-4 mt-auto border-t border-border/50">
        {/* Organograma Card - Modernized */}
        <button
          onClick={() => onActiveItemChange("Organograma")}
          className={cn(
            "w-full mb-4 flex items-center gap-3 bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 text-white rounded-xl p-3 transition-all duration-300 relative overflow-hidden group border border-white/10 active:scale-95",
            isCollapsed && "justify-center px-2"
          )}
        >
          {/* Subtle Shine Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          
          <div className={cn(
            "p-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 shrink-0",
            isCollapsed && "mx-auto"
          )}>
            <img 
              src={organogramaIcon} 
              alt="Organograma" 
              className="w-5 h-5 invert brightness-0" 
            />
          </div>
          
          {!isCollapsed && (
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white/90 leading-none mb-0.5">Organograma</p>
              <p className="text-[8px] font-medium text-blue-200/80 leading-tight">Estrutura Corporativa</p>
            </div>
          )}
        </button>
        <div className="flex items-center gap-3 px-2 py-2">
           <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
              title="Mudar Tema"
           >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
           </button>
           {!isCollapsed && (
             <span className="text-[10px] font-bold text-muted-foreground uppercase flex-1">
               v2.4.0
             </span>
           )}
           <button 
              onClick={onLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
              title="Sair"
           >
              <LogOut className="w-4 h-4" />
           </button>
        </div>
      </div>
    </aside>
  );
}
