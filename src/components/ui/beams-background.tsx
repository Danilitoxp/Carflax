import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BeamsBackgroundProps {
  className?: string;
  intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

const OPACITY = { subtle: 0.7, medium: 0.85, strong: 1 };

function createBeam(width: number, height: number): Beam {
  return {
    x: Math.random() * width * 1.5 - width * 0.25,
    y: Math.random() * height * 1.5 - height * 0.25,
    width: 30 + Math.random() * 60,
    length: height * 2.5,
    angle: -35 + Math.random() * 10,
    speed: 0.6 + Math.random() * 1.2,
    opacity: 0.12 + Math.random() * 0.16,
    hue: 190 + Math.random() * 70,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.02 + Math.random() * 0.03,
  };
}

/** Decorative beams, sized to their container rather than the entire window. */
export function BeamsBackground({ className, intensity = "strong" }: BeamsBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let beams: Beam[] = [];
    let frame = 0;
    let previousTime = 0;

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      beams = Array.from({ length: 30 }, () => createBeam(width, height));
    };

    const animate = (time: number) => {
      // Keep the same speed on high-refresh displays and after returning to a tab.
      const delta = previousTime ? Math.min((time - previousTime) / (1000 / 60), 3) : 1;
      previousTime = time;
      ctx.clearRect(0, 0, width, height);
      beams.forEach((beam, index) => {
        beam.y -= beam.speed * delta;
        beam.pulse += beam.pulseSpeed * delta;
        if (beam.y + beam.length < -100) {
          const spacing = width / 3;
          beam.y = height + 100;
          beam.x = (index % 3) * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
          beam.width = 100 + Math.random() * 100;
          beam.speed = 0.5 + Math.random() * 0.4;
          beam.hue = 190 + (index * 70) / beams.length;
          beam.opacity = 0.2 + Math.random() * 0.1;
        }

        ctx.save();
        ctx.translate(beam.x, beam.y);
        ctx.rotate((beam.angle * Math.PI) / 180);
        const opacity = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * OPACITY[intensity];
        const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);
        for (const [stop, strength] of [[0, 0], [0.1, 0.5], [0.4, 1], [0.6, 1], [0.9, 0.5], [1, 0]]) {
          gradient.addColorStop(stop, `hsla(${beam.hue}, 85%, 65%, ${opacity * strength})`);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
        ctx.restore();
      });
      frame = requestAnimationFrame(animate);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    frame = requestAnimationFrame(animate);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [intensity]);

  return (
    <div ref={containerRef} aria-hidden="true" className={cn("pointer-events-none overflow-hidden bg-neutral-950", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ filter: "blur(38px)" }} />
      <motion.div
        className="absolute inset-0 bg-neutral-950/5"
        animate={{ opacity: [0.05, 0.15, 0.05] }}
        transition={{ duration: 10, ease: "easeInOut", repeat: Infinity }}
      />
    </div>
  );
}
