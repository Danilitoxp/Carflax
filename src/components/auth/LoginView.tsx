import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-provider";

interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const { theme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isDark = theme === "dark" || (theme === "system" && typeof window !== 'undefined' && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 transition-colors duration-500 relative overflow-hidden"
      style={{ backgroundColor: isDark ? '#020617' : '#F8FAFC' }}
    >
      {/* Background Ornaments - Dynamic based on state */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#E0E7FF] via-[#F8FAFC] to-[#C7D2FE] transition-opacity duration-500"
        style={{ opacity: isDark ? 0 : 1 }}
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_#0F172A_0%,_#020617_100%)] transition-opacity duration-500"
        style={{ opacity: isDark ? 1 : 0 }}
      />


      {/* Container Card */}
      <div className="relative z-10 w-full max-w-[1000px] h-full max-h-[650px] bg-card border border-border/50 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col md:flex-row transition-all duration-500">

        {/* Left Side: Branding & Features */}
        <div className="w-full md:w-[45%] bg-[#0053FC] p-8 md:p-12 text-white relative flex flex-col justify-center items-center text-center overflow-hidden md:rounded-r-[8rem] z-10 shrink-0">
          {/* Background Decorative Element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

          <div className="relative z-10 space-y-6">
            <h1 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tighter">
              Olá, <br />bem-vindo!
            </h1>
            <p className="text-white/70 text-sm md:text-base font-medium leading-relaxed">
              Bem-vindo ao painel da Carflax, o espaço onde todos os colaboradores interagem, compartilham conquistas e ficam por dentro das novidades da empresa.
            </p>
          </div>

          {/* This matches the curved shape from the image indirectly via the container's rounding on md screens */}
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center bg-card transition-colors duration-500">
          <div className="max-w-[360px] mx-auto w-full space-y-8">
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-3xl font-black text-foreground tracking-tight leading-none">Entrar</h2>
              <p className="text-muted-foreground text-sm font-medium">Acesse sua conta para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">E-mail Corporativo</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-[#0053FC]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex@carflax.com"
                    className="w-full bg-secondary/50 dark:bg-white/[0.03] border border-border/50 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold outline-none focus:border-[#0053FC]/50 focus:ring-4 focus:ring-[#0053FC]/5 transition-all placeholder:text-muted-foreground/30 text-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Senha</label>
                  <button type="button" className="text-[10px] font-black text-[#0053FC] uppercase tracking-widest hover:underline">Esqueceu a senha?</button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 transition-colors group-focus-within:text-[#0053FC]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-secondary/50 dark:bg-white/[0.03] border border-border/50 dark:border-white/10 rounded-2xl pl-14 pr-14 py-4 text-sm font-bold outline-none focus:border-[#0053FC]/50 focus:ring-4 focus:ring-[#0053FC]/5 transition-all placeholder:text-muted-foreground/30 text-foreground"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full bg-[#0053FC] hover:bg-[#0042CC] text-white rounded-2xl py-7 font-black text-sm uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-none"
                >
                  Entrar no Painel
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>

            <div className="pt-8 text-center">
              <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-widest">
                &copy; {new Date().getFullYear()} Carflax Corporate
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
