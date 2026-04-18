import { cn } from "@/lib/utils";

interface TinyLoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
  variant?: "blue" | "white";
}

export function TinyLoader({ className, size = "md", text, variant = "blue" }: TinyLoaderProps) {
  const sizeMap = {
    sm: "w-1.5 h-1.5",
    md: "w-3 h-3",
    lg: "w-4 h-4"
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className="flex items-center gap-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              sizeMap[size],
              "rounded-full animate-[pulse-scale_1.4s_infinite_ease-in-out_both] shadow-sm",
              variant === "blue" ? "bg-blue-600" : "bg-white"
            )}
            style={{ 
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      {text && (
        <span className={cn(
          "text-[9px] font-black uppercase tracking-[0.2em] animate-pulse",
          variant === "blue" ? "text-blue-600/60" : "text-white/60"
        )}>
          {text}
        </span>
      )}

      <style>{`
        @keyframes pulse-scale {
          0%, 80%, 100% { 
            transform: scale(0.6);
            opacity: 0.5;
          } 
          40% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
