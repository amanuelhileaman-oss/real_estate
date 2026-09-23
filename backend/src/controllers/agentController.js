const userRepository = require('../repositories/userRepository');
const propertyRepository = require('../repositories/propertyRepository');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { NotFoundError } = require('../utils/appError');

async function getAgents(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 12;
    const search = req.query.search || '';

    const { users, total } = await userRepository.listUsers({
      role: 'AGENT',
      page,
      limit,
      search
    });

    return paginatedResponse(res, users, page, limit, total, 'Agents retrieved');
  } catch (err) {
    next(err);
  }
}

async function getAgentProfile(req, res, next) {
  try {
    const agent = await userRepository.findById(req.params.id);
    if (!agent || agent.role !== 'AGENT') {
      throw new NotFoundError('Agent not found');
    }

    // Fetch active listings for this agent
    const { properties } = await propertyRepository.findProperties({
      agentId: agent.id,
      status: 'ACTIVE',
      limit: 20
    });

    return successResponse(res, { ...agent, activeListings: properties }, 'Agent profile retrieved');
  } catch (err) {
    next(err);
  }
}

async function getMyAgentListings(req, res, next) {
  try {
    const status = req.query.status || null; // null returns all statuses for this agent
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const { properties, total } = await propertyRepository.findProperties({
      agentId: req.user.id,
      status,
      page,
      limit
    });

    return paginatedResponse(res, properties, page, limit, total, 'My listings retrieved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAgents,
  getAgentProfile,
  getMyAgentListings
};
