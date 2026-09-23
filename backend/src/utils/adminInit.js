const bcrypt = require('bcryptjs');
const db = require('../config/db');
const config = require('../config/env');
const logger = require('./logger');

/**
 * Idempotently ensures the primary super-admin account exists and is active.
 * Uses environment variables for credentials and never exposes passwords in logs.
 */
async function ensureSuperAdmin() {
  const email = (config.ADMIN_EMAIL || 'admin@apexrealty.com').toLowerCase().trim();
  const password = config.ADMIN_PASSWORD || 'AdminSecure2026!';
  const firstName = config.ADMIN_FIRST_NAME || 'Platform';
  const lastName = config.ADMIN_LAST_NAME || 'Admin';

  try {
    const existing = await db.query(
      `SELECT id, email, role, is_active FROM users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (existing.rows.length > 0) {
      const admin = existing.rows[0];
      if (admin.role !== 'ADMIN' || !admin.is_active) {
        await db.query(
          `UPDATE users SET role = 'ADMIN', is_active = TRUE, updated_at = NOW() WHERE id = $1`,
          [admin.id]
        );
        logger.info(`[AdminInit] Super-admin privileges restored for ${email}`);
      }
      return admin.id;
    }

    // Account does not exist yet: create it securely
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, is_active)
       VALUES ($1, $2, 'ADMIN', $3, $4, TRUE)
       RETURNING id, email, role, created_at`,
      [email, passwordHash, firstName, lastName]
    );

    logger.info(`[AdminInit] Initial primary super-admin successfully created for ${email}`);
    return result.rows[0].id;
  } catch (err) {
    logger.error(`[AdminInit] Failed to ensure super admin account:`, err);
    throw err;
  }
}

module.exports = {
  ensureSuperAdmin
};
