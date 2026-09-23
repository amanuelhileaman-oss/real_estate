const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const validate = require('../middlewares/validateMiddleware');
const upload = require('../config/multer');
const { authenticate, optionalAuthenticate } = require('../middlewares/authMiddleware');
const { authorizeRoles } = require('../middlewares/roleMiddleware');
const {
  createPropertySchema,
  updatePropertySchema,
  statusChangeSchema,
  propertyQuerySchema,
  geoRadiusQuerySchema,
  geoBoundsQuerySchema
} = require('../validators/propertyValidators');

// Public endpoints
router.get('/', validate(propertyQuerySchema), propertyController.getProperties);
router.get('/lookups', propertyController.getLookups);
router.get('/geo/radius', validate(geoRadiusQuerySchema), propertyController.getGeoRadius);
router.get('/geo/bounds', validate(geoBoundsQuerySchema), propertyController.getGeoBounds);
router.get('/:slugOrId', optionalAuthenticate, propertyController.getPropertyDetails);

// Authenticated Agent / Admin endpoints
router.post(
  '/',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  validate(createPropertySchema),
  propertyController.createProperty
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  validate(updatePropertySchema),
  propertyController.updateProperty
);

router.post(
  '/:id/submit',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  propertyController.submitForApproval
);

router.patch(
  '/:id/status',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  validate(statusChangeSchema),
  propertyController.changeStatus
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  propertyController.deleteProperty
);

// Media management
router.post(
  '/:id/media',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  upload.array('images', 15),
  propertyController.uploadMedia
);

router.patch(
  '/:id/media/reorder',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  propertyController.reorderMedia
);

router.delete(
  '/:id/media/:mediaId',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  propertyController.deleteMedia
);

// Property Favorites shortcuts
const favoriteController = require('../controllers/favoriteController');
router.post('/:id/favorite', authenticate, (req, res, next) => {
  req.params.propertyId = req.params.id;
  if (req.query.action === 'add' || req.body.action === 'add') {
    return favoriteController.addFavorite(req, res, next);
  }
  return favoriteController.toggleFavorite(req, res, next);
});
router.delete('/:id/favorite', authenticate, (req, res, next) => {
  req.params.propertyId = req.params.id;
  return favoriteController.removeFavorite(req, res, next);
});

// Property Inquiries shortcut
const inquiryController = require('../controllers/inquiryController');
router.post('/:id/inquiries', optionalAuthenticate, (req, res, next) => {
  req.body.propertyId = req.params.id;
  return inquiryController.createInquiry(req, res, next);
});

// Property Appointments shortcut
const appointmentController = require('../controllers/appointmentController');
router.post('/:id/appointments', authenticate, authorizeRoles('CUSTOMER', 'ADMIN'), (req, res, next) => {
  req.body.propertyId = req.params.id;
  return appointmentController.createAppointment(req, res, next);
});

module.exports = router;
