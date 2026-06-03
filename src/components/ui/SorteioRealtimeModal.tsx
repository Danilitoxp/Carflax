import { useState, useEffect, useRef } from "react";
import { Trophy, X, Volume2, VolumeX, Sparkles, Star } from "lucide-react";

interface Seller {
  COD_VENDEDOR: string;
  NOME_VENDEDOR: string;
  avatar?: string | null;
  PERC_META_BATIDA?: string | number;
}

interface Prize {
  nome: string;
  descricao?: string | null;
  valor?: number | null;
  imagem?: string | null;
}

interface SorteioRealtimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mes: number;
  ano: number;
  elegiveis: Seller[];
  ganhador: Seller;
  premio: Prize | null;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const COLORS = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

// Web Audio API helper to synthesize drumroll
const createDrumrollSynth = (ctx: AudioContext) => {
  const bufferSize = ctx.sampleRate * 4.5; // 4.5s of noise
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = false;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 220;
  filter.Q.value = 4;

  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = "lowpass";
  lpFilter.frequency.value = 1200;

  const lfo = ctx.createOscillator();
  lfo.frequency.value = 16; // Speed of drumroll
  
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.55;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.12;

  lfo.connect(lfoGain);
  lfoGain.connect(gainNode.gain);

  noise.connect(filter);
  filter.connect(lpFilter);
  lpFilter.connect(gainNode);
  gainNode.connect(ctx.destination);

  return {
    start: () => {
      noise.start(0);
      lfo.start(0);
    },
    stop: () => {
      try {
        noise.stop();
        lfo.stop();
      } catch (e) {}
    },
    gainNode,
    ctx
  };
};

// Web Audio API helper to synthesize victory chime
const playVictoryChime = (isMuted: boolean) => {
  if (isMuted) return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  
  try {
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    // C Major Arpeggio: C4, E4, G4, C5, E5, G5, C6
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = index % 2 === 0 ? "triangle" : "sine";
      osc.frequency.value = freq;
      
      const noteStart = now + index * 0.12;
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.15, noteStart + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 1.8);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(noteStart);
      osc.stop(noteStart + 2.0);
    });
    
    // High celebratory bell pitch
    const bellOsc = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bellOsc.type = "sine";
    bellOsc.frequency.value = 1318.51; // E6
    
    bellGain.gain.setValueAtTime(0, now + 0.8);
    bellGain.gain.linearRampToValueAtTime(0.12, now + 0.85);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 3.0);
    
    bellOsc.connect(bellGain);
    bellGain.connect(ctx.destination);
    
    bellOsc.start(now + 0.8);
    bellOsc.stop(now + 3.2);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 4000);
  } catch (e) {
    console.error("Failed to play victory chime:", e);
  }
};

export function SorteioRealtimeModal({
  isOpen,
  onClose,
  mes,
  ano,
  elegiveis,
  ganhador,
  premio
}: SorteioRealtimeModalProps) {
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("carflax-sorteio-muted") === "true";
  });
  
  const [phase, setPhase] = useState<"idle" | "drawing" | "finished">("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drumrollRef = useRef<any>(null);
  
  // Ensure we have a valid list of candidates to loop through
  const candidates = useRef<Seller[]>([]);
  if (candidates.current.length === 0 && elegiveis && elegiveis.length > 0) {
    let list = [...elegiveis];
    // Duplicate items if list is short to make the cycle animation look smooth and continuous
    while (list.length < 15) {
      list = [...list, ...elegiveis];
    }
    candidates.current = list;
  }

  useEffect(() => {
    localStorage.setItem("carflax-sorteio-muted", String(isMuted));
    if (drumrollRef.current && drumrollRef.current.gainNode) {
      drumrollRef.current.gainNode.gain.value = isMuted ? 0 : 0.12;
    }
  }, [isMuted]);

  // Start raffle flow
  useEffect(() => {
    if (!isOpen || !elegiveis || elegiveis.length === 0 || !ganhador) return;
    
    setPhase("drawing");
    setCurrentIndex(0);
    
    // Web Audio Snare Roll
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass && !isMuted) {
      try {
        const audioCtx = new AudioContextClass();
        const drumroll = createDrumrollSynth(audioCtx);
        drumrollRef.current = drumroll;
        drumroll.start();
      } catch (e) {
        console.error("Audio Context failed to start:", e);
      }
    }
    
    // Animation constants
    const duration = 4500; // 4.5 seconds
    const start = performance.now();
    let frameId: number;
    let lastTime = 0;
    
    const animate = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        // Complete! Find the index of the actual winner in the candidate list
        const winnerIndex = candidates.current.findIndex(c => c.COD_VENDEDOR === ganhador.COD_VENDEDOR);
        setCurrentIndex(winnerIndex !== -1 ? winnerIndex : 0);
        
        // Stop audio
        if (drumrollRef.current) {
          drumrollRef.current.stop();
          drumrollRef.current.ctx.close().catch(() => {});
          drumrollRef.current = null;
        }
        
        setPhase("finished");
        playVictoryChime(isMuted);
        
        // Confetti start
        if (canvasRef.current) {
          triggerConfetti(canvasRef.current);
        }
        return;
      }
      
      // Easing curve (ease-out cubic / exponential slowdown)
      // The speed decreases dramatically as progress approaches 1
      const slowdown = Math.pow(progress, 2.5); // 0 at start, 1 at end
      const baseInterval = 40; // fast tick speed (40ms)
      const maxInterval = 550; // slow tick speed (550ms)
      const currentInterval = baseInterval + (maxInterval - baseInterval) * slowdown;
      
      if (timestamp - lastTime >= currentInterval) {
        setCurrentIndex((prev) => (prev + 1) % candidates.current.length);
        lastTime = timestamp;
      }
      
      frameId = requestAnimationFrame(animate);
    };
    
    frameId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(frameId);
      if (drumrollRef.current) {
        drumrollRef.current.stop();
        drumrollRef.current.ctx.close().catch(() => {});
        drumrollRef.current = null;
      }
    };
  }, [isOpen, elegiveis, ganhador]);

  // Confetti Physics engine
  const triggerConfetti = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles: Particle[] = [];
    const count = 180;
    
    // Spawn particles from center with outwards explosion direction
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 16 + 6;
      particles.push({
        x: canvas.width / 2,
        y: canvas.height * 0.45,
        size: Math.random() * 10 + 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed - 6,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        opacity: 1
      });
    }
    
    let animId: number;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.speedY += 0.22; // gravity
        p.speedX *= 0.98; // friction
        p.rotation += p.rotationSpeed;
        
        if (p.y > canvas.height - 20) {
          p.opacity -= 0.015;
        } else {
          p.opacity -= 0.002;
        }
        
        if (p.opacity > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.opacity;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });
      
      if (alive) {
        animId = requestAnimationFrame(tick);
      }
    };
    
    tick();
    
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  };

  if (!isOpen || !elegiveis || elegiveis.length === 0) return null;

  const activeSeller = candidates.current[currentIndex] || elegiveis[0];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Heavy Blur backdrop */}
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-500" />
      
      {/* Canvas for Confetti */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-10 w-full h-full" />
      
      {/* Modal Card container */}
      <div className="relative w-full max-w-lg bg-slate-900/90 border border-slate-800/80 rounded-[40px] shadow-[0_0_80px_rgba(30,58,138,0.3)] overflow-hidden flex flex-col z-20 animate-in zoom-in-95 duration-300 p-8 text-center">
        
        {/* Glow ambient effects */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Controls */}
        <div className="absolute top-6 right-6 flex items-center gap-3 z-30">
          <button
            onClick={() => setIsMuted(prev => !prev)}
            className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
            title={isMuted ? "Ativar som" : "Desativar som"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>
          
          {phase === "finished" && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/50 hover:bg-rose-600 hover:border-rose-500 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Header Campaign & Prize info */}
        <div className="space-y-1 mt-4 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
              Sorteio Real-Time • {MESES[mes - 1]} {ano}
            </span>
          </div>
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Prêmio em disputa</h2>
          <h3 className="text-xl font-black text-white uppercase tracking-tight line-clamp-1 max-w-[80%] mx-auto">
            {premio?.nome || "Prêmio da Campanha"}
          </h3>
          {premio?.valor && (
            <p className="text-lg font-black text-blue-400">
              Valor: R$ {Number(premio.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>

        {/* Roulette Display Area */}
        <div className="relative my-8 py-6 px-4 bg-slate-950/60 rounded-3xl border border-slate-800/80 overflow-hidden min-h-[220px] flex flex-col items-center justify-center z-20 shadow-inner">
          {phase === "drawing" ? (
            <div className="space-y-4 animate-pulse">
              <div className="relative">
                {/* Rotating ring effect */}
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-500/40 animate-spin [animation-duration:6s]" />
                
                <div className="w-28 h-28 rounded-full border-4 border-blue-500/30 overflow-hidden flex items-center justify-center bg-slate-900 m-2">
                  {activeSeller?.avatar ? (
                    <img
                      src={activeSeller.avatar}
                      alt={activeSeller.NOME_VENDEDOR}
                      className="w-full h-full object-cover scale-105"
                    />
                  ) : (
                    <span className="text-white text-3xl font-black uppercase">
                      {activeSeller?.NOME_VENDEDOR.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest animate-bounce">Sorteando...</p>
                <h4 className="text-lg font-black text-white uppercase tracking-tight px-4 line-clamp-1">
                  {activeSeller?.NOME_VENDEDOR}
                </h4>
                <p className="text-[10px] font-black text-slate-500 uppercase">
                  Código: {activeSeller?.COD_VENDEDOR}
                </p>
              </div>
            </div>
          ) : (
            // Celebration/Finish View
            <div className="space-y-4 w-full animate-in zoom-in-95 duration-500">
              <div className="relative flex justify-center">
                
                {/* Golden radiating backlights */}
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 to-yellow-300 rounded-full blur-2xl opacity-45 animate-pulse w-32 h-32 mx-auto" />
                
                {/* Winner avatar container with dual golden rings */}
                <div className="relative z-10 w-32 h-32 rounded-full border-4 border-amber-400 overflow-hidden flex items-center justify-center bg-slate-900 ring-8 ring-amber-500/20 shadow-2xl">
                  {ganhador?.avatar ? (
                    <img
                      src={ganhador.avatar}
                      alt={ganhador.NOME_VENDEDOR}
                      className="w-full h-full object-cover scale-105"
                    />
                  ) : (
                    <span className="text-amber-400 text-4xl font-black uppercase">
                      {ganhador?.NOME_VENDEDOR.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </span>
                  )}
                </div>

                {/* Floating Trophy badge */}
                <div className="absolute bottom-0 right-1/2 translate-x-16 z-20 w-10 h-10 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-slate-900 animate-bounce">
                  <Trophy className="w-5 h-5 text-slate-950" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-0.5 text-amber-400 text-[10px] font-black uppercase tracking-widest mb-1">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  Ganhador do Mês
                </div>
                <h4 className="text-2xl font-black text-amber-400 uppercase tracking-tight px-4 leading-tight">
                  {ganhador?.NOME_VENDEDOR}
                </h4>
                <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-400 uppercase pt-1">
                  <span>Código: {ganhador?.COD_VENDEDOR}</span>
                  {ganhador?.PERC_META_BATIDA && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                      <span className="text-emerald-400">Meta: {Number(ganhador.PERC_META_BATIDA).toFixed(1)}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footnote or Action Button */}
        {phase === "finished" ? (
          <button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-black rounded-2xl text-[12px] uppercase tracking-widest shadow-xl shadow-amber-500/20 hover:shadow-amber-500/35 transition-all active:scale-[0.98] mt-2"
          >
            Sensacional! Fechar
          </button>
        ) : (
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            Que a sorte esteja com você!
          </div>
        )}
      </div>
    </div>
  );
}
