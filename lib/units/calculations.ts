import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_EVEN });

export function calculateLineTotal(
  orderedQty: string | number,
  toBase: string | number,
  pricePerBase: string | number
): { baseQty: string; lineTotal: string } {
  const qty = new Decimal(orderedQty);
  const factor = new Decimal(toBase);
  const price = new Decimal(pricePerBase);

  const baseQty = qty.mul(factor);
  const lineTotal = baseQty.mul(price);

  return {
    baseQty: baseQty.toFixed(6),
    lineTotal: lineTotal.toFixed(6),
  };
}

export function sumLineTotals(totals: string[]): string {
  const sum = totals.reduce((acc, t) => acc.plus(new Decimal(t)), new Decimal(0));
  return sum.toFixed(6);
}
