const db = require('../config/db');

async function getPlatformAnalytics() {
  const [listingStats, userStats, leadStats, reportStats, recentActivity] = await Promise.all([
    db.query(`
      SELECT 
        COUNT(*) as total_properties,
        COUNT(*) as total_listings,
        COUNT(*) FILTER (WHERE ps.code IN ('ACTIVE', 'APPROVED', 'AVAILABLE')) as approved_properties,
        COUNT(*) FILTER (WHERE ps.code IN ('ACTIVE', 'APPROVED', 'AVAILABLE')) as active_listings,
        COUNT(*) FILTER (WHERE ps.code IN ('PENDING', 'PENDING_APPROVAL')) as pending_properties,
        COUNT(*) FILTER (WHERE ps.code IN ('PENDING', 'PENDING_APPROVAL')) as pending_listings,
        COUNT(*) FILTER (WHERE ps.code = 'SOLD') as sold_properties,
        COUNT(*) FILTER (WHERE ps.code = 'SOLD') as sold_listings,
        COUNT(*) FILTER (WHERE ps.code = 'RENTED') as rented_properties,
        COUNT(*) FILTER (WHERE ps.code = 'RENTED') as rented_listings,
        COALESCE(SUM(p.view_count), 0) as total_property_views
      FROM properties p
      JOIN property_statuses ps ON p.status_id = ps.id
    `),
    db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE role = 'CUSTOMER') as total_customers,
        COUNT(*) FILTER (WHERE role = 'AGENT') as total_agents,
        COUNT(*) as total_users
      FROM users
    `),
    db.query(`
      SELECT 
        (SELECT COUNT(*) FROM inquiries) as total_inquiries,
        (SELECT COUNT(*) FROM viewing_appointments) as total_appointments
    `),
    db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending_reports,
        COUNT(*) as total_reports
      FROM reports
    `),
    db.query(`
      SELECT 
        al.id, al.action, al.entity_type, al.entity_id, al.old_values, al.new_values, al.ip_address, al.created_at,
        u.first_name, u.last_name, u.email, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 12
    `)
  ]);

  return {
    listings: {
      ...listingStats.rows[0],
      pending_reports: reportStats.rows[0]?.pending_reports || 0,
      total_reports: reportStats.rows[0]?.total_reports || 0
    },
    users: userStats.rows[0],
    engagement: leadStats.rows[0],
    reports: reportStats.rows[0],
    recentActivity: recentActivity.rows
  };
}

async function getModerationQueue({ page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  const countRes = await db.query(`
    SELECT COUNT(*) as total
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    WHERE ps.code IN ('PENDING', 'PENDING_APPROVAL')
  `);
  const total = parseInt(countRes.rows[0].total, 10);

  const sql = `
    SELECT 
      p.*,
      pt.name AS property_type_name,
      lt.name AS listing_type_name,
      u.first_name AS agent_first_name, u.last_name AS agent_last_name, u.email AS agent_email,
      ap.agency_name, ap.license_number,
      pm.url AS primary_image_url
    FROM properties p
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN property_types pt ON p.property_type_id = pt.id
    JOIN listing_types lt ON p.listing_type_id = lt.id
    JOIN users u ON p.agent_id = u.id
    LEFT JOIN agent_profiles ap ON ap.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE ps.code IN ('PENDING', 'PENDING_APPROVAL')
    ORDER BY p.created_at ASC
    LIMIT $1 OFFSET $2
  `;

  const res = await db.query(sql, [limit, offset]);
  return { properties: res.rows, total };
}

async function logAdminAction(adminId, action, entityType, entityId, oldValues = null, newValues = null, ipAddress = null) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      adminId,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress
    ]
  );
}

module.exports = {
  getPlatformAnalytics,
  getModerationQueue,
  logAdminAction
};
