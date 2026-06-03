export function formatINR(value: string | number, decimals = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

// formatINR('1234567.89') → '₹12,34,567.89' (Indian comma grouping)
export function formatINRCompact(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₹0';
  if (num >= 1_00_00_000) return `₹${(num / 1_00_00_000).toFixed(2)} Cr`;
  if (num >= 1_00_000) return `₹${(num / 1_00_000).toFixed(2)} L`;
  return formatINR(num);
}
