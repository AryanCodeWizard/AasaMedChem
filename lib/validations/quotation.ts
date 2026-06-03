import { z } from 'zod';

const VALID_UNITS = ['g', 'kg', 'mL', 'L', 'item'] as const;

export const quotationItemSchema = z.object({
  product_id: z.string().uuid('Invalid product ID'),
  ordered_qty: z.string().regex(/^\d{1,14}(\.\d{1,6})?$/, 'Invalid quantity'),
  ordered_unit: z.enum(VALID_UNITS, { message: 'Invalid unit' }),
});

export const createQuotationSchema = z.object({
  notes: z.string().max(2000).optional(),
  items: z.array(quotationItemSchema).min(1, 'Quotation must have at least one item'),
});

export const updateQuotationSchema = z.object({
  action: z.enum(['approve', 'reject', 'cancel'], {
    message: 'Action must be one of: approve, reject, cancel',
  }),
  admin_notes: z.string().max(2000).optional(),
});

export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationInput = z.infer<typeof updateQuotationSchema>;
