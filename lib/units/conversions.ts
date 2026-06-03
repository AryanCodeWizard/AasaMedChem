export type UnitCode = 'g' | 'kg' | 'mL' | 'L' | 'item';

export interface UnitRow {
  code: UnitCode;
  label: string;
  dimension: 'weight' | 'volume' | 'count';
  base_unit: UnitCode;
  to_base: string;
}

// Static unit definitions (mirrors DB seed) — used on client side
export const UNIT_DEFINITIONS: UnitRow[] = [
  { code: 'g',    label: 'Grams',       dimension: 'weight', base_unit: 'g',    to_base: '1' },
  { code: 'kg',   label: 'Kilograms',   dimension: 'weight', base_unit: 'g',    to_base: '1000' },
  { code: 'mL',   label: 'Millilitres', dimension: 'volume', base_unit: 'mL',   to_base: '1' },
  { code: 'L',    label: 'Litres',      dimension: 'volume', base_unit: 'mL',   to_base: '1000' },
  { code: 'item', label: 'Items',       dimension: 'count',  base_unit: 'item', to_base: '1' },
];

export function toBaseUnit(qty: number, fromUnit: UnitCode, units: UnitRow[] = UNIT_DEFINITIONS): number {
  const unit = units.find(u => u.code === fromUnit);
  if (!unit) throw new Error(`Unknown unit: ${fromUnit}`);
  return qty * parseFloat(unit.to_base);
}

export function fromBaseUnit(baseQty: number, toUnit: UnitCode, units: UnitRow[] = UNIT_DEFINITIONS): number {
  const unit = units.find(u => u.code === toUnit);
  if (!unit) throw new Error(`Unknown unit: ${toUnit}`);
  return baseQty / parseFloat(unit.to_base);
}

export function getDimension(unit: UnitCode, units: UnitRow[] = UNIT_DEFINITIONS): string {
  return units.find(u => u.code === unit)?.dimension ?? 'unknown';
}

export function getUnitsForDimension(dimension: string, units: UnitRow[] = UNIT_DEFINITIONS): UnitRow[] {
  return units.filter(u => u.dimension === dimension);
}

// Format a base quantity in a human-readable form
export function formatBaseQty(baseQty: string | number, baseUnit: UnitCode): string {
  const qty = typeof baseQty === 'string' ? parseFloat(baseQty) : baseQty;
  if (baseUnit === 'g' && qty >= 1000) {
    return `${(qty / 1000).toLocaleString('en-IN', { maximumFractionDigits: 4 })} kg`;
  }
  if (baseUnit === 'mL' && qty >= 1000) {
    return `${(qty / 1000).toLocaleString('en-IN', { maximumFractionDigits: 4 })} L`;
  }
  return `${qty.toLocaleString('en-IN', { maximumFractionDigits: 4 })} ${baseUnit}`;
}
