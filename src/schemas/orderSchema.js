import { z } from 'zod';

export const checkoutSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Please enter your full name')
    .max(100, 'Name is too long'),
  phone: z
    .string()
    .min(10, 'Please enter a valid phone number')
    .regex(/^[0-9+() -]{10,18}$/, 'Invalid phone number format'),
  orderType: z.enum(['delivery', 'pickup'], {
    required_error: 'Please select delivery or pickup',
  }),
  deliveryAddress: z.string().optional(),
  notes: z.string().max(300, 'Notes cannot exceed 300 characters').optional(),
}).refine(
  (data) => {
    if (data.orderType === 'delivery') {
      return !!data.deliveryAddress && data.deliveryAddress.trim().length >= 5;
    }
    return true;
  },
  {
    message: 'Delivery address is required for delivery orders (at least 5 characters)',
    path: ['deliveryAddress'],
  }
);

