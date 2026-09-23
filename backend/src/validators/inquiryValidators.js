const { z } = require('zod');

const createInquirySchema = z.object({
  body: z.object({
    propertyId: z.string().uuid('Invalid property ID'),
    name: z.string().min(2, 'Name is required').max(150),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
    message: z.string().min(10, 'Message must be at least 10 characters long')
  })
});

const updateInquiryStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid inquiry ID')
  }),
  body: z.object({
    status: z.enum(['NEW', 'CONTACTED', 'CLOSED'])
  })
});

module.exports = {
  createInquirySchema,
  updateInquiryStatusSchema
};
