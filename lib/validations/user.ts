import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  role: z.enum(['admin', 'seller']).default('seller'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().toLowerCase().optional(),
  role: z.enum(['admin', 'seller']).optional(),
  is_active: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
