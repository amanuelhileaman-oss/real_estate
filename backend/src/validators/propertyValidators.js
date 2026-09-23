const { z } = require('zod');

const emptyToNull = (schema) =>
  z.preprocess((val) => (val === '' || val === undefined ? null : val), schema.nullable().optional());

const createPropertySchema = z.object({
  body: z.object({
    propertyTypeCode: z.string({ required_error: 'Property type is required' }).min(1, 'Property type is required'),
    listingTypeCode: z.enum(['FOR_SALE', 'FOR_RENT'], { required_error: 'Listing type is required' }),
    title: z.string({ required_error: 'Title is required' }).min(5, 'Title must be at least 5 characters').max(255),
    description: z.string({ required_error: 'Description is required' }).min(20, 'Description must be at least 20 characters'),
    price: z.coerce.number({ required_error: 'Price is required' }).positive('Price must be greater than zero'),
    currency: z.string().default('USD'),
    pricePeriod: emptyToNull(z.enum(['MONTHLY', 'YEARLY', 'DAILY'])),
    bedrooms: emptyToNull(z.coerce.number().int().min(0)),
    bathrooms: emptyToNull(z.coerce.number().min(0)),
    areaSqm: z.coerce.number({ required_error: 'Area is required' }).positive('Area must be greater than zero'),
    lotSizeSqm: emptyToNull(z.coerce.number().min(0)),
    yearBuilt: emptyToNull(z.coerce.number().int().min(1800).max(new Date().getFullYear() + 2)),
    parkingSpaces: z.preprocess((val) => (val === '' || val === undefined ? 0 : val), z.coerce.number().int().min(0).default(0)),
    furnishedStatus: z.preprocess((val) => (val === '' || val === undefined ? 'UNFURNISHED' : val), z.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED']).default('UNFURNISHED')),
    amenities: z.array(z.string()).or(z.string().transform(str => {
      try { return JSON.parse(str); } catch { return []; }
    })).default([]),
    features: z.array(z.string()).or(z.string().transform(str => {
      try { return JSON.parse(str); } catch { return []; }
    })).default([]),
    country: z.string({ required_error: 'Country is required' }).min(2).max(100),
    stateRegion: z.string({ required_error: 'State or region is required' }).min(2).max(100),
    city: z.string({ required_error: 'City is required' }).min(2).max(100),
    subcityDistrict: emptyToNull(z.string().max(100)),
    streetAddress: z.string({ required_error: 'Street address is required' }).min(3).max(255),
    postalCode: emptyToNull(z.string().max(30)),
    latitude: z.coerce.number({ required_error: 'Latitude is required' }).min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90'),
    longitude: z.coerce.number({ required_error: 'Longitude is required' }).min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180'),
    status: z.enum(['DRAFT', 'PENDING', 'PENDING_APPROVAL']).default('PENDING_APPROVAL')
  })
}).superRefine((data, ctx) => {
  if (data.body.listingTypeCode === 'FOR_RENT' && !data.body.pricePeriod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['body', 'pricePeriod'],
      message: 'Rental terms (price period) are required for FOR_RENT properties'
    });
  }
  if (data.body.listingTypeCode === 'FOR_SALE' && data.body.pricePeriod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['body', 'pricePeriod'],
      message: 'Sale properties should not have a rental price period'
    });
  }
});

const updatePropertySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid property ID')
  }),
  body: z.object({
    propertyTypeCode: z.string().optional(),
    listingTypeCode: z.enum(['FOR_SALE', 'FOR_RENT']).optional(),
    title: z.string().min(5).max(255).optional(),
    description: z.string().min(20).optional(),
    price: z.coerce.number().positive('Price must be greater than zero').optional(),
    currency: z.string().optional(),
    pricePeriod: emptyToNull(z.enum(['MONTHLY', 'YEARLY', 'DAILY'])),
    bedrooms: emptyToNull(z.coerce.number().int().min(0)),
    bathrooms: emptyToNull(z.coerce.number().min(0)),
    areaSqm: z.coerce.number().positive('Area must be greater than zero').optional(),
    lotSizeSqm: emptyToNull(z.coerce.number().min(0)),
    yearBuilt: emptyToNull(z.coerce.number().int().min(1800)),
    parkingSpaces: emptyToNull(z.coerce.number().int().min(0)),
    furnishedStatus: z.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED']).optional(),
    amenities: z.array(z.string()).or(z.string().transform(str => {
      try { return JSON.parse(str); } catch { return []; }
    })).optional(),
    features: z.array(z.string()).or(z.string().transform(str => {
      try { return JSON.parse(str); } catch { return []; }
    })).optional(),
    country: z.string().optional(),
    stateRegion: z.string().optional(),
    city: z.string().optional(),
    subcityDistrict: emptyToNull(z.string().max(100)),
    streetAddress: z.string().optional(),
    postalCode: emptyToNull(z.string().max(30)),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional()
  })
}).superRefine((data, ctx) => {
  if (data.body.listingTypeCode === 'FOR_RENT' && data.body.pricePeriod === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['body', 'pricePeriod'],
      message: 'Rental terms (price period) are required for FOR_RENT properties'
    });
  }
  if (data.body.listingTypeCode === 'FOR_SALE' && data.body.pricePeriod) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['body', 'pricePeriod'],
      message: 'Sale properties should not have a rental price period'
    });
  }
});

const statusChangeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid property ID')
  }),
  body: z.object({
    status: z.string().min(1, 'Status is required'),
    rejectionReason: z.string().optional().nullable()
  })
});

const availabilityStatusChangeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid property ID')
  }),
  body: z.object({
    availabilityStatus: z.enum(['AVAILABLE', 'UNDER_OFFER', 'RESERVED', 'SOLD', 'RENTED', 'UNAVAILABLE'])
  })
});

const propertyQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
    limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
    type: z.string().optional(),
    propertyType: z.string().optional(),
    propertyTypeCode: z.string().optional(),
    listingType: z.enum(['FOR_SALE', 'FOR_RENT']).optional(),
    listingTypeCode: z.enum(['FOR_SALE', 'FOR_RENT']).optional(),
    minPrice: z.coerce.number().min(0, 'Minimum price must be >= 0').optional(),
    maxPrice: z.coerce.number().min(0, 'Maximum price must be >= 0').optional(),
    bedrooms: z.coerce.number().int().min(0, 'Bedrooms must be >= 0').optional(),
    minBeds: z.coerce.number().int().min(0, 'Minimum bedrooms must be >= 0').optional(),
    bathrooms: z.coerce.number().min(0, 'Bathrooms must be >= 0').optional(),
    minBaths: z.coerce.number().min(0, 'Minimum bathrooms must be >= 0').optional(),
    minArea: z.coerce.number().min(0, 'Minimum area must be >= 0').optional(),
    maxArea: z.coerce.number().min(0, 'Maximum area must be >= 0').optional(),
    furnishedStatus: z.enum(['FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED']).optional(),
    city: z.string().optional(),
    location: z.string().optional(),
    query: z.string().optional(),
    search: z.string().optional(),
    q: z.string().optional(),
    status: z.string().optional(),
    sortBy: z.enum([
      'newest',
      'oldest',
      'price_asc',
      'price_desc',
      'area_desc',
      'area_asc',
      'distance'
    ]).default('newest'),
    features: z.string().or(z.array(z.string())).optional(),
    amenities: z.string().or(z.array(z.string())).optional(),
    // PostGIS Spatial options
    lat: z.coerce.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
    lng: z.coerce.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
    radius: z.coerce.number().positive('Radius must be a positive number in km').max(500, 'Radius cannot exceed 500 km').optional()
  })
});

const geoRadiusQuerySchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().positive().max(200).default(20), // km
    limit: z.coerce.number().int().min(1).max(200).default(50),
    type: z.string().optional(),
    listingType: z.enum(['FOR_SALE', 'FOR_RENT']).optional()
  })
});

const geoBoundsQuerySchema = z.object({
  query: z.object({
    minLng: z.coerce.number().min(-180).max(180),
    minLat: z.coerce.number().min(-90).max(90),
    maxLng: z.coerce.number().min(-180).max(180),
    maxLat: z.coerce.number().min(-90).max(90),
    limit: z.coerce.number().int().min(1).max(300).default(100)
  })
});

module.exports = {
  createPropertySchema,
  updatePropertySchema,
  statusChangeSchema,
  availabilityStatusChangeSchema,
  propertyQuerySchema,
  geoRadiusQuerySchema,
  geoBoundsQuerySchema
};
