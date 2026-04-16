import { cn } from "@/lib/utils";

interface AvatarStackProps {
  count: number;
  className?: string;
  avatars?: string[];
}

export function AvatarStack({ count, className, avatars }: AvatarStackProps) {
  const displayAvatars = avatars || [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Ane",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  ];

  return (
    <div className={cn("flex -space-x-3 rtl:space-x-reverse items-center", className)}>
      {displayAvatars.map((src, i) => (
        <img 
          key={i}
          className="w-8 h-8 border-2 border-background rounded-full object-cover" 
          src={src} 
          alt={`Profile ${i}`} 
        />
      ))}
      <div className="flex items-center justify-center w-8 h-8 text-[10px] font-bold text-white bg-slate-800 border-2 border-background rounded-full">
        +{count - displayAvatars.length > 0 ? count - displayAvatars.length : count}
      </div>
    </div>
  );
}
