const { z } = require('zod');

const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,128}$/;

const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .transform((val) => val.toLowerCase()),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters')
      .regex(
        passwordRegex,
        'Password must be 8-128 characters long and contain at least one letter and one number'
      ),
    role: z.enum(['CUSTOMER', 'AGENT'], {
      errorMap: () => ({ message: 'Role must be either CUSTOMER or AGENT' })
    }),
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(100),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').max(100),
    phone: z.string().trim().max(30).optional(),
    agencyName: z.string().trim().max(150).optional(),
    licenseNumber: z.string().trim().max(100).optional(),
    bio: z.string().trim().max(2000).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email('Invalid email address')
      .transform((val) => val.toLowerCase()),
    password: z.string().min(1, 'Password is required')
  })
});

const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2).max(100).optional(),
    lastName: z.string().trim().min(2).max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    avatarUrl: z.string().trim().url().optional().or(z.literal('')),
    agencyName: z.string().trim().max(150).optional(),
    bio: z.string().trim().max(2000).optional(),
    officeAddress: z.string().trim().max(500).optional(),
    officePhone: z.string().trim().max(30).optional(),
    websiteUrl: z.string().trim().url().optional().or(z.literal(''))
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema
};
