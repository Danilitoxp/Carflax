import { useEffect, useRef, useState } from "react";

export const RANKING_COUNT_DURATION_MS = 2000;

interface RankingValue {
  cod: string;
  percentual: number;
}

/** Keep displayed values by seller, including moves between the list and podium. */
export function useAnimatedRanking<T extends RankingValue>(rows: T[]): T[] {
  const current = useRef(new Map<string, number>());
  const [displayed, setDisplayed] = useState(new Map<string, number>());

  useEffect(() => {
    const starts = new Map(rows.map((row) => [
      row.cod,
      current.current.get(row.cod) ?? row.percentual,
    ]));
    const changed = rows.some((row) => starts.get(row.cod) !== row.percentual);
    const startedAt = performance.now();
    let frame = 0;

    const update = (now: number) => {
      const progress = changed ? Math.min((now - startedAt) / RANKING_COUNT_DURATION_MS, 1) : 1;
      const eased = 1 - (1 - progress) ** 3;
      const next = new Map(rows.map((row) => {
        const start = starts.get(row.cod) ?? row.percentual;
        return [row.cod, progress === 1 ? row.percentual : start + (row.percentual - start) * eased];
      }));
      current.current = next;
      setDisplayed(next);
      if (progress < 1) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [rows]);

  return rows
    .map((row) => ({ ...row, percentual: displayed.get(row.cod) ?? row.percentual }))
    .sort((a, b) => b.percentual - a.percentual);
}
