const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const validate = require('../middlewares/validateMiddleware');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const { createAppointmentSchema, updateAppointmentStatusSchema } = require('../validators/appointmentValidators');

router.use(authenticate);

// Customer bookings
router.post('/', authorizeRoles('CUSTOMER', 'ADMIN'), validate(createAppointmentSchema), appointmentController.createAppointment);
router.get('/my', authorizeRoles('CUSTOMER', 'ADMIN'), appointmentController.getMyAppointments);

// Agent viewing schedule
router.get('/agent', authorizeRoles('AGENT', 'ADMIN'), appointmentController.getAgentAppointments);

// Status updates (confirm, cancel, reschedule)
router.patch('/:id/status', validate(updateAppointmentStatusSchema), appointmentController.updateAppointmentStatus);

module.exports = router;
