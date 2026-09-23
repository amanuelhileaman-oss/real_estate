/**
 * Standardized JSON API Response Builder
 */

function successResponse(res, data = null, message = 'Success', statusCode = 200, meta = null) {
  const responsePayload = {
    success: true,
    message,
    data
  };

  if (meta) {
    responsePayload.meta = meta;
  }

  return res.status(statusCode).json(responsePayload);
}

function paginatedResponse(res, items, page, limit, total, message = 'Success') {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const totalCount = parseInt(total, 10);
  const totalPages = Math.ceil(totalCount / limitNum);
  return res.status(200).json({
    success: true,
    message,
    data: items,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      totalItems: totalCount,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  });
}

function errorResponse(res, message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
  const payload = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details && { details })
    }
  };

  return res.status(statusCode).json(payload);
}

module.exports = {
  successResponse,
  paginatedResponse,
  errorResponse
};
