import Decimal from 'decimal.js'; // Import arbitrary-precision decimal library

// Configure Decimal.js global settings
Decimal.set({
  precision: 20, // Use up to 20 significant digits
  rounding: Decimal.ROUND_HALF_EVEN, // Banker's rounding
});

export function calculateLineTotal(
  orderedQty: string | number, // Quantity entered by user
  toBase: string | number, // Conversion factor to base unit
  pricePerBase: string | number // Price per base unit
): { baseQty: string; lineTotal: string } {
  const qty = new Decimal(orderedQty); // Convert quantity to Decimal
  const factor = new Decimal(toBase); // Convert conversion factor to Decimal
  const price = new Decimal(pricePerBase); // Convert price to Decimal

  const baseQty = qty.mul(factor); // Convert ordered quantity to base quantity
  const lineTotal = baseQty.mul(price); // Calculate total amount for the line

  return {
    baseQty: baseQty.toFixed(6), // Return base quantity with 6 decimal places
    lineTotal: lineTotal.toFixed(6), // Return line total with 6 decimal places
  };
}

export function sumLineTotals(totals: string[]): string {
  const sum = totals.reduce(
    (acc, t) => acc.plus(new Decimal(t)), // Add each line total to accumulator
    new Decimal(0) // Start sum at zero
  );

  return sum.toFixed(6); // Return grand total with 6 decimal places
}