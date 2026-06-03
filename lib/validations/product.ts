import { z } from 'zod';

const VALID_UNITS = ['g', 'kg', 'mL', 'L', 'item'] as const;

const UNIT_DIMENSIONS: Record<string, string> = {
  g: 'weight', kg: 'weight',
  mL: 'volume', L: 'volume',
  item: 'count',
};

export const createProductSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200).trim(),
  sku: z.string().max(50).regex(/^[A-Z0-9\-]+$/, 'SKU must be uppercase alphanumeric with hyphens').optional().or(z.literal('')),
  description: z.string().max(2000).optional(),
  category_id: z.string().uuid().optional().nullable(),
  base_unit: z.enum(VALID_UNITS, { message: 'Invalid unit code' }),
  allowed_units: z.array(z.enum(VALID_UNITS)).min(1, 'At least one allowed unit is required'),
  price_per_base_unit: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/, 'Invalid price format'),
  stock_quantity: z.string().regex(/^\d{1,14}(\.\d{1,6})?$/, 'Invalid stock quantity').optional().default('0'),
  low_stock_alert: z.string().regex(/^\d{1,14}(\.\d{1,6})?$/, 'Invalid low stock value').optional().default('0'),
}).superRefine((data, ctx) => {
  // Validate all allowed_units share same dimension as base_unit
  const baseDim = UNIT_DIMENSIONS[data.base_unit];
  for (const unit of data.allowed_units) {
    if (UNIT_DIMENSIONS[unit] !== baseDim) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowed_units'],
        message: `All units must be of same dimension. '${unit}' is ${UNIT_DIMENSIONS[unit]}, but base unit '${data.base_unit}' is ${baseDim}`,
      });
    }
  }
  // base_unit must be in allowed_units
  if (!data.allowed_units.includes(data.base_unit)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['allowed_units'],
      message: `Base unit '${data.base_unit}' must be included in allowed units`,
    });
  }
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
