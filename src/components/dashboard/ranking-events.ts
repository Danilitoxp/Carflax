export interface RankingSeller {
  cod: string;
  nome: string;
  vendidoHoje: number;
  metaDiaria: number;
  percentual: number;
  variacao: number | null;
  avatar?: string;
}

export type CelebrationKind = "goal" | "leader" | "double" | "team";
export interface RankingCelebration {
  id: string;
  kind: CelebrationKind;
  seller?: RankingSeller;
  team?: RankingSeller[];
  percentual: number;
  readyAt: number;
}

export function createRankingEventTracker() {
  let day = "";
  let initialized = false;
  let leader: string | undefined;
  let previous = new Map<string, RankingSeller>();
  const goals = new Set<string>();
  const doubles = new Set<string>();
  let teamWon = false;
  let serial = 0;

  return (rows: RankingSeller[], date: string, readyAt: number): RankingCelebration[] => {
    if (date !== day) {
      day = date;
      initialized = false;
      leader = undefined;
      previous.clear();
      goals.clear();
      doubles.clear();
      teamWon = false;
    }
    if (!rows.length) return [];
    const sorted = [...rows].sort((a, b) => b.percentual - a.percentual);
    const first = sorted[0];
    const events: RankingCelebration[] = [];
    const add = (kind: CelebrationKind, seller?: RankingSeller, percentual = seller?.percentual ?? 0) => {
      events.push({ id: `${date}-${++serial}`, kind, seller, percentual, readyAt,
        ...(kind === "team" ? { team: rows } : {}) });
    };
    // Ties and a disappearing seller do not announce a new champion.
    if (initialized && leader && first.cod !== leader && previous.has(first.cod)
      && rows.some((row) => row.cod === leader)
      && first.percentual > (sorted[1]?.percentual ?? 0)) add("leader", first);
    if (first.percentual > (sorted[1]?.percentual ?? -1)) leader = first.cod;

    for (const row of rows) {
      if (row.percentual >= 100 && !goals.has(row.cod)) {
        goals.add(row.cod);
        if (initialized && previous.has(row.cod)) add("goal", row);
      }
      if (row.percentual >= 200 && !doubles.has(row.cod)) {
        doubles.add(row.cod);
        if (initialized && previous.has(row.cod)) add("double", row);
      }
    }
    const target = rows.reduce((sum, row) => sum + Math.max(0, row.metaDiaria), 0);
    const sold = rows.reduce((sum, row) => sum + row.vendidoHoje, 0);
    if (target > 0 && sold >= target && !teamWon) {
      teamWon = true;
      if (initialized) add("team", undefined, sold / target * 100);
    }
    previous = new Map(rows.map((row) => [row.cod, row]));
    initialized = true;
    return events;
  };
}
