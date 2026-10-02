interface RankedSeller {
  cod: string;
  percentual: number;
}

// Só conta ultrapassagem de quem avançou mais que isso (em pontos de % da meta)
// desde a última leitura: movimento pequeno não dispara som.
const MOVIMENTO_MINIMO = 10;

export function hasOvertake(previous: RankedSeller[], next: RankedSeller[]): boolean {
  const before = new Map(previous.map((seller) => [seller.cod, seller.percentual]));
  return next.some((seller) => next.some((other) => {
    const sellerBefore = before.get(seller.cod);
    const otherBefore = before.get(other.cod);
    return seller.cod !== other.cod && sellerBefore !== undefined && otherBefore !== undefined
      && sellerBefore <= otherBefore && seller.percentual > other.percentual
      && seller.percentual - sellerBefore > MOVIMENTO_MINIMO;
  }));
}
