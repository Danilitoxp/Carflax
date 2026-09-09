import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { X } from "lucide-react";
import type { RankingCelebration as Celebration } from "./ranking-events";

const COPY = {
  goal: { icon: "🎉", title: "Meta diária batida", subtitle: "Mais uma conquista para comemorar!", color: "#34d399" },
  leader: { icon: "👑", title: "Tem novo líder na área!", subtitle: "O topo do ranking tem um novo nome.", color: "#fbbf24" },
  double: { icon: "🔥", title: "Tá jogando em outro nível!", subtitle: "200% da meta diária. Dobrou a meta!", color: "#fb923c" },
  team: { icon: "🏆", title: "Juntos, a meta é nossa!", subtitle: "A equipe bateu a meta coletiva do dia!", color: "#38bdf8" },
};

export function RankingCelebration({ event, onClose }: { event: Celebration; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copy = COPY[event.kind];

  useEffect(() => {
    if (!canvasRef.current) return;
    const fire = confetti.create(canvasRef.current, { resize: true });
    void fire({ particleCount: event.kind === "team" ? 180 : 80, spread: 100,
      origin: { y: 0.65 }, colors: [copy.color, "#ffffff", "#fbbf24"] });
    return () => fire.reset();
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
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border bg-[#0b1224] p-8 text-center"
        onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Fechar comemoração" onClick={onClose}
          className="absolute right-4 top-4 p-2 text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
        <motion.p aria-hidden="true" className="text-6xl mb-4"
          animate={{ scale: [1, 1.12, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}>{copy.icon}</motion.p>
        <h2 className="text-2xl font-black uppercase" style={{ color: copy.color }}>{copy.title}</h2>
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
        <p className="mt-4 text-5xl font-black tabular-nums" style={{ color: copy.color }}>{event.percentual.toFixed(0)}%</p>
        <p className="mt-3 text-sm text-white/70">{copy.subtitle}</p>
      </motion.div>
    </motion.div>
  );
}

