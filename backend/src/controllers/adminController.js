const adminRepository = require('../repositories/adminRepository');
const propertyRepository = require('../repositories/propertyRepository');
const userRepository = require('../repositories/userRepository');
const reportRepository = require('../repositories/reportRepository');
const notificationRepository = require('../repositories/notificationRepository');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError, BadRequestError } = require('../utils/appError');


async function getAnalytics(req, res, next) {
  try {
    const analytics = await adminRepository.getPlatformAnalytics();
    return successResponse(res, analytics, 'Platform analytics retrieved');
  } catch (err) {
    next(err);
  }
}

async function getModerationQueue(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const { properties, total } = await adminRepository.getModerationQueue({ page, limit });
    return paginatedResponse(res, properties, page, limit, total, 'Moderation queue retrieved');
  } catch (err) {
    next(err);
  }
}

async function approveListing(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    const updated = await propertyRepository.updateStatus(property.id, 'ACTIVE');

    await adminRepository.logAdminAction(
      req.user.id,
      'APPROVE_PROPERTY',
      'property',
      property.id,
      { status: property.status_code },
      { status: 'ACTIVE' },
      req.ip
    );

    // In-app notification for the listing agent
    await notificationRepository.createNotification({
      userId: property.agent_id,
      type: 'PROPERTY_APPROVED',
      title: 'Property Listing Approved!',
      message: `Your listing "${property.title}" has been reviewed, approved, and is now live.`,
      linkUrl: `/portal/agent/properties`,
      metadata: { propertyId: property.id, status: 'ACTIVE' }
    });

    return successResponse(res, updated, 'Property approved and published live.');
  } catch (err) {
    next(err);
  }
}

async function rejectListing(req, res, next) {
  try {
    const { reason } = req.body;
    if (!reason || reason.trim().length < 5) {
      throw new BadRequestError('A specific rejection reason of at least 5 characters is required.');
    }

    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    const updated = await propertyRepository.updateStatus(property.id, 'REJECTED', reason);

    await adminRepository.logAdminAction(
      req.user.id,
      'REJECT_PROPERTY',
      'property',
      property.id,
      { status: property.status_code },
      { status: 'REJECTED', reason },
      req.ip
    );

    // In-app notification for the listing agent
    await notificationRepository.createNotification({
      userId: property.agent_id,
      type: 'PROPERTY_REJECTED',
      title: 'Property Listing Requires Revision',
      message: `Your listing "${property.title}" was not approved. Feedback: "${reason}"`,
      linkUrl: `/portal/agent/properties/${property.id}/edit`,
      metadata: { propertyId: property.id, status: 'REJECTED', reason }
    });

    return successResponse(res, updated, 'Property listing rejected with feedback.');
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const { users, total } = await userRepository.listUsers({
      role,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search
    });

    return paginatedResponse(res, users, page, limit, total, 'Users retrieved');
  } catch (err) {
    next(err);
  }
}

async function setUserStatus(req, res, next) {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      throw new BadRequestError('isActive must be a boolean.');
    }

    const user = await userRepository.setUserActiveStatus(req.params.id, isActive);
    if (!user) throw new NotFoundError('User not found');

    await adminRepository.logAdminAction(
      req.user.id,
      isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      'user',
      user.id,
      null,
      { is_active: isActive },
      req.ip
    );

    return successResponse(res, user, `User account ${isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    next(err);
  }
}

async function getAllProperties(req, res, next) {
  try {
    const { page = 1, limit = 20, status = 'ALL', search = '' } = req.query;

    const { properties, total } = await propertyRepository.findProperties({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status: status || 'ALL',
      query: search
    });

    return paginatedResponse(res, properties, page, limit, total, 'Admin property list retrieved');
  } catch (err) {
    next(err);
  }
}

async function changePropertyStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!status) {
      throw new BadRequestError('Status is required.');
    }

    const property = await propertyRepository.findBySlugOrId(id);
    if (!property) throw new NotFoundError('Property not found');

    const targetStatus = status.toUpperCase().trim();
    if (targetStatus === 'REJECTED' && (!reason || reason.trim().length < 5)) {
      throw new BadRequestError('A specific rejection reason of at least 5 characters is required.');
    }

    const updated = await propertyRepository.updateStatus(property.id, targetStatus, reason);

    await adminRepository.logAdminAction(
      req.user.id,
      `SET_STATUS_${targetStatus}`,
      'property',
      property.id,
      { status: property.status_code },
      { status: targetStatus, reason },
      req.ip
    );

    // If approved or rejected, notify agent
    if (targetStatus === 'ACTIVE') {
      await notificationRepository.createNotification({
        userId: property.agent_id,
        type: 'PROPERTY_APPROVED',
        title: 'Property Listing Approved!',
        message: `Your listing "${property.title}" has been reviewed, approved, and is now live.`,
        linkUrl: `/portal/agent/properties`,
        metadata: { propertyId: property.id, status: 'ACTIVE' }
      });
    } else if (targetStatus === 'REJECTED') {
      await notificationRepository.createNotification({
        userId: property.agent_id,
        type: 'PROPERTY_REJECTED',
        title: 'Property Listing Requires Revision',
        message: `Your listing "${property.title}" was not approved. Feedback: "${reason}"`,
        linkUrl: `/portal/agent/properties/${property.id}/edit`,
        metadata: { propertyId: property.id, status: 'REJECTED', reason }
      });
    }

    return successResponse(res, updated, `Property status updated to ${targetStatus}`);
  } catch (err) {
    next(err);
  }
}

async function getPropertyDetails(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    const reportsRes = await reportRepository.listReports({ propertyId: property.id, limit: 10 });

    return successResponse(res, {
      ...property,
      reports: reportsRes.reports || []
    }, 'Property moderation details retrieved');
  } catch (err) {
    next(err);
  }
}

async function getAgents(req, res, next) {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const { users, total } = await userRepository.listUsers({
      role: 'AGENT',
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search
    });

    return paginatedResponse(res, users, page, limit, total, 'Agents retrieved');
  } catch (err) {
    next(err);
  }
}

async function verifyAgent(req, res, next) {
  try {
    const { isVerified = true } = req.body;
    const profile = await userRepository.setAgentVerification(req.params.id, Boolean(isVerified));
    if (!profile) throw new NotFoundError('Agent profile not found');

    await adminRepository.logAdminAction(
      req.user.id,
      isVerified ? 'VERIFY_AGENT' : 'UNVERIFY_AGENT',
      'agent_profile',
      req.params.id,
      null,
      { verified: isVerified },
      req.ip
    );

    return successResponse(res, profile, `Agent accreditation ${isVerified ? 'verified' : 'unverified'}`);
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

    return paginatedResponse(res, reports, page, limit, total, 'Platform reports retrieved');
  } catch (err) {
    next(err);
  }
}

async function updateReport(req, res, next) {
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

async function updateUser(req, res, next) {
  try {
    const existing = await userRepository.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const updated = await userRepository.updateUser(req.params.id, req.body);

    await adminRepository.logAdminAction(
      req.user.id,
      'UPDATE_USER',
      'users',
      req.params.id,
      { role: existing.role, email: existing.email },
      req.body,
      req.ip
    );

    return successResponse(res, updated, 'User profile and role updated successfully');
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    if (req.user.id === req.params.id) {
      throw new BadRequestError('You cannot delete your own administrator account.');
    }

    const existing = await userRepository.findById(req.params.id);
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    await userRepository.deleteUser(req.params.id);

    await adminRepository.logAdminAction(
      req.user.id,
      'DELETE_USER',
      'users',
      req.params.id,
      { email: existing.email, role: existing.role },
      null,
      req.ip
    );

    return successResponse(res, null, `User ${existing.email} and all associated records deleted successfully`);
  } catch (err) {
    next(err);
  }
}

async function updateProperty(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) {
      throw new NotFoundError('Property not found');
    }

    const updated = await propertyRepository.updateProperty(property.id, req.body);

    await adminRepository.logAdminAction(
      req.user.id,
      'UPDATE_PROPERTY',
      'property',
      property.id,
      null,
      req.body,
      req.ip
    );

    return successResponse(res, updated, 'Property updated successfully by admin');
  } catch (err) {
    next(err);
  }
}

async function deleteProperty(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) {
      throw new NotFoundError('Property not found');
    }

    await propertyRepository.deleteProperty(property.id);

    await adminRepository.logAdminAction(
      req.user.id,
      'DELETE_PROPERTY',
      'property',
      property.id,
      { title: property.title },
      null,
      req.ip
    );

    return successResponse(res, null, 'Property listing permanently removed by admin');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAnalytics,
  getModerationQueue,
  approveListing,
  rejectListing,
  getUsers,
  setUserStatus,
  updateUser,
  deleteUser,
  getAllProperties,
  changePropertyStatus,
  getPropertyDetails,
  updateProperty,
  deleteProperty,
  getAgents,
  verifyAgent,
  getReports,
  updateReport
};


