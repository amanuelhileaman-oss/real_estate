const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const { authenticate } = require('../middlewares/authMiddleware');

router.use(authenticate);

// List user favorites
router.get('/', favoriteController.getFavorites);

// Check if property is favorited
router.get('/check/:propertyId', favoriteController.checkFavorite);

// Explicit add
router.post('/:propertyId/add', favoriteController.addFavorite);

// Explicit remove
router.delete('/:propertyId', favoriteController.removeFavorite);

// Default POST: if ?action=add, adds; otherwise toggles
router.post('/:propertyId', (req, res, next) => {
  if (req.query.action === 'add' || req.body.action === 'add') {
    return favoriteController.addFavorite(req, res, next);
  }
  return favoriteController.toggleFavorite(req, res, next);
});

module.exports = router;
