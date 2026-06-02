import { z } from 'zod';

/** Phone number: +234 followed by exactly 10 digits */
export const phoneSchema = z
  .string()
  .regex(/^\+234\d{10}$/, 'Phone number must be in format +234 followed by exactly 10 digits');

/** Full name: 2-100 characters */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

/** User roles */
export const roleSchema = z.enum(['Driver', 'Operator', 'FleetManager']);

/** OTP: exactly 6 digits */
export const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'OTP must be exactly 6 digits');

/** Keke types */
export const kekeTypeSchema = z.enum(['Bajaj', 'TVS', 'Piaggio', 'Other']);

/** Vehicle registration: non-empty string */
export const vehicleRegSchema = z
  .string()
  .min(1, 'Vehicle registration is required')
  .max(20, 'Vehicle registration must be at most 20 characters');

/** Registration request schema */
export const registerSchema = z.object({
  phone: phoneSchema,
  name: nameSchema,
  role: roleSchema,
  vehicleReg: vehicleRegSchema.optional(),
  kekeType: kekeTypeSchema.optional(),
}).refine(
  (data) => {
    if (data.role === 'Driver') {
      return !!data.vehicleReg && !!data.kekeType;
    }
    return true;
  },
  {
    message: 'Drivers must provide vehicleReg and kekeType',
    path: ['vehicleReg'],
  }
);

/** OTP request schema */
export const otpRequestSchema = z.object({
  phone: phoneSchema,
});

/** OTP verify schema */
export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: otpSchema,
});

/** Refresh token schema */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
