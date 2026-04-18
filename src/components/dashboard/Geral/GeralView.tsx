import { HeroBanner } from "./HeroBanner";
import { CommunicationSection } from "./CommunicationSection";

export function GeralView({ userProfile }: { userProfile?: any }) {

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F8FAFC]">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 scrollbar-hide">
        <HeroBanner />
        <div className="space-y-6">
          <CommunicationSection userProfile={userProfile} />
        </div>
      </div>
    </div>
  );
}

