import { ThemeProvider } from "@/context/theme-provider";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { CommunicationSection } from "@/components/dashboard/CommunicationSection";
import {
  HighlightCard,
  SalesMetricsCard,
  BirthdayList,
} from "@/components/dashboard/RightPanelComponents";
import { LayoutGrid } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function DashboardContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isVendedor, setIsVendedor] = useState(false); // Mock role

  return (
    <div className="h-screen bg-background font-sans transition-colors duration-300 overflow-hidden flex relative">
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main
        className={cn(
          "flex-1 flex flex-col h-screen transition-all duration-500 w-full",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
          "xl:pr-80",
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
          <CommunicationSection />
        </div>

        {/* Right Fixed Sidebar Panel */}
        <div className="hidden xl:block w-80 fixed right-0 top-0 h-screen bg-transparent py-6 pr-6 pl-0 space-y-2 overflow-y-auto scrollbar-hide">
          <button 
            onClick={() => setIsVendedor(!isVendedor)}
            className="absolute top-2 right-8 text-[8px] font-bold opacity-0 hover:opacity-100 transition-opacity text-primary uppercase"
          >
            Simular {isVendedor ? 'Interno' : 'Vendedor'}
          </button>
          <div className="flex flex-col gap-2 px-0 h-full">
            {isVendedor ? <SalesMetricsCard /> : <HighlightCard />}
            <BirthdayList isCompact={isVendedor} />
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="carflax-theme">
      <DashboardContent />
    </ThemeProvider>
  );
}

export default App;
