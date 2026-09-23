const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');

// Public agent showcase
router.get('/', agentController.getAgents);
router.get('/profile/:id', agentController.getAgentProfile);

// Agent authenticated routes
router.get('/my-listings', authenticate, authorizeRoles('AGENT', 'ADMIN'), agentController.getMyAgentListings);

module.exports = router;
