import { useState } from "react";
import {
  LayoutGrid,
  Settings2,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "@/context/theme-provider";

interface MenuItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  hasArrow?: boolean;
  isDropdown?: boolean;
  isOpen?: boolean;
  subItems?: string[];
}

const menuItems: MenuItem[] = [
  {
    icon: LayoutGrid,
    label: "Dashboard",
    isDropdown: true,
    subItems: ["Geral", "Analytics", "Performance", "Relatórios"],
  },
];

const settingsItems: MenuItem[] = [
  { icon: Settings2, label: "Settings", hasArrow: true },
];

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ isCollapsed, onToggle }: AppSidebarProps) {
  const { theme, setTheme } = useTheme();
  const [openMenus, setOpenMenus] = useState<string[]>(["Dashboard"]);
  const [activeItem, setActiveItem] = useState<string>("Geral");

  const toggleMenu = (label: string) => {
    if (isCollapsed) return;
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((m) => m !== label) : [...prev, label],
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-card border-r border-border flex flex-col z-50 transition-all duration-500",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      {/* Profile Section */}
      <div
        className={cn(
          "border-b border-border/50 transition-all duration-500",
          isCollapsed ? "p-4" : "p-6",
        )}
      >
        <div
          className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center" : "justify-between gap-3",
          )}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300 flex-1">
              <div className="w-12 h-12 rounded-full border-2 border-[#0053FC]/30 p-0.5 shrink-0">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Danilo&backgroundColor=0053FC"
                  alt="Profile"
                  className="w-full h-full rounded-full bg-[#0053FC]/10"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-[0.1em] leading-none mb-1">
                  Product Manager
                </span>
                <span className="text-sm font-bold text-foreground truncate">
                  Andrew Smith
                </span>
              </div>
            </div>
          )}

          <button
            onClick={onToggle}
            className={cn(
              "p-1 text-muted-foreground hover:text-primary transition-colors shrink-0",
              isCollapsed && "mx-auto",
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto pt-6 px-0 space-y-8 scrollbar-hide">
        <div>
          <div className="space-y-1">
            {menuItems.map((item, idx) => {
              const isOpen = openMenus.includes(item.label);
              const isActive = activeItem === item.label;

              return (
                <div key={idx} className="space-y-1">
                  <div
                    onClick={() => {
                      if (item.isDropdown) {
                        toggleMenu(item.label);
                      } else {
                        setActiveItem(item.label);
                      }
                    }}
                    className={cn(
                      "flex items-center transition-all duration-300 group cursor-pointer relative py-3",
                      isActive && !item.isDropdown
                        ? "bg-primary/[0.03]"
                        : "hover:bg-primary/5 text-muted-foreground hover:text-[#0053FC]",
                      isCollapsed ? "justify-center h-12 px-0" : "gap-3 px-6",
                    )}
                  >
                    {/* Active Indicator Bar */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0053FC] fade-in duration-300" />
                    )}

                    <item.icon
                      className="w-5 h-5 shrink-0 text-[#0053FC] transition-colors duration-300"
                      strokeWidth={1.5}
                      fill="currentColor"
                    />
                    {!isCollapsed && (
                      <div
                        className={cn(
                          "flex items-center flex-1 animate-in fade-in slide-in-from-left-1 duration-300 overflow-hidden",
                          isActive && !item.isDropdown && "text-[#0053FC]",
                        )}
                      >
                        <span className="text-sm font-bold flex-1 tracking-tight truncate">
                          {item.label}
                        </span>
                        {item.hasArrow && (
                          <ChevronRight
                            className="w-4 h-4 opacity-40 text-muted-foreground"
                            strokeWidth={1.5}
                          />
                        )}
                        {item.isDropdown && (
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 opacity-40 transition-transform duration-500",
                              isOpen
                                ? "rotate-180 text-[#0053FC]"
                                : "rotate-0 text-muted-foreground",
                            )}
                            strokeWidth={1.5}
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
                      <div className="pl-11 space-y-1 py-1">
                        {item.subItems?.map((sub, i) => (
                          <div
                            key={i}
                            onClick={() => setActiveItem(sub)}
                            className={cn(
                              "text-xs font-semibold py-2 px-3 rounded-md cursor-pointer transition-all border-l-2 relative overflow-hidden group/sub",
                              activeItem === sub
                                ? "bg-primary/5 text-primary border-primary font-bold shadow-sm"
                                : "text-muted-foreground border-transparent hover:text-primary hover:bg-primary/5 hover:border-primary/30",
                            )}
                          >
                            <div
                              className={cn(
                                "absolute inset-0 bg-primary/5 translate-x-[-100%] group-hover/sub:translate-x-0 transition-transform duration-500",
                                activeItem === sub && "translate-x-0",
                              )}
                            />
                            <span className="relative z-10">{sub}</span>
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

        {/* Separator Line */}
        <div className="mx-2 border-t border-border/50" />

        {/* Settings Section */}
        <div>
          <div className="space-y-1">
            {settingsItems.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center rounded-xl transition-all duration-300 group cursor-pointer hover:bg-secondary/50 text-muted-foreground hover:text-foreground",
                  isCollapsed
                    ? "justify-center h-12 px-0"
                    : "gap-3 px-3 py-2.5",
                )}
              >
                <item.icon
                  className="w-5 h-5 text-[#0053FC] shrink-0"
                  strokeWidth={1.5}
                />
                {!isCollapsed && (
                  <div className="flex items-center flex-1 animate-in fade-in slide-in-from-left-1 duration-300 overflow-hidden">
                    <span className="text-sm font-semibold flex-1 tracking-tight truncate">
                      {item.label}
                    </span>
                    <ChevronRight
                      className="w-4 h-4 opacity-40"
                      strokeWidth={1.5}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Utilities */}
      <div
        className={cn(
          "mt-auto transition-all duration-500",
          isCollapsed ? "p-3 space-y-4" : "p-4",
        )}
      >
        <div className="pt-2">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-4">
              <ThemeToggle />
              <button className="p-2 rounded-xl text-[#0053FC] hover:bg-[#0053FC]/10 transition-colors">
                <LogOut className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 cursor-pointer transition-all group overflow-hidden relative"
            >
              {/* Brand Indicator Bar */}
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#0053FC]" />
              
              <div className="w-9 h-9 rounded-lg bg-background shadow-sm border border-border/50 flex items-center justify-center relative overflow-hidden shrink-0 ml-1">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-foreground capitalize truncate">
                  Modo {theme === "dark" ? "Escuro" : "Claro"}
                </p>
                <p className="text-[9px] text-muted-foreground truncate font-medium uppercase tracking-tighter">
                  Tema
                </p>
              </div>

              <div className="pl-2 border-l border-border/50 h-8 flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Logout");
                  }}
                  className="p-1.5 rounded-lg text-[#0053FC]/60 hover:text-[#0053FC] transition-colors hover:bg-[#0053FC]/5"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
