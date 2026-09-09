import { useCallback, useEffect, useRef, useState } from "react";
import type { CelebrationKind, RankingCelebration } from "./ranking-events";

export type RankingSound = CelebrationKind | "overtake";
const SOUNDS: Record<RankingSound, string> = {
  goal: "/sounds/ranking-goal.mp3",
  overtake: "/sounds/ranking-overtake.wav",
  leader: "/sounds/ranking-leader.wav",
  double: "/sounds/ranking-double.wav",
  team: "/sounds/ranking-team.wav",
};

export function useRankingCelebrations() {
  const [queue, setQueue] = useState<RankingCelebration[]>([]);
  const [active, setActive] = useState<RankingCelebration | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);
  const play = useCallback((kind: RankingSound) => {
    stop();
    const audio = new Audio(SOUNDS[kind]);
    audioRef.current = audio;
    audio.volume = kind === "overtake" ? 0.35 : 0.6;
    audio.play().catch(() => {});
  }, [stop]);
  const enqueue = useCallback((events: RankingCelebration[]) => {
    if (events.length) setQueue((current) => [...current, ...events]);
  }, []);
  const close = useCallback(() => {
    stop();
    setActive(null);
    setQueue((current) => current.slice(1));
  }, [stop]);
  const clear = useCallback(() => {
    stop();
    setActive(null);
    setQueue([]);
  }, [stop]);
  const head = queue[0];

  useEffect(() => {
    if (!head) return;
    let end: ReturnType<typeof setTimeout> | undefined;
    const start = setTimeout(() => {
      setActive(head);
      play(head.kind);
      end = setTimeout(close, head.kind === "goal" ? 9000 : 6500);
    }, Math.max(300, head.readyAt - Date.now()));
    return () => {
      clearTimeout(start);
      clearTimeout(end);
      stop();
    };
  }, [head, play, close, stop]);

  useEffect(() => stop, [stop]);
  return { active, busy: queue.length > 0, enqueue, close, clear, play };
}
