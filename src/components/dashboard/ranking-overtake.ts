interface RankedSeller {
  cod: string;
  percentual: number;
}

export function hasOvertake(previous: RankedSeller[], next: RankedSeller[]): boolean {
  const before = new Map(previous.map((seller) => [seller.cod, seller.percentual]));
  return next.some((seller) => next.some((other) => {
    const sellerBefore = before.get(seller.cod);
    const otherBefore = before.get(other.cod);
    return seller.cod !== other.cod && sellerBefore !== undefined && otherBefore !== undefined
      && sellerBefore <= otherBefore && seller.percentual > other.percentual;
  }));
}
