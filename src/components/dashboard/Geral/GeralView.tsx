import { HeroBanner } from "./HeroBanner";
import { CommunicationSection } from "./CommunicationSection";

interface UserProfile {
  name: string;
  role: string;
  avatar?: string;
}

export function GeralView({ userProfile, loading }: { userProfile?: UserProfile, loading?: boolean }) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-transparent">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide">
        <HeroBanner loading={loading} />
        
        <div className="space-y-6">
          <CommunicationSection userProfile={userProfile} loading={loading} />
        </div>
      </div>
    </div>
  );
}

