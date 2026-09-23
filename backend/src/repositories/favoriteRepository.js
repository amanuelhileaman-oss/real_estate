const db = require('../config/db');

async function addFavorite(userId, propertyId) {
  await db.query(
    `INSERT INTO favorites (user_id, property_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, property_id) DO NOTHING`,
    [userId, propertyId]
  );
  return { success: true, favorited: true };
}

async function removeFavorite(userId, propertyId) {
  await db.query(
    `DELETE FROM favorites WHERE user_id = $1 AND property_id = $2`,
    [userId, propertyId]
  );
  return { success: true, favorited: false };
}

async function isFavorited(userId, propertyId) {
  if (!userId) return false;
  const res = await db.query(
    `SELECT 1 FROM favorites WHERE user_id = $1 AND property_id = $2`,
    [userId, propertyId]
  );
  return res.rows.length > 0;
}

async function getUserFavorites(userId, page = 1, limit = 12) {
  const offset = (page - 1) * limit;

  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM favorites WHERE user_id = $1`,
    [userId]
  );
  const total = parseInt(countRes.rows[0].total, 10);

  const listSql = `
    SELECT 
      p.id, p.title, p.slug, p.price, p.currency, p.price_period,
      p.bedrooms, p.bathrooms, p.area_sqm, p.city, p.street_address,
      pt.code AS property_type_code, pt.name AS property_type_name,
      lt.code AS listing_type_code, lt.name AS listing_type_name,
      pm.url AS primary_image_url,
      f.created_at AS favorited_at
    FROM favorites f
    JOIN properties p ON f.property_id = p.id
    JOIN property_types pt ON p.property_type_id = pt.id
    JOIN listing_types lt ON p.listing_type_id = lt.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE f.user_id = $1
    ORDER BY f.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const res = await db.query(listSql, [userId, limit, offset]);
  return { properties: res.rows, total };
}

module.exports = {
  addFavorite,
  removeFavorite,
  isFavorited,
  getUserFavorites
};
