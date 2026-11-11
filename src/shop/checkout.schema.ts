import { z } from 'zod';

export const positiveId = z.number().int().positive().max(2147483647);

export const checkoutSchema = z
  .strictObject({
    checkout_key: z.uuid(),
    customer: z.strictObject({
      first_name: z.string().trim().min(1).max(50),
      last_name: z.string().trim().min(1).max(50),
      email: z.email().max(100),
      phone: z
        .string()
        .trim()
        .min(7)
        .max(20)
        .regex(/^[+\d\s()-]+$/),
      address: z.string().trim().max(255),
    }),
    fulfillment: z.enum(['pickup', 'delivery']),
    notes: z.string().trim().max(500),
    payment_method: z.literal('mock'),
    items: z
      .array(
        z.strictObject({
          flower_id: positiveId,
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(50),
  })
  .superRefine((value, context) => {
    if (value.fulfillment === 'delivery' && !value.customer.address) {
      context.addIssue({
        code: 'custom',
        path: ['customer', 'address'],
        message: 'Enter a delivery address.',
      });
    }
    if (
      new Set(value.items.map((item) => item.flower_id)).size !==
      value.items.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Each flower must appear only once.',
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function priceInCents(value: string | number): number {
  const text = String(value);
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(text))
    throw new Error('Invalid stored price');
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
