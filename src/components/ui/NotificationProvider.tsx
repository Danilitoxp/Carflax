import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = "success" | "error" | "info";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, title: string, message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotification must be used within NotificationProvider");
  return context;
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, type, title, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Container de Notificações */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto"
            >
              <div className={cn(
                "relative w-[480px] bg-white/80 backdrop-blur-xl border rounded-3xl p-6 shadow-2xl flex gap-5 overflow-hidden",
                n.type === "success" && "border-emerald-100",
                n.type === "error" && "border-red-100",
                n.type === "info" && "border-blue-100"
              )}>
                {/* Visual Accent Bar */}
                <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5",
                    n.type === "success" && "bg-emerald-500",
                    n.type === "error" && "bg-red-500",
                    n.type === "info" && "bg-blue-500"
                )} />

                <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    n.type === "success" && "bg-emerald-50",
                    n.type === "error" && "bg-red-50",
                    n.type === "info" && "bg-blue-50"
                )}>
                  {n.type === "success" && <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
                  {n.type === "error" && <AlertCircle className="w-7 h-7 text-red-600" />}
                  {n.type === "info" && <Info className="w-7 h-7 text-blue-600" />}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none mb-2">{n.title}</h4>
                  <p className="text-xs font-bold text-slate-500 leading-relaxed pr-6">{n.message}</p>
                </div>

                <button 
                  onClick={() => removeNotification(n.id)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Animated Progress Bar */}
                <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className={cn(
                        "absolute bottom-0 left-0 h-[3px]",
                        n.type === "success" && "bg-emerald-500/30",
                        n.type === "error" && "bg-red-500/30",
                        n.type === "info" && "bg-blue-500/30"
                    )}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}
