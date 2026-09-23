const appointmentRepository = require('../repositories/appointmentRepository');
const { successResponse } = require('../utils/apiResponse');
const { NotFoundError } = require('../utils/appError');

async function createAppointment(req, res, next) {
  try {
    const customerId = req.user.id;
    const appointment = await appointmentRepository.createAppointment({
      ...req.body,
      customerId
    });

    return successResponse(
      res,
      appointment,
      'Viewing appointment requested. The agent will review and confirm your slot.',
      201
    );
  } catch (err) {
    next(err);
  }
}

async function getMyAppointments(req, res, next) {
  try {
    const appointments = await appointmentRepository.getCustomerAppointments(req.user.id);
    return successResponse(res, appointments, 'Your scheduled viewings retrieved');
  } catch (err) {
    next(err);
  }
}

async function getAgentAppointments(req, res, next) {
  try {
    const agentId = req.user.role === 'ADMIN' ? (req.query.agentId || null) : req.user.id;
    const appointments = await appointmentRepository.getAgentAppointments(agentId);
    return successResponse(res, appointments, 'Agent viewing schedule retrieved');
  } catch (err) {
    next(err);
  }
}


async function updateAppointmentStatus(req, res, next) {
  try {
    const updated = await appointmentRepository.updateAppointmentStatus(
      req.params.id,
      req.body,
      req.user.id,
      req.user.role
    );

    if (!updated) {
      throw new NotFoundError('Appointment not found or unauthorized.');
    }

    return successResponse(res, updated, `Appointment updated to ${req.body.status}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAppointment,
  getMyAppointments,
  getAgentAppointments,
  updateAppointmentStatus
};
