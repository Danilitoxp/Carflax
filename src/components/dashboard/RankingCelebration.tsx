import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { X } from "lucide-react";
import type { RankingCelebration as Celebration } from "./ranking-events";

const COPY = {
  goal: { icon: "🎉", title: "Meta diária batida", subtitle: "Mais uma conquista para comemorar!", color: "#34d399" },
  leader: { icon: "👑", title: "Tem novo líder na área!", subtitle: "O topo do ranking tem um novo nome.", color: "#fbbf24" },
  double: { icon: "🔥", title: "Tá jogando em outro nível!", subtitle: "200% da meta diária. Dobrou a meta!", color: "#fb923c" },
  team: { icon: "🏆", title: "Meta do dia da loja batida!", subtitle: "Juntos, a meta é nossa! Parabéns a toda a equipe!", color: "#38bdf8" },
};

export function RankingCelebration({ event, onClose }: { event: Celebration; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copy = COPY[event.kind];

  useEffect(() => {
    if (!canvasRef.current) return;
    const fire = confetti.create(canvasRef.current, { resize: true });
    const cores = [copy.color, "#ffffff", "#fbbf24"];
    if (event.kind !== "team") {
      void fire({ particleCount: 80, spread: 100, origin: { y: 0.65 }, colors: cores });
      return () => fire.reset();
    }
    // Meta da loja: chuva de confete contínua pelos dois lados + fogos no meio.
    const coresLoja = [copy.color, "#ffffff", "#fbbf24", "#34d399", "#f472b6"];
    void fire({ particleCount: 260, spread: 140, startVelocity: 55, origin: { y: 0.6 }, colors: coresLoja });
    const laterais = setInterval(() => {
      void fire({ particleCount: 14, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: coresLoja });
      void fire({ particleCount: 14, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: coresLoja });
    }, 250);
    const fogos = setInterval(() => {
      void fire({ particleCount: 90, spread: 360, startVelocity: 35, ticks: 90,
        origin: { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.3 }, colors: coresLoja });
    }, 1400);
    return () => {
      clearInterval(laterais);
      clearInterval(fogos);
      fire.reset();
    };
  }, [event.id, event.kind, copy.color]);

  return (
    <motion.div role="dialog" aria-modal="true" aria-label={copy.title}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}>
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        style={{ borderColor: copy.color, boxShadow: `0 0 50px ${copy.color}30` }}
        className={event.kind === "team"
          ? "relative max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[40px] border-4 bg-[#0b1224] p-12 text-center"
          : "relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border bg-[#0b1224] p-8 text-center"}
        onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Fechar comemoração" onClick={onClose}
          className="absolute right-4 top-4 p-2 text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
        <motion.p aria-hidden="true" className={event.kind === "team" ? "text-[120px] leading-none mb-6" : "text-6xl mb-4"}
          animate={{ scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}>{copy.icon}</motion.p>
        <h2 className={event.kind === "team" ? "text-5xl font-black uppercase tracking-tight" : "text-2xl font-black uppercase"} style={{ color: copy.color }}>{copy.title}</h2>
        {event.seller && (
          <div className="mt-6">
            {event.seller.avatar ? <img src={event.seller.avatar} alt="" className="mx-auto h-28 w-28 rounded-full object-cover border-4" style={{ borderColor: copy.color }} />
              : <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-3xl font-black">{event.seller.nome.slice(0, 2).toUpperCase()}</div>}
            <p className="mt-4 text-xl font-black uppercase">{event.seller.nome}</p>
          </div>
        )}
        {event.team && <div className="mt-6 flex max-h-[35vh] flex-wrap justify-center gap-3 overflow-y-auto">
          {event.team.map((seller) => <div key={seller.cod} className="w-20" title={seller.nome}>
            {seller.avatar ? <img src={seller.avatar} alt="" className="mx-auto h-12 w-12 rounded-full object-cover" />
              : <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10 font-black">{seller.nome.slice(0, 2).toUpperCase()}</div>}
            <p className="mt-1 truncate text-[10px]">{seller.nome}</p>
          </div>)}
        </div>}
        <p className={event.kind === "team" ? "mt-6 text-8xl font-black tabular-nums" : "mt-4 text-5xl font-black tabular-nums"} style={{ color: copy.color }}>{event.percentual.toFixed(0)}%</p>
        <p className={event.kind === "team" ? "mt-4 text-xl font-bold text-white/80" : "mt-3 text-sm text-white/70"}>{copy.subtitle}</p>
      </motion.div>
    </motion.div>
  );
}

