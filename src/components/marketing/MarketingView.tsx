import { Megaphone, Calendar } from "lucide-react";
import { WhatsappView } from "./whatsapp/WhatsappView";

interface UserProfile {
  id?: string;
  name: string;
  role: string;
}

interface MarketingViewProps {
  activeTab: string;
  userProfile?: UserProfile | null;
}

export function MarketingView({ activeTab, userProfile }: MarketingViewProps) {
  const firstName = userProfile?.name ? userProfile.name.split(' ')[0] : 'Usuário';

  if (activeTab === "Whatsapp") {
    return <WhatsappView />;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-background h-full">
      <div className="text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
          {activeTab === "Cronograma" ? (
            <Calendar className="w-10 h-10 text-primary" />
          ) : (
            <Megaphone className="w-10 h-10 text-primary" />
          )}
        </div>
        <h2 className="text-4xl font-black text-foreground mb-4 uppercase tracking-tighter">
          Marketing: {activeTab}
        </h2>
        <p className="text-muted-foreground text-lg font-medium max-w-md mx-auto">
          Olá {firstName}, esta seção de marketing está sendo preparada. Em breve você terá acesso a todas as ferramentas de {activeTab.toLowerCase()}.
        </p>
      </div>
    </div>
  );
}
