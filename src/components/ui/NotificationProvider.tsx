import { useState, useCallback, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationContext, type Notification, type NotificationType } from "@/hooks/useNotification";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((type: NotificationType, title: string, message: string, persistent?: boolean, tag?: string, duration?: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    const notifDuration = duration || 5000;
    
    setNotifications((prev) => {
      if (tag && prev.some((n) => n.tag === tag)) return prev;
      return [...prev, { id, type, title, message, persistent, tag, duration: notifDuration }];
    });

    // Auto-remove after duration ONLY if not persistent
    if (!persistent) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, notifDuration);
    }
  }, []);

  const removeNotification = (id: string, tag?: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    if (tag) {
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
      const raw = localStorage.getItem("carflax-dismissed-notifs-v2");
      const stored = raw ? JSON.parse(raw) : null;
      const ids: string[] = (stored?.date === todayKey) ? stored.ids : [];
      if (!ids.includes(tag)) {
        ids.push(tag);
        localStorage.setItem("carflax-dismissed-notifs-v2", JSON.stringify({ date: todayKey, ids }));
      }
    }
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
                "relative w-[480px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex gap-5 overflow-hidden",
                n.type === "success" && "border-emerald-100 dark:border-emerald-500/20",
                n.type === "error" && "border-red-100 dark:border-red-500/20",
                n.type === "info" && "border-blue-100 dark:border-blue-500/20"
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
                    n.type === "success" && "bg-emerald-50 dark:bg-emerald-500/10",
                    n.type === "error" && "bg-red-50 dark:bg-red-500/10",
                    n.type === "info" && "bg-blue-50 dark:bg-blue-500/10"
                )}>
                  {n.type === "success" && <CheckCircle2 className="w-7 h-7 text-emerald-600" />}
                  {n.type === "error" && <AlertCircle className="w-7 h-7 text-red-600" />}
                  {n.type === "info" && <Info className="w-7 h-7 text-blue-600" />}
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-2">{n.title}</h4>
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed pr-6 whitespace-pre-wrap">{n.message}</p>
                </div>

                <button 
                  onClick={() => removeNotification(n.id, n.tag)}
                  className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Animated Progress Bar */}
                <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: (n.duration || 5000) / 1000, ease: "linear" }}
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
