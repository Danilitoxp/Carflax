import { useState, useEffect } from "react";
import { RomaneiosView } from "./romaneios/RomaneiosView";
import { ConcluidasView } from "./concluidas/ConcluidasView";

interface EntregasViewProps {
  activeTab?: string;
}

export function EntregasView({ activeTab: externalTab }: EntregasViewProps) {
  const [internalTab, setInternalTab] = useState<"romaneios" | "concluidas">("romaneios");

  // Sincroniza o estado interno se a navegação externa (sidebar) mudar
  useEffect(() => {
    const timer = setTimeout(() => {
      if (externalTab === "Romaneios") setInternalTab("romaneios");
      if (externalTab === "Concluídas") setInternalTab("concluidas");
    }, 0);
    return () => clearTimeout(timer);
  }, [externalTab]);

  return (
    <div className="flex flex-col h-full bg-background pt-4 px-4 md:px-6 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        {internalTab === "romaneios" ? (
          <RomaneiosView />
        ) : (
          <ConcluidasView />
        )}
      </div>
    </div>
  );
}
