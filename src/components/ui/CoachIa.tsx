import { useState, useEffect, useRef } from "react";
import { IaIcon } from "./IaIcon";
import { cn } from "@/lib/utils";
import { type VendedorResumo } from "@/lib/api";
import { getCoachIaMessage } from "@/lib/gemini-service";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface CoachIaProps {
  metrics?: VendedorResumo | null;
  userRole?: string;
  userName?: string;
  className?: string;
}

export function CoachIa({ metrics, userRole, userName, className }: CoachIaProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

    const lastSentRef = useRef<number>(0);

  useEffect(() => {
    const showCycle = async () => {
      // 1. Só gasta API se o usuário estiver realmente vendo a página
      if (document.visibilityState !== "visible") return;

      // 1.1 Verificação Global de Admin: O robô está habilitado?
      const { data: config } = await supabase
        .from("crm_config")
        .select("value")
        .eq("key", "coach_ia_enabled")
        .maybeSingle();
      
      if (config && config.value === "false") {
        console.log("[CoachIA] Desativado globalmente pelo administrador.");
        setIsVisible(false);
        return;
      }

      // 2. Trava de Segurança: Só envia se passou mais de 1 hora (3.600.000 ms)
      const now = Date.now();
      if (now - lastSentRef.current < 3600000) {
        console.log("[CoachIA] Cooldown ativo. Aguardando próximo ciclo.");
        return;
      }
      lastSentRef.current = now;

      // 3. Busca a mensagem no Gemini (via backend)
      const aiMessage = await getCoachIaMessage(
        metrics || null, 
        userRole || "VENDEDOR", 
        userName || "Usuário"
      );
      setMessage(aiMessage);
      
      // 2. Aparece o Robô com animação
      setIsVisible(true);
      
      // 3. Aguarda 1s (tempo da animação do robô) e mostra o balão
      setTimeout(() => setShowBubble(true), 1000);

      // 4. Mantém o robô na tela por 10 segundos totais
      setTimeout(() => {
        setShowBubble(false);
        // 5. Após sumir o balão, aguarda 1s e remove o robô
        setTimeout(() => setIsVisible(false), 1000);
      }, 10000);
    };

    // Primeiro ciclo após 1 minuto (para dar tempo de carregar tudo)
    const initialTimer = setTimeout(showCycle, 60000);
    // Repete a cada 1 hora (3.600.000 ms)
    const interval = setInterval(showCycle, 3600000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [metrics, userRole, userName]);

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.3, rotate: 20 }}
            animate={{ opacity: 1, x: 0, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, x: 100, scale: 0.3, rotate: -20 }}
            transition={{ type: "spring", damping: 18, stiffness: 120 }}
            className="relative pointer-events-auto"
          >
            {/* Speech Bubble */}
            <AnimatePresence>
              {showBubble && (
                <motion.div 
                  initial={{ opacity: 0, x: 30, scale: 0.7, filter: "blur(10px)" }}
                  animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 30, scale: 0.7, filter: "blur(10px)" }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="absolute right-full mr-5 top-[70%] -translate-y-1/2 w-72"
                >
                  <div className="relative">
                    {/* Main Bubble Container */}
                    <div className={cn(
                      "relative p-5 rounded-3xl border-2 shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
                      "bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900",
                      "border-blue-500/40"
                    )}>
                      <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none" />
                      
                      <div className="flex flex-col gap-1.5 relative z-10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80">
                            Sistema de Coaching
                          </span>
                        </div>
                        <p className="text-[14px] font-bold text-white leading-[1.6] tracking-tight">
                          {message}
                        </p>
                      </div>
                    </div>

                    {/* Futuristic Pointer */}
                    <div className="absolute right-[-6px] top-4">
                       <div className="w-4 h-4 bg-blue-950 border-r-2 border-t-2 border-blue-500/40 rotate-45 rounded-sm shadow-xl" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* The AI Icon Container */}
            <div className="w-16 h-16 relative hover:scale-110 transition-transform duration-500 ease-out group cursor-pointer">
              <IaIcon className="w-full h-full drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
              
              {/* Interaction Aura */}
              <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              {/* Speaking Pulse Ring */}
              {showBubble && (
                <div className="absolute inset-0 rounded-full border-2 border-blue-400/40 animate-[ping_2.5s_infinite] -z-10" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
