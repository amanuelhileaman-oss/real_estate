const favoriteRepository = require('../repositories/favoriteRepository');
const propertyRepository = require('../repositories/propertyRepository');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError } = require('../utils/appError');

async function addFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    const property = await propertyRepository.findBySlugOrId(propertyId);
    if (!property) {
      throw new NotFoundError('Property listing not found');
    }

    const result = await favoriteRepository.addFavorite(userId, property.id);
    return successResponse(res, result, 'Property added to favorites', 201);
  } catch (err) {
    next(err);
  }
}

async function removeFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    // Resolve property ID in case slug was passed
    const property = await propertyRepository.findBySlugOrId(propertyId);
    const targetId = property ? property.id : propertyId;

    const result = await favoriteRepository.removeFavorite(userId, targetId);
    return successResponse(res, result, 'Property removed from favorites');
  } catch (err) {
    next(err);
  }
}

async function toggleFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    const property = await propertyRepository.findBySlugOrId(propertyId);
    if (!property) {
      throw new NotFoundError('Property listing not found');
    }

    const isFav = await favoriteRepository.isFavorited(userId, property.id);
    let result;
    if (isFav) {
      result = await favoriteRepository.removeFavorite(userId, property.id);
    } else {
      result = await favoriteRepository.addFavorite(userId, property.id);
    }

    return successResponse(res, result, isFav ? 'Removed from favorites' : 'Added to favorites');
  } catch (err) {
    next(err);
  }
}

async function getFavorites(req, res, next) {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;

    const { properties, total } = await favoriteRepository.getUserFavorites(userId, page, limit);
    return paginatedResponse(res, properties, page, limit, total, 'Favorites retrieved');
  } catch (err) {
    next(err);
  }
}

async function checkFavorite(req, res, next) {
  try {
    const property = await propertyRepository.findBySlugOrId(req.params.propertyId);
    const targetId = property ? property.id : req.params.propertyId;

    const isFav = await favoriteRepository.isFavorited(req.user.id, targetId);
    return successResponse(res, { favorited: isFav });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addFavorite,
  removeFavorite,
  toggleFavorite,
  getFavorites,
  checkFavorite
};
