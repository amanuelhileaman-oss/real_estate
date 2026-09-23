const db = require('../config/db');

async function createReport({ propertyId, reporterId, reportType, reason }) {
  const res = await db.query(
    `INSERT INTO reports (property_id, reporter_id, report_type, reason, status)
     VALUES ($1, $2, $3, $4, 'PENDING')
     RETURNING *`,
    [propertyId, reporterId || null, reportType, reason]
  );
  return res.rows[0];
}

async function listReports({ status, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const params = [];

  if (status) {
    params.push(status);
    whereClauses.push(`r.status = $${params.length}`);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRes = await db.query(`SELECT COUNT(*) as total FROM reports r ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const queryParams = [...params, limit, offset];
  const listSql = `
    SELECT 
      r.*,
      p.title AS property_title, p.slug AS property_slug, p.price AS property_price,
      u.email AS reporter_email, u.first_name AS reporter_first_name, u.last_name AS reporter_last_name
    FROM reports r
    JOIN properties p ON r.property_id = p.id
    LEFT JOIN users u ON r.reporter_id = u.id
    ${whereSql}
    ORDER BY r.created_at DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const res = await db.query(listSql, queryParams);
  return { reports: res.rows, total };
}

async function updateReportStatus(reportId, { status, adminNotes, resolvedBy }) {
  const isResolvedOrDismissed = ['RESOLVED', 'DISMISSED'].includes(status);
  const res = await db.query(
    `UPDATE reports 
     SET status = $1, 
         admin_notes = COALESCE($2, admin_notes),
         resolved_by = $3,
         resolved_at = CASE WHEN $4::boolean THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [status, adminNotes || null, resolvedBy, isResolvedOrDismissed, reportId]
  );
  return res.rows[0] || null;
}


module.exports = {
  createReport,
  listReports,
  updateReportStatus
};
