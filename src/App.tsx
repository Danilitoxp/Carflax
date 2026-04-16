import { ThemeProvider } from "@/context/theme-provider";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { CommunicationSection } from "@/components/dashboard/CommunicationSection";
import {
  HighlightCard,
  BirthdayList,
} from "@/components/dashboard/RightPanelComponents";
import { useState } from "react";
import { cn } from "@/lib/utils";

function DashboardContent() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen bg-background font-sans transition-colors duration-300 overflow-hidden flex">
      <AppSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main
        className={cn(
          "flex-1 flex flex-col h-screen transition-all duration-500",
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
          "xl:pr-72",
        )}
      >
        {/* Content Area */}
        <div className="flex flex-col h-full w-full mx-auto overflow-hidden">
          <CommunicationSection />
        </div>

        {/* Right Fixed Sidebar Panel */}
        <div className="hidden xl:block w-72 fixed right-0 top-0 h-screen bg-transparent py-6 pr-6 pl-0 space-y-2 overflow-hidden">
          <div className="flex flex-col gap-2 px-0">
            <HighlightCard />
            <BirthdayList />
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
