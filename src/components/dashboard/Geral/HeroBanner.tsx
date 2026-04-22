import { useTheme } from "@/context/theme-provider";
import { Sparkles } from "@/components/ui/sparkles";

export function HeroBanner({ loading }: { loading?: boolean }) {
  const { theme } = useTheme();
  
  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl w-full bg-card border border-border h-[280px] flex items-center justify-center animate-pulse">
        <div className="space-y-4 text-center">
          <div className="h-10 w-64 bg-secondary rounded-xl mx-auto" />
          <div className="h-4 w-96 bg-secondary/50 rounded-lg mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl w-full bg-card border border-border h-[280px] flex flex-col items-center justify-center group">
      {/* Background/Ambient gradient & Mesh Grid */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
          color: 'var(--primary)'
        }} 
      />
      
      <div className="relative z-20 text-center space-y-4 px-6 mt-4">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground uppercase animate-in fade-in slide-in-from-bottom-4 duration-1000">
            Carflax <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">HUB</span>
          </h1>
          <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] max-w-xl mx-auto opacity-70">
            Sua produtividade em um só lugar. Tenha acesso ágil a indicadores diários.
          </p>
        </div>
      </div>

      {/* Sparkles and Gfx Section - Reduced height */}
      <div className="absolute inset-x-0 bottom-0 h-48 w-full overflow-hidden [mask-image:radial-gradient(circle_at_50%_50%,white,transparent)] pointer-events-none">
        <div className="absolute inset-0 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_bottom_center,var(--gradient-color),transparent_70%)] before:opacity-40" />
        <div className="absolute -left-1/2 top-[60%] aspect-[1/0.7] z-10 w-[200%] rounded-[100%] border-t border-blue-500/20 bg-blue-500/5 dark:bg-blue-900/20 backdrop-blur-3xl" />
        
        <Sparkles
          density={800}
          className="absolute inset-x-0 bottom-0 h-full w-full [mask-image:radial-gradient(circle_at_50%_50%,white,transparent_85%)]"
          color={theme === "dark" ? "#ffffff" : "#2563eb"}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}
