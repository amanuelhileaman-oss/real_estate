const db = require('../config/db');
const { NotFoundError } = require('../utils/appError');

async function findInquiryById(id) {
  const res = await db.query('SELECT * FROM inquiries WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function createInquiry({ propertyId, customerId = null, name, email, phone, message }) {
  // Find agent for this property
  const propRes = await db.query('SELECT agent_id, title FROM properties WHERE id = $1', [propertyId]);
  if (propRes.rows.length === 0) throw new NotFoundError('Property listing not found');
  const agentId = propRes.rows[0].agent_id;

  const res = await db.query(
    `INSERT INTO inquiries (property_id, customer_id, agent_id, name, email, phone, message, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'NEW')
     RETURNING *`,
    [propertyId, customerId, agentId, name, email, phone || null, message]
  );

  // Create in-app notification for agent
  await db.query(
    `INSERT INTO notifications (user_id, type, title, message, link_url, metadata)
     VALUES ($1, 'INQUIRY_RECEIVED', $2, $3, $4, $5)`,
    [
      agentId,
      `New Inquiry for ${propRes.rows[0].title}`,
      `From ${name} (${email}): "${message.substring(0, 100)}..."`,
      `/portal/agent/inquiries`,
      JSON.stringify({ propertyId, inquiryId: res.rows[0].id })
    ]
  );

  return res.rows[0];
}

async function getAgentInquiries(agentId, { status, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const where = [];
  const params = [];

  if (agentId) {
    params.push(agentId);
    where.push(`i.agent_id = $${params.length}`);
  }

  if (status) {
    params.push(status);
    where.push(`i.status = $${params.length}`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const countRes = await db.query(`SELECT COUNT(*) as total FROM inquiries i ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const queryParams = [...params, limit, offset];
  const listSql = `
    SELECT 
      i.*,
      p.title AS property_title, p.slug AS property_slug, p.city AS property_city,
      pm.url AS property_image_url
    FROM inquiries i
    JOIN properties p ON i.property_id = p.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    ${whereSql}
    ORDER BY i.created_at DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const res = await db.query(listSql, queryParams);
  return { inquiries: res.rows, total };
}

async function getCustomerInquiries(customerId, { page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const countRes = await db.query('SELECT COUNT(*) as total FROM inquiries WHERE customer_id = $1', [customerId]);
  const total = parseInt(countRes.rows[0].total, 10);

  const listSql = `
    SELECT 
      i.*,
      p.title AS property_title, p.slug AS property_slug, p.city AS property_city,
      u.first_name AS agent_first_name, u.last_name AS agent_last_name, u.email AS agent_email,
      pm.url AS property_image_url
    FROM inquiries i
    JOIN properties p ON i.property_id = p.id
    JOIN users u ON i.agent_id = u.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE i.customer_id = $1
    ORDER BY i.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const res = await db.query(listSql, [customerId, limit, offset]);
  return { inquiries: res.rows, total };
}

async function updateInquiryStatus(inquiryId, status) {
  const res = await db.query(
    `UPDATE inquiries SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [status, inquiryId]
  );
  return res.rows[0] || null;
}

module.exports = {
  findInquiryById,
  createInquiry,
  getAgentInquiries,
  getCustomerInquiries,
  updateInquiryStatus
};
