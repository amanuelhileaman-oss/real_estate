const inquiryRepository = require('../repositories/inquiryRepository');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError, ForbiddenError } = require('../utils/appError');

async function createInquiry(req, res, next) {
  try {
    const customerId = req.user ? req.user.id : null;
    const inquiry = await inquiryRepository.createInquiry({
      ...req.body,
      customerId
    });

    return successResponse(res, inquiry, 'Your inquiry has been sent to the listing agent.', 201);
  } catch (err) {
    next(err);
  }
}

async function getAgentInquiries(req, res, next) {
  try {
    const agentId = req.user.role === 'ADMIN' ? (req.query.agentId || null) : req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const { inquiries, total } = await inquiryRepository.getAgentInquiries(agentId, {
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });

    return paginatedResponse(res, inquiries, page, limit, total, 'Inquiries retrieved');
  } catch (err) {
    next(err);
  }
}

async function getMyInquiries(req, res, next) {
  try {
    const customerId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const { inquiries, total } = await inquiryRepository.getCustomerInquiries(customerId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });

    return paginatedResponse(res, inquiries, page, limit, total, 'Your inquiries retrieved');
  } catch (err) {
    next(err);
  }
}

async function updateInquiryStatus(req, res, next) {
  try {
    const inquiry = await inquiryRepository.findInquiryById(req.params.id);
    if (!inquiry) {
      throw new NotFoundError('Inquiry not found.');
    }

    if (req.user.role !== 'ADMIN' && inquiry.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to update this inquiry.');
    }

    const updated = await inquiryRepository.updateInquiryStatus(req.params.id, req.body.status);
    return successResponse(res, updated, 'Inquiry status updated');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createInquiry,
  getAgentInquiries,
  getMyInquiries,
  updateInquiryStatus
};
