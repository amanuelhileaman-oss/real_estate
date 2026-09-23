const reportRepository = require('../repositories/reportRepository');
const propertyRepository = require('../repositories/propertyRepository');
const adminRepository = require('../repositories/adminRepository');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError, BadRequestError } = require('../utils/appError');

async function createReport(req, res, next) {
  try {
    const { propertyId, reportType, reason } = req.body;
    if (!propertyId || !reportType || !reason) {
      throw new BadRequestError('propertyId, reportType, and reason are required.');
    }

    const property = await propertyRepository.findBySlugOrId(propertyId);
    if (!property) {
      throw new NotFoundError('Property not found.');
    }

    const reporterId = req.user ? req.user.id : null;
    const report = await reportRepository.createReport({
      propertyId: property.id,
      reporterId,
      reportType,
      reason
    });

    return successResponse(res, report, 'Report submitted for review. Thank you for keeping ApexRealty secure.', 201);
  } catch (err) {
    next(err);
  }
}

async function getReports(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const { reports, total } = await reportRepository.listReports({
      status,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });

    return paginatedResponse(res, reports, page, limit, total, 'Reports retrieved');
  } catch (err) {
    next(err);
  }
}

async function updateReportStatus(req, res, next) {
  try {
    const { status, adminNotes } = req.body;
    const validStatuses = ['PENDING', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'];
    if (!status || !validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updated = await reportRepository.updateReportStatus(req.params.id, {
      status,
      adminNotes,
      resolvedBy: req.user.id
    });

    if (!updated) {
      throw new NotFoundError('Report not found');
    }

    await adminRepository.logAdminAction(
      req.user.id,
      'UPDATE_REPORT_STATUS',
      'report',
      req.params.id,
      null,
      { status, adminNotes },
      req.ip
    );

    return successResponse(res, updated, `Report status updated to ${status}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createReport,
  getReports,
  updateReportStatus
};
