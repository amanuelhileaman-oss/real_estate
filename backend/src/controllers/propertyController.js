const propertyRepository = require('../repositories/propertyRepository');
const favoriteRepository = require('../repositories/favoriteRepository');
const notificationRepository = require('../repositories/notificationRepository');
const mediaService = require('../services/mediaService');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../utils/appError');

async function getProperties(req, res, next) {
  try {
    const { page = 1, limit = 12, sortBy = 'newest', ...filters } = req.query;

    const { properties, total } = await propertyRepository.findProperties({
      page,
      limit,
      sortBy,
      ...filters
    });

    return paginatedResponse(res, properties, page, limit, total, 'Properties retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getGeoRadius(req, res, next) {
  try {
    const { lat, lng, radius = 25, limit = 50, type, listingType } = req.query;

    const properties = await propertyRepository.findWithinRadius({
      lat,
      lng,
      radiusKm: radius,
      limit,
      type,
      listingType
    });

    return successResponse(res, properties, `Properties within ${radius}km retrieved successfully`);
  } catch (err) {
    next(err);
  }
}

async function getGeoBounds(req, res, next) {
  try {
    const { minLng, minLat, maxLng, maxLat, limit = 100 } = req.query;

    const properties = await propertyRepository.findWithinBounds({
      minLng,
      minLat,
      maxLng,
      maxLat,
      limit
    });

    return successResponse(res, properties, 'Viewport properties retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function getPropertyDetails(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.slugOrId);
    if (!property) {
      throw new NotFoundError('Property listing not found.');
    }

    // Check if favorited by current user if authenticated
    let isFavorited = false;
    if (req.user) {
      isFavorited = await favoriteRepository.isFavorited(req.user.id, property.id);
    }

    return successResponse(res, { ...property, isFavorited }, 'Property retrieved successfully');
  } catch (err) {
    next(err);
  }
}

async function createProperty(req, res, next) {
  try {
    let agentId = req.user.id;
    if (req.user.role === 'ADMIN' && req.body.agentId) {
      agentId = req.body.agentId;
    }
    const property = await propertyRepository.createProperty(req.body, agentId);

    return successResponse(
      res,
      property,
      'Property listing created and submitted for approval',
      201
    );
  } catch (err) {
    next(err);
  }
}

async function updateProperty(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    if (req.user.role !== 'ADMIN' && property.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to edit this listing.');
    }

    const updated = await propertyRepository.updateProperty(property.id, req.body);
    return successResponse(res, updated, 'Property updated successfully');
  } catch (err) {
    next(err);
  }
}

async function submitForApproval(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    if (req.user.role !== 'ADMIN' && property.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to submit this listing for approval.');
    }

    const updated = await propertyRepository.updateStatus(property.id, 'PENDING');
    return successResponse(res, updated, 'Property listing submitted for administrator approval');
  } catch (err) {
    next(err);
  }
}

async function changeStatus(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    if (req.user.role !== 'ADMIN' && property.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to update this listing status.');
    }

    const { status, rejectionReason } = req.body;
    const targetStatus = (status || '').toUpperCase().trim();

    // Security check: Agents cannot approve or reject listings themselves
    if (req.user.role !== 'ADMIN') {
      const allowedAgentStatuses = [
        'DRAFT',
        'PENDING',
        'PENDING_APPROVAL',
        'SOLD',
        'RENTED',
        'UNAVAILABLE',
        'ARCHIVED'
      ];
      if (!allowedAgentStatuses.includes(targetStatus)) {
        throw new ForbiddenError(
          `Agents are not authorized to transition property status to '${status}'. Only administrators can approve or reject listings.`
        );
      }
    } else {
      if (targetStatus === 'REJECTED' && (!rejectionReason || rejectionReason.trim().length < 5)) {
        throw new BadRequestError('A specific rejection reason of at least 5 characters is required when rejecting a listing.');
      }
    }

    const updated = await propertyRepository.updateStatus(property.id, targetStatus, rejectionReason);

    // If approved or rejected by admin, notify agent
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
        message: `Your listing "${property.title}" was not approved. Feedback: "${rejectionReason || 'No feedback provided'}"`,
        linkUrl: `/portal/agent/properties/${property.id}/edit`,
        metadata: { propertyId: property.id, status: 'REJECTED', reason: rejectionReason }
      });
    }

    return successResponse(res, updated, `Property status updated to ${targetStatus}`);
  } catch (err) {
    next(err);
  }
}

async function deleteProperty(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    if (req.user.role !== 'ADMIN' && property.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to delete this listing.');
    }

    await propertyRepository.deleteProperty(property.id);
    return successResponse(res, null, 'Property deleted successfully');
  } catch (err) {
    next(err);
  }
}

async function uploadMedia(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    if (req.user.role !== 'ADMIN' && property.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to upload images to this listing.');
    }

    if (!req.files || req.files.length === 0) {
      throw new BadRequestError('No image files provided for upload.');
    }

    const uploadedAssets = [];
    const currentMediaCount = property.media ? property.media.length : 0;

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const processed = await mediaService.processAndSaveImage(file.buffer, file.originalname);

      const isPrimary = currentMediaCount === 0 && i === 0;
      const mediaRecord = await propertyRepository.addMedia(property.id, {
        url: processed.url,
        thumbnailUrl: processed.thumbnailUrl,
        fileKey: processed.fileKey,
        sortOrder: currentMediaCount + i,
        isPrimary
      });

      uploadedAssets.push(mediaRecord);
    }

    return successResponse(res, uploadedAssets, 'Media uploaded successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function deleteMedia(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    if (req.user.role !== 'ADMIN' && property.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to delete media from this listing.');
    }

    const deleted = await propertyRepository.deleteMedia(property.id, req.params.mediaId);
    if (deleted && deleted.file_key) {
      await mediaService.deleteImageFiles(deleted.file_key);
    }

    return successResponse(res, null, 'Media asset deleted successfully');
  } catch (err) {
    next(err);
  }
}

async function reorderMedia(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.id);
    if (!property) throw new NotFoundError('Property not found');

    if (req.user.role !== 'ADMIN' && property.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to modify media for this listing.');
    }

    await propertyRepository.reorderMedia(property.id, req.body.mediaOrders);
    return successResponse(res, null, 'Media order updated successfully');
  } catch (err) {
    next(err);
  }
}

async function getLookups(req, res, next) {
  try {
    const lookups = await propertyRepository.getLookups();
    return successResponse(res, lookups, 'Lookups retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProperties,
  getGeoRadius,
  getGeoBounds,
  getPropertyDetails,
  createProperty,
  updateProperty,
  submitForApproval,
  changeStatus,
  deleteProperty,
  uploadMedia,
  deleteMedia,
  reorderMedia,
  getLookups
};
