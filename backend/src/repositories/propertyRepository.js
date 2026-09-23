const db = require('../config/db');
const slugify = require('slugify');

/**
 * Generates a unique slug for a property title
 */
async function generateUniqueSlug(title) {
  let baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.query('SELECT id FROM properties WHERE slug = $1', [slug]);
    if (existing.rows.length === 0) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Multi-facet Property Search with optional PostGIS spatial radius filtering
 */
async function findProperties({
  page = 1,
  limit = 20,
  type,
  propertyType,
  propertyTypeCode,
  listingType,
  listingTypeCode,
  minPrice,
  maxPrice,
  bedrooms,
  minBeds,
  bathrooms,
  minBaths,
  minArea,
  maxArea,
  furnishedStatus,
  city,
  location,
  query,
  search,
  q,
  sortBy = 'newest',
  features,
  amenities,
  lat,
  lng,
  radius,
  status = 'ACTIVE',
  agentId = null
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;
  const whereClauses = [];
  const params = [];

  // Filter by status (defaults to public visible: ACTIVE, APPROVED, AVAILABLE)
  if (status === 'ACTIVE' || status === 'AVAILABLE' || status === 'APPROVED' || !status) {
    whereClauses.push(`ps.code IN ('ACTIVE', 'APPROVED', 'AVAILABLE')`);
  } else if (status !== 'ALL') {
    params.push(status.toUpperCase());
    whereClauses.push(`ps.code = $${params.length}`);
  }

  if (agentId) {
    params.push(agentId);
    whereClauses.push(`p.agent_id = $${params.length}`);
  }

  // Property Type filter
  const resolvedType = type || propertyType || propertyTypeCode;
  if (resolvedType) {
    params.push(resolvedType.toUpperCase());
    whereClauses.push(`pt.code = $${params.length}`);
  }

  // Listing Type filter
  const resolvedListingType = listingType || listingTypeCode;
  if (resolvedListingType) {
    params.push(resolvedListingType.toUpperCase());
    whereClauses.push(`lt.code = $${params.length}`);
  }

  // Price range filters
  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    params.push(Number(minPrice));
    whereClauses.push(`p.price >= $${params.length}`);
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    params.push(Number(maxPrice));
    whereClauses.push(`p.price <= $${params.length}`);
  }

  // Bedrooms filter
  const resolvedBeds = bedrooms !== undefined && bedrooms !== '' ? bedrooms : minBeds;
  if (resolvedBeds !== undefined && resolvedBeds !== null && resolvedBeds !== '') {
    params.push(parseInt(resolvedBeds, 10));
    whereClauses.push(`p.bedrooms >= $${params.length}`);
  }

  // Bathrooms filter
  const resolvedBaths = bathrooms !== undefined && bathrooms !== '' ? bathrooms : minBaths;
  if (resolvedBaths !== undefined && resolvedBaths !== null && resolvedBaths !== '') {
    params.push(parseFloat(resolvedBaths));
    whereClauses.push(`p.bathrooms >= $${params.length}`);
  }

  // Area range filters (sqm)
  if (minArea !== undefined && minArea !== null && minArea !== '') {
    params.push(parseFloat(minArea));
    whereClauses.push(`p.area_sqm >= $${params.length}`);
  }

  if (maxArea !== undefined && maxArea !== null && maxArea !== '') {
    params.push(parseFloat(maxArea));
    whereClauses.push(`p.area_sqm <= $${params.length}`);
  }

  // Furnished Status filter
  if (furnishedStatus) {
    params.push(furnishedStatus.toUpperCase());
    whereClauses.push(`p.furnished_status = $${params.length}`);
  }

  // Specific City filter
  if (city && city.trim()) {
    params.push(`%${city.trim()}%`);
    whereClauses.push(`p.city ILIKE $${params.length}`);
  }

  // Location filter across city, subcity, street address, state, country
  if (location && location.trim()) {
    params.push(`%${location.trim()}%`);
    const locIdx = params.length;
    whereClauses.push(`(p.city ILIKE $${locIdx} OR p.subcity_district ILIKE $${locIdx} OR p.street_address ILIKE $${locIdx} OR p.state_region ILIKE $${locIdx} OR p.country ILIKE $${locIdx})`);
  }

  // General Search query across title, description, address, city, district, property type name
  const resolvedQuery = query || search || q;
  if (resolvedQuery && resolvedQuery.trim()) {
    params.push(`%${resolvedQuery.trim()}%`);
    const qIdx = params.length;
    whereClauses.push(`(p.title ILIKE $${qIdx} OR p.description ILIKE $${qIdx} OR p.street_address ILIKE $${qIdx} OR p.city ILIKE $${qIdx} OR p.subcity_district ILIKE $${qIdx} OR pt.name ILIKE $${qIdx})`);
  }

  // Amenities & Features relational junction filter
  const rawAmenities = amenities || features;
  if (rawAmenities) {
    const list = Array.isArray(rawAmenities)
      ? rawAmenities
      : typeof rawAmenities === 'string'
      ? rawAmenities.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    if (list.length > 0) {
      params.push(list);
      const listIdx = params.length;
      params.push(list.length);
      const countIdx = params.length;
      params.push(JSON.stringify(list));
      const jsonIdx = params.length;

      whereClauses.push(`(
        p.id IN (
          SELECT pa.property_id
          FROM property_amenities pa
          JOIN amenities a ON pa.amenity_id = a.id
          WHERE LOWER(a.code) = ANY($${listIdx}::text[]) OR a.id::text = ANY($${listIdx}::text[])
          GROUP BY pa.property_id
          HAVING COUNT(DISTINCT LOWER(a.code)) >= $${countIdx}
        ) OR p.features @> $${jsonIdx}::jsonb
      )`);
    }
  }

  // PostGIS Spatial Radius & Distance calculation
  let distanceSelect = '';
  let distanceOrder = '';
  if (lat !== undefined && lng !== undefined && lat !== '' && lng !== '') {
    const lngNum = parseFloat(lng);
    const latNum = parseFloat(lat);
    if (!isNaN(lngNum) && !isNaN(latNum)) {
      const searchGeom = `ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography`;

      distanceSelect = `,
        ROUND(ST_Distance(p.location, ${searchGeom})::numeric, 1) AS distance_meters,
        ROUND((ST_Distance(p.location, ${searchGeom}) / 1000)::numeric, 2) AS distance_km`;

      if (radius) {
        params.push(parseFloat(radius) * 1000); // convert km to meters
        whereClauses.push(`ST_DWithin(p.location, ${searchGeom}, $${params.length})`);
      }

      if (sortBy === 'distance') {
        distanceOrder = `ST_Distance(p.location, ${searchGeom}) ASC,`;
      }
    }
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Sorting logic
  let orderBy = 'p.created_at DESC';
  if (sortBy === 'oldest') {
    orderBy = 'p.created_at ASC';
  } else if (sortBy === 'price_asc') {
    orderBy = 'p.price ASC, p.created_at DESC';
  } else if (sortBy === 'price_desc') {
    orderBy = 'p.price DESC, p.created_at DESC';
  } else if (sortBy === 'area_desc') {
    orderBy = 'p.area_sqm DESC, p.created_at DESC';
  } else if (sortBy === 'area_asc') {
    orderBy = 'p.area_sqm ASC, p.created_at DESC';
  } else if (sortBy === 'distance') {
    orderBy = distanceOrder ? `${distanceOrder} p.created_at DESC` : 'p.created_at DESC';
  }

  // Total count query for precise pagination metadata
  const countSql = `
    SELECT COUNT(*) as total
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN property_types pt ON p.property_type_id = pt.id
    JOIN listing_types lt ON p.listing_type_id = lt.id
    ${whereSql}
  `;
  const countRes = await db.query(countSql, params);
  const total = parseInt(countRes.rows[0].total, 10);

  // Fetch paginated records with relational amenities and primary image
  const queryParams = [...params, limitNum, offset];
  const listSql = `
    SELECT 
      p.id, p.title, p.slug, p.description, p.price, p.currency, p.price_period,
      p.bedrooms, p.bathrooms, p.area_sqm, p.lot_size_sqm, p.year_built, p.parking_spaces,
      p.furnished_status, p.features, p.country, p.state_region, p.city, p.subcity_district,
      p.street_address, p.postal_code, p.latitude, p.longitude, p.view_count, p.published_at, p.created_at,
      pt.code AS property_type_code, pt.name AS property_type_name, pt.icon AS property_type_icon,
      lt.code AS listing_type_code, lt.name AS listing_type_name,
      ps.code AS status_code, ps.name AS status_name,
      u.id AS agent_id, u.first_name AS agent_first_name, u.last_name AS agent_last_name, u.phone AS agent_phone,
      ap.agency_name, ap.license_number, ap.rating_avg,
      pm.url AS primary_image_url, pm.thumbnail_url AS primary_thumbnail_url,
      COALESCE(
        (
          SELECT json_agg(json_build_object('id', a.id, 'code', a.code, 'name', a.name, 'icon', a.icon))
          FROM property_amenities pa
          JOIN amenities a ON pa.amenity_id = a.id
          WHERE pa.property_id = p.id
        ),
        '[]'::json
      ) AS amenities
      ${distanceSelect}
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN property_types pt ON p.property_type_id = pt.id
    JOIN listing_types lt ON p.listing_type_id = lt.id
    JOIN users u ON p.agent_id = u.id
    LEFT JOIN agent_profiles ap ON ap.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT url, thumbnail_url
      FROM property_media
      WHERE property_id = p.id
      ORDER BY is_primary DESC, sort_order ASC
      LIMIT 1
    ) pm ON true
    ${whereSql}
    ORDER BY ${orderBy}
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const listRes = await db.query(listSql, queryParams);
  return { properties: listRes.rows, total };
}

/**
 * PostGIS Spatial Radius Query: Find active properties within radius km
 */
async function findWithinRadius({ lat, lng, radiusKm = 25, limit = 50, type, listingType }) {
  const whereClauses = ["ps.code IN ('ACTIVE', 'APPROVED', 'AVAILABLE')"];
  const params = [lng, lat, radiusKm * 1000];

  if (type) {
    params.push(type.toUpperCase());
    whereClauses.push(`pt.code = $${params.length}`);
  }

  if (listingType) {
    params.push(listingType.toUpperCase());
    whereClauses.push(`lt.code = $${params.length}`);
  }

  params.push(limit);

  const sql = `
    SELECT 
      p.id, p.title, p.slug, p.price, p.currency, p.price_period,
      p.bedrooms, p.bathrooms, p.area_sqm, p.city, p.street_address,
      p.latitude, p.longitude,
      pt.code AS property_type_code, pt.name AS property_type_name,
      lt.code AS listing_type_code, lt.name AS listing_type_name,
      pm.url AS primary_image_url,
      ROUND((ST_Distance(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) / 1000)::numeric, 2) AS distance_km
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN property_types pt ON p.property_type_id = pt.id
    JOIN listing_types lt ON p.listing_type_id = lt.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE ${whereClauses.join(' AND ')}
      AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
    ORDER BY distance_km ASC
    LIMIT $${params.length}
  `;

  const res = await db.query(sql, params);
  return res.rows;
}

/**
 * PostGIS Spatial Viewport Bounding Box Query
 */
async function findWithinBounds({ minLng, minLat, maxLng, maxLat, limit = 100 }) {
  const sql = `
    SELECT 
      p.id, p.title, p.slug, p.price, p.currency, p.price_period,
      p.bedrooms, p.bathrooms, p.area_sqm, p.city, p.latitude, p.longitude,
      pt.code AS property_type_code,
      lt.code AS listing_type_code,
      pm.url AS primary_image_url
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN property_types pt ON p.property_type_id = pt.id
    JOIN listing_types lt ON p.listing_type_id = lt.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE ps.code IN ('ACTIVE', 'APPROVED', 'AVAILABLE')
      AND p.latitude BETWEEN $2 AND $4
      AND p.longitude BETWEEN $1 AND $3
    LIMIT $5
  `;

  const res = await db.query(sql, [minLng, minLat, maxLng, maxLat, limit]);
  return res.rows;
}

/**
 * Find detailed property by Slug or UUID (including media gallery)
 */
async function findBySlugOrId(slugOrId) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);
  const identifierClause = isUuid ? 'p.id = $1' : 'p.slug = $1';

  const propSql = `
    SELECT 
      p.*,
      pt.code AS property_type_code, pt.name AS property_type_name, pt.icon AS property_type_icon,
      lt.code AS listing_type_code, lt.name AS listing_type_name,
      ps.code AS status_code, ps.name AS status_name,
      u.id AS agent_id, u.first_name AS agent_first_name, u.last_name AS agent_last_name, 
      u.email AS agent_email, u.phone AS agent_phone, u.avatar_url AS agent_avatar_url,
      ap.agency_name, ap.license_number, ap.bio AS agent_bio, ap.rating_avg, ap.review_count,
      ap.office_address, ap.office_phone, ap.website_url
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN property_types pt ON p.property_type_id = pt.id
    JOIN listing_types lt ON p.listing_type_id = lt.id
    JOIN users u ON p.agent_id = u.id
    LEFT JOIN agent_profiles ap ON ap.user_id = u.id
    WHERE ${identifierClause}
  `;

  const propRes = await db.query(propSql, [slugOrId]);
  if (propRes.rows.length === 0) return null;

  const property = propRes.rows[0];

  // Fetch all media assets
  const mediaRes = await db.query(
    `SELECT id, media_type, url, thumbnail_url, file_key, sort_order, is_primary
     FROM property_media
     WHERE property_id = $1
     ORDER BY is_primary DESC, sort_order ASC`,
    [property.id]
  );
  property.media = mediaRes.rows;

  // Fetch relational amenities
  const amenitiesRes = await db.query(
    `SELECT a.id, a.code, a.name, a.category, a.icon
     FROM amenities a
     JOIN property_amenities pa ON a.id = pa.amenity_id
     WHERE pa.property_id = $1
     ORDER BY a.name ASC`,
    [property.id]
  );
  property.amenities = amenitiesRes.rows;

  // Increment view count asynchronously
  db.query('UPDATE properties SET view_count = view_count + 1 WHERE id = $1', [property.id]).catch(() => {});

  return property;
}

/**
 * Create new property
 */
async function createProperty(data, agentId) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Resolve IDs
    const typeRes = await client.query('SELECT id FROM property_types WHERE code = $1', [data.propertyTypeCode.toUpperCase()]);
    if (typeRes.rows.length === 0) throw new Error(`Invalid property type '${data.propertyTypeCode}'`);
    const propertyTypeId = typeRes.rows[0].id;

    const listRes = await client.query('SELECT id FROM listing_types WHERE code = $1', [data.listingTypeCode.toUpperCase()]);
    if (listRes.rows.length === 0) throw new Error(`Invalid listing type '${data.listingTypeCode}'`);
    const listingTypeId = listRes.rows[0].id;

    const statusCode = data.status || 'PENDING_APPROVAL';
    const statusRes = await client.query('SELECT id, code FROM property_statuses WHERE code = $1', [statusCode]);
    if (statusRes.rows.length === 0) throw new Error(`Invalid property status '${statusCode}'`);
    const statusId = statusRes.rows[0].id;

    const slug = await generateUniqueSlug(data.title);
    const isPublished = ['ACTIVE', 'APPROVED', 'AVAILABLE'].includes(statusCode);

    // Collect amenities & features
    const rawAmenities = data.amenities || data.features || [];
    const amenityList = Array.isArray(rawAmenities) ? rawAmenities : [];

    const insertSql = `
      INSERT INTO properties (
        agent_id, property_type_id, listing_type_id, status_id,
        title, slug, description, price, currency, price_period,
        bedrooms, bathrooms, area_sqm, lot_size_sqm, year_built,
        parking_spaces, furnished_status, features,
        country, state_region, city, subcity_district, street_address, postal_code,
        latitude, longitude, published_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        $25, $26, ${isPublished ? 'NOW()' : 'NULL'}
      )
      RETURNING id, slug, title
    `;

    const propRes = await client.query(insertSql, [
      agentId,
      propertyTypeId,
      listingTypeId,
      statusId,
      data.title,
      slug,
      data.description,
      data.price,
      data.currency || 'USD',
      data.pricePeriod || null,
      data.bedrooms ?? null,
      data.bathrooms ?? null,
      data.areaSqm,
      data.lotSizeSqm ?? null,
      data.yearBuilt ?? null,
      data.parkingSpaces || 0,
      data.furnishedStatus || 'UNFURNISHED',
      JSON.stringify(amenityList),
      data.country,
      data.stateRegion,
      data.city,
      data.subcityDistrict || null,
      data.streetAddress,
      data.postalCode || null,
      data.latitude,
      data.longitude
    ]);

    const propertyId = propRes.rows[0].id;

    // Relational Amenities insertion into property_amenities
    if (amenityList.length > 0) {
      for (const item of amenityList) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item);
        const amRes = await client.query(
          isUuid ? 'SELECT id FROM amenities WHERE id = $1' : 'SELECT id FROM amenities WHERE code = $1',
          [item]
        );
        if (amRes.rows.length > 0) {
          await client.query(
            `INSERT INTO property_amenities (property_id, amenity_id)
             VALUES ($1, $2)
             ON CONFLICT (property_id, amenity_id) DO NOTHING`,
            [propertyId, amRes.rows[0].id]
          );
        }
      }
    }

    await client.query('COMMIT');
    return findBySlugOrId(propertyId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update existing property
 */
async function updateProperty(id, data) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    let typeId = null;
    if (data.propertyTypeCode) {
      const typeRes = await client.query('SELECT id FROM property_types WHERE code = $1', [data.propertyTypeCode.toUpperCase()]);
      if (typeRes.rows.length) typeId = typeRes.rows[0].id;
    }

    let listId = null;
    if (data.listingTypeCode) {
      const listRes = await client.query('SELECT id FROM listing_types WHERE code = $1', [data.listingTypeCode.toUpperCase()]);
      if (listRes.rows.length) listId = listRes.rows[0].id;
    }

    const rawAmenities = data.amenities !== undefined ? data.amenities : data.features;
    let featuresJson = null;
    if (rawAmenities !== undefined) {
      featuresJson = JSON.stringify(Array.isArray(rawAmenities) ? rawAmenities : []);
    }

    const updateSql = `
      UPDATE properties SET
        property_type_id = COALESCE($1, property_type_id),
        listing_type_id = COALESCE($2, listing_type_id),
        title = COALESCE($3, title),
        description = COALESCE($4, description),
        price = COALESCE($5, price),
        currency = COALESCE($6, currency),
        price_period = COALESCE($7, price_period),
        bedrooms = COALESCE($8, bedrooms),
        bathrooms = COALESCE($9, bathrooms),
        area_sqm = COALESCE($10, area_sqm),
        lot_size_sqm = COALESCE($11, lot_size_sqm),
        year_built = COALESCE($12, year_built),
        parking_spaces = COALESCE($13, parking_spaces),
        furnished_status = COALESCE($14, furnished_status),
        features = COALESCE($15, features),
        country = COALESCE($16, country),
        state_region = COALESCE($17, state_region),
        city = COALESCE($18, city),
        subcity_district = COALESCE($19, subcity_district),
        street_address = COALESCE($20, street_address),
        postal_code = COALESCE($21, postal_code),
        latitude = COALESCE($22, latitude),
        longitude = COALESCE($23, longitude),
        updated_at = NOW()
      WHERE id = $24
      RETURNING id
    `;

    await client.query(updateSql, [
      typeId,
      listId,
      data.title,
      data.description,
      data.price,
      data.currency,
      data.pricePeriod,
      data.bedrooms,
      data.bathrooms,
      data.areaSqm,
      data.lotSizeSqm,
      data.yearBuilt,
      data.parkingSpaces,
      data.furnishedStatus,
      featuresJson,
      data.country,
      data.stateRegion,
      data.city,
      data.subcityDistrict,
      data.streetAddress,
      data.postalCode,
      data.latitude,
      data.longitude,
      id
    ]);

    // Relational Amenities sync
    if (rawAmenities !== undefined) {
      await client.query('DELETE FROM property_amenities WHERE property_id = $1', [id]);
      const amenityList = Array.isArray(rawAmenities) ? rawAmenities : [];
      for (const item of amenityList) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item);
        const amRes = await client.query(
          isUuid ? 'SELECT id FROM amenities WHERE id = $1' : 'SELECT id FROM amenities WHERE code = $1',
          [item]
        );
        if (amRes.rows.length > 0) {
          await client.query(
            `INSERT INTO property_amenities (property_id, amenity_id)
             VALUES ($1, $2)
             ON CONFLICT (property_id, amenity_id) DO NOTHING`,
            [id, amRes.rows[0].id]
          );
        }
      }
    }

    await client.query('COMMIT');
    return findBySlugOrId(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Change status (Active, Approved, Available, Rejected, Sold, Rented, etc.)
 */
async function updateStatus(id, statusCode, rejectionReason = null) {
  const statusRes = await db.query('SELECT id, code FROM property_statuses WHERE code = $1', [statusCode]);
  if (statusRes.rows.length === 0) throw new Error(`Invalid status code '${statusCode}'`);
  const statusId = statusRes.rows[0].id;

  const isApproved = ['ACTIVE', 'APPROVED', 'AVAILABLE'].includes(statusCode);
  const isPending = ['PENDING', 'PENDING_APPROVAL'].includes(statusCode);

  const publishedUpdate = isApproved ? ', published_at = NOW()' : '';
  const reasonToSet = isApproved || isPending ? null : rejectionReason;

  await db.query(
    `UPDATE properties 
     SET status_id = $1, rejection_reason = $2, updated_at = NOW() ${publishedUpdate}
     WHERE id = $3`,
    [statusId, reasonToSet, id]
  );
  return findBySlugOrId(id);
}

/**
 * Add media asset to property
 */
async function addMedia(propertyId, mediaItem) {
  const res = await db.query(
    `INSERT INTO property_media (property_id, media_type, url, thumbnail_url, file_key, sort_order, is_primary)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      propertyId,
      mediaItem.mediaType || 'IMAGE',
      mediaItem.url,
      mediaItem.thumbnailUrl || mediaItem.url,
      mediaItem.fileKey,
      mediaItem.sortOrder || 0,
      mediaItem.isPrimary || false
    ]
  );
  return res.rows[0];
}

/**
 * Delete media asset
 */
async function deleteMedia(propertyId, mediaId) {
  const res = await db.query(
    `DELETE FROM property_media WHERE id = $1 AND property_id = $2 RETURNING file_key`,
    [mediaId, propertyId]
  );
  return res.rows[0] || null;
}

/**
 * Reorder media assets
 */
async function reorderMedia(propertyId, mediaOrders) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    for (const item of mediaOrders) {
      await client.query(
        `UPDATE property_media SET sort_order = $1, is_primary = $2 WHERE id = $3 AND property_id = $4`,
        [item.sortOrder, item.isPrimary || false, item.id, propertyId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Real relational deletion
 */
async function deleteProperty(id) {
  const res = await db.query('DELETE FROM properties WHERE id = $1 RETURNING id', [id]);
  return res.rows[0] || null;
}

/**
 * Get Property Types, Listing Types, Statuses, and Amenities lookups
 */
async function getLookups() {
  const typesRes = await db.query('SELECT code, name, description, icon FROM property_types WHERE is_active = TRUE ORDER BY name ASC');
  const listingsRes = await db.query('SELECT code, name FROM listing_types ORDER BY name ASC');
  const statusesRes = await db.query('SELECT code, name FROM property_statuses ORDER BY id ASC');
  const amenitiesRes = await db.query('SELECT code, name, category, icon FROM amenities WHERE is_active = TRUE ORDER BY name ASC');

  return {
    propertyTypes: typesRes.rows,
    listingTypes: listingsRes.rows,
    statuses: statusesRes.rows,
    amenities: amenitiesRes.rows
  };
}

module.exports = {
  findProperties,
  findWithinRadius,
  findWithinBounds,
  findBySlugOrId,
  createProperty,
  updateProperty,
  deleteProperty,
  updateStatus,
  addMedia,
  deleteMedia,
  reorderMedia,
  getLookups
};
