import { useEffect, useRef, useState } from "react";

/** Positive values mean positions gained; new/removed sellers do not get a badge. */
export function positionChanges(previous: string[], current: string[]): Record<string, number> {
  const before = new Map(previous.map((cod, index) => [cod, index]));
  return Object.fromEntries(current.flatMap((cod, index) => {
    const old = before.get(cod);
    return old !== undefined && old !== index ? [[cod, old - index]] : [];
  }));
}

export function useRankingMovement(codes: string[], paused: boolean) {
  const order = JSON.stringify(codes);
  const previous = useRef<string[]>([]);
  const totals = useRef<Record<string, number>>({});
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const current: string[] = JSON.parse(order);
    const changes = positionChanges(previous.current, current);
    previous.current = current;
    if (!Object.keys(changes).length) return;
    const next = { ...totals.current };
    for (const [cod, change] of Object.entries(changes)) {
      next[cod] = (next[cod] ?? 0) + change;
      if (next[cod] === 0) delete next[cod];
    }
    for (const cod of Object.keys(next)) if (!current.includes(cod)) delete next[cod];
    totals.current = next;
    const frame = requestAnimationFrame(() => setBadges(next));
    return () => cancelAnimationFrame(frame);
  }, [order]);

  // Give viewers eight visible seconds, even when a celebration covers the ranking.
  useEffect(() => {
    if (paused || !Object.keys(badges).length) return;
    const timer = setTimeout(() => {
      totals.current = {};
      setBadges({});
    }, 8000);
    return () => clearTimeout(timer);
  }, [badges, paused]);

  return badges;
}
