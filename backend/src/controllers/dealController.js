const dealRepository = require('../repositories/dealRepository');
const propertyRepository = require('../repositories/propertyRepository');
const notificationRepository = require('../repositories/notificationRepository');
const { successResponse } = require('../utils/apiResponse');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/appError');

async function createDeal(req, res, next) {
  try {
    const { propertyId, dealType, amount, terms, customerNotes } = req.body;

    if (!propertyId || !dealType || !amount) {
      throw new BadRequestError('Property ID, deal type (BUY_OFFER or RENT_APPLICATION), and amount are required.');
    }

    if (!['BUY_OFFER', 'RENT_APPLICATION'].includes(dealType)) {
      throw new BadRequestError('Invalid deal type. Must be BUY_OFFER or RENT_APPLICATION.');
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new BadRequestError('Amount must be a positive number.');
    }

    // Verify property exists
    const property = await propertyRepository.findBySlugOrId(propertyId);
    if (!property) {
      throw new NotFoundError('Target property not found.');
    }

    if (property.agent_id === req.user.id) {
      throw new BadRequestError('Agents cannot submit offers on their own listings.');
    }

    const deal = await dealRepository.createDeal({
      propertyId: property.id,
      customerId: req.user.id,
      agentId: property.agent_id,
      dealType,
      amount: numericAmount,
      terms: terms || {},
      customerNotes: customerNotes || ''
    });

    // Notify Agent of incoming offer / application
    const titleText =
      dealType === 'BUY_OFFER'
        ? `New Buy Offer ($${numericAmount.toLocaleString()})`
        : `New Rental Application ($${numericAmount.toLocaleString()}/mo)`;

    await notificationRepository.createNotification({
      userId: property.agent_id,
      type: dealType,
      title: titleText,
      message: `${req.user.first_name} ${req.user.last_name} submitted a ${
        dealType === 'BUY_OFFER' ? 'purchase offer' : 'lease application'
      } for "${property.title}".`,
      linkUrl: `/portal/agent/deals`,
      metadata: { dealId: deal.id, propertyId: property.id, dealType }
    });

    return successResponse(res, deal, 'Offer submitted successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function getCustomerDeals(req, res, next) {
  try {
    const { dealType, status } = req.query;
    const deals = await dealRepository.getCustomerDeals(req.user.id, { dealType, status });
    return successResponse(res, deals, 'Customer deals retrieved');
  } catch (err) {
    next(err);
  }
}

async function getAgentDeals(req, res, next) {
  try {
    const { dealType, status } = req.query;
    const deals = await dealRepository.getAgentDeals(req.user.id, { dealType, status });
    return successResponse(res, deals, 'Agent deals retrieved');
  } catch (err) {
    next(err);
  }
}

async function getDealById(req, res, next) {
  try {
    const deal = await dealRepository.getDealById(req.params.id);
    if (!deal) {
      throw new NotFoundError('Deal not found.');
    }

    // Authorization check
    if (req.user.role !== 'ADMIN' && deal.customer_id !== req.user.id && deal.agent_id !== req.user.id) {
      throw new ForbiddenError('You are not authorized to view this transaction.');
    }

    return successResponse(res, deal, 'Deal retrieved');
  } catch (err) {
    next(err);
  }
}

async function updateDealStatus(req, res, next) {
  try {
    const deal = await dealRepository.getDealById(req.params.id);
    if (!deal) {
      throw new NotFoundError('Deal not found.');
    }

    const { status, counterAmount, agentNotes, customerNotes } = req.body;
    const validStatuses = ['PENDING', 'ACCEPTED', 'COUNTERED', 'REJECTED', 'CANCELLED'];

    if (!status || !validStatuses.includes(status)) {
      throw new BadRequestError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const isAgent = deal.agent_id === req.user.id || req.user.role === 'ADMIN';
    const isCustomer = deal.customer_id === req.user.id;

    // Role-specific permission logic
    if (['ACCEPTED', 'REJECTED'].includes(status) && !isAgent && !isCustomer) {
      throw new ForbiddenError('Not authorized to update this deal.');
    }

    if (status === 'COUNTERED' && !isAgent) {
      throw new ForbiddenError('Only the listing agent can propose counter offers.');
    }

    if (status === 'CANCELLED' && !isCustomer && req.user.role !== 'ADMIN') {
      throw new ForbiddenError('Only the customer can cancel their submitted offer.');
    }

    const updated = await dealRepository.updateDealStatus(deal.id, {
      status,
      counterAmount: counterAmount ? parseFloat(counterAmount) : null,
      agentNotes,
      customerNotes
    });

    // Notify appropriate counterparty
    const notifyUserId = isAgent ? deal.customer_id : deal.agent_id;
    let notifTitle = `Deal Status Updated: ${status}`;
    let notifMsg = `Your ${deal.deal_type === 'BUY_OFFER' ? 'buy offer' : 'rental application'} for "${deal.property_title}" is now ${status}.`;

    if (status === 'ACCEPTED') {
      notifTitle = `🎉 Offer Accepted!`;
      notifMsg = `Great news! The listing agent has ACCEPTED your ${deal.deal_type === 'BUY_OFFER' ? 'buy offer' : 'rental application'} for "${deal.property_title}".`;
    } else if (status === 'COUNTERED') {
      notifTitle = `Counter-Offer Received`;
      notifMsg = `The agent proposed a counter-amount of $${parseFloat(counterAmount).toLocaleString()} for "${deal.property_title}".`;
    }

    await notificationRepository.createNotification({
      userId: notifyUserId,
      type: 'DEAL_STATUS_UPDATE',
      title: notifTitle,
      message: notifMsg,
      linkUrl: isAgent ? `/portal/customer/deals` : `/portal/agent/deals`,
      metadata: { dealId: deal.id, status }
    });

    return successResponse(res, updated, `Deal marked as ${status}`);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDeal,
  getCustomerDeals,
  getAgentDeals,
  getDealById,
  updateDealStatus
};
