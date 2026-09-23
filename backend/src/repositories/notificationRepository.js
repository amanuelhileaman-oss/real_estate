const db = require('../config/db');

async function createNotification({ userId, type, title, message, linkUrl = null, metadata = {} }) {
  const res = await db.query(
    `INSERT INTO notifications (user_id, type, title, message, link_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, type, title, message, linkUrl, JSON.stringify(metadata)]
  );
  return res.rows[0];
}

async function getUserNotifications(userId, { isRead, page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const whereClauses = ['user_id = $1'];
  const params = [userId];

  if (typeof isRead === 'boolean') {
    params.push(isRead);
    whereClauses.push(`is_read = $${params.length}`);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const countRes = await db.query(
    `SELECT COUNT(*) as total FROM notifications ${whereSql}`,
    params
  );
  const total = parseInt(countRes.rows[0].total, 10);

  const unreadRes = await db.query(
    `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  const unreadCount = parseInt(unreadRes.rows[0].unread, 10);

  const queryParams = [...params, limit, offset];
  const listSql = `
    SELECT *
    FROM notifications
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

  const listRes = await db.query(listSql, queryParams);

  return {
    notifications: listRes.rows,
    total,
    unreadCount
  };
}

async function getUnreadCount(userId) {
  const res = await db.query(
    `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return parseInt(res.rows[0].unread, 10);
}

async function markAsRead(notificationId, userId) {
  const res = await db.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [notificationId, userId]
  );
  return res.rows[0] || null;
}

async function markAllAsRead(userId) {
  const res = await db.query(
    `UPDATE notifications
     SET is_read = TRUE
     WHERE user_id = $1 AND is_read = FALSE
     RETURNING id`,
    [userId]
  );
  return res.rows.length;
}

async function deleteNotification(notificationId, userId) {
  const res = await db.query(
    `DELETE FROM notifications
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [notificationId, userId]
  );
  return res.rows.length > 0;
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
