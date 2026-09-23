const { z } = require('zod');

const createAppointmentSchema = z.object({
  body: z.object({
    propertyId: z.string().uuid('Invalid property ID'),
    requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
    timeSlot: z.string().min(3, 'Time slot is required'),
    alternativeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD').optional().nullable(),
    notes: z.string().max(500).optional()
  })
});

const updateAppointmentStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid appointment ID')
  }),
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'RESCHEDULED']),
    cancellationReason: z.string().optional(),
    alternativeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    timeSlot: z.string().optional()
  })
});

module.exports = {
  createAppointmentSchema,
  updateAppointmentStatusSchema
};
