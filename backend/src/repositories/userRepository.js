const db = require('../config/db');

async function findByEmail(email) {
  const res = await db.query(
    `SELECT u.*, ap.agency_name, ap.license_number, ap.rating_avg, ap.review_count, ap.bio
     FROM users u
     LEFT JOIN agent_profiles ap ON ap.user_id = u.id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  return res.rows[0] || null;
}

async function findByGoogleId(googleId) {
  const res = await db.query(
    `SELECT u.*, ap.agency_name, ap.license_number, ap.rating_avg, ap.review_count, ap.bio
     FROM users u
     LEFT JOIN agent_profiles ap ON ap.user_id = u.id
     WHERE u.google_id = $1`,
    [googleId]
  );
  return res.rows[0] || null;
}

async function linkGoogleAccount(userId, googleId) {
  const res = await db.query(
    `UPDATE users SET google_id = $1, auth_provider = 'GOOGLE', updated_at = NOW() WHERE id = $2 RETURNING *`,
    [googleId, userId]
  );
  return res.rows[0] || null;
}

async function findById(id) {
  const res = await db.query(
    `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.avatar_url, u.is_active, u.created_at,
            ap.agency_name, ap.license_number, ap.bio, ap.office_address, ap.office_phone, ap.website_url, ap.rating_avg, ap.review_count, ap.verified_at
     FROM users u
     LEFT JOIN agent_profiles ap ON ap.user_id = u.id
     WHERE u.id = $1`,
    [id]
  );
  return res.rows[0] || null;
}

async function createCustomer({ email, passwordHash, firstName, lastName, phone, googleId, authProvider = 'LOCAL' }) {
  const res = await db.query(
    `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, google_id, auth_provider)
     VALUES ($1, $2, 'CUSTOMER', $3, $4, $5, TRUE, $6, $7)
     RETURNING id, email, role, first_name, last_name, phone, is_active, created_at`,
    [email.toLowerCase(), passwordHash || null, firstName, lastName, phone || null, googleId || null, authProvider]
  );
  return res.rows[0];
}

async function createAgent({ email, passwordHash, firstName, lastName, phone, agencyName, licenseNumber, bio, googleId, authProvider = 'LOCAL' }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active, google_id, auth_provider)
       VALUES ($1, $2, 'AGENT', $3, $4, $5, TRUE, $6, $7)
       RETURNING id, email, role, first_name, last_name, phone, is_active, created_at`,
      [email.toLowerCase(), passwordHash || null, firstName, lastName, phone || null, googleId || null, authProvider]
    );
    const user = userRes.rows[0];

    await client.query(
      `INSERT INTO agent_profiles (user_id, agency_name, license_number, bio)
       VALUES ($1, $2, $3, $4)`,
      [user.id, agencyName || null, licenseNumber || null, bio || null]
    );

    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateProfile(id, fields) {
  const { firstName, lastName, phone, avatarUrl, agencyName, bio, officeAddress, officePhone, websiteUrl } = fields;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           avatar_url = COALESCE($4, avatar_url),
           updated_at = NOW()
       WHERE id = $5`,
      [firstName, lastName, phone, avatarUrl, id]
    );

    await client.query(
      `UPDATE agent_profiles
       SET agency_name = COALESCE($1, agency_name),
           bio = COALESCE($2, bio),
           office_address = COALESCE($3, office_address),
           office_phone = COALESCE($4, office_phone),
           website_url = COALESCE($5, website_url),
           updated_at = NOW()
       WHERE user_id = $6`,
      [agencyName, bio, officeAddress, officePhone, websiteUrl, id]
    );

    await client.query('COMMIT');
    return findById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Storing and verifying refresh tokens
async function storeRefreshToken(userId, tokenHash, deviceInfo, expiresAt) {
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_info, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, deviceInfo || null, expiresAt]
  );
}

async function findRefreshToken(tokenHash) {
  const res = await db.query(
    `SELECT * FROM refresh_tokens 
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  return res.rows[0] || null;
}

async function revokeRefreshToken(tokenHash) {
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
    [tokenHash]
  );
}

async function listUsers({ role, page = 1, limit = 20, search = '' }) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const params = [];

  if (role) {
    params.push(role);
    whereClauses.push(`u.role = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    whereClauses.push(`(u.email ILIKE $${params.length} OR u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length})`);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRes = await db.query(`SELECT COUNT(*) as total FROM users u ${whereSql}`, params);
  const total = parseInt(countRes.rows[0].total, 10);

  const queryParams = [...params, limit, offset];
  const listRes = await db.query(
    `SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.is_active, u.created_at,
            ap.agency_name, ap.license_number, ap.rating_avg, ap.review_count, ap.verified_at
     FROM users u
     LEFT JOIN agent_profiles ap ON ap.user_id = u.id
     ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
    queryParams
  );

  return { users: listRes.rows, total };
}

async function setUserActiveStatus(id, isActive) {
  const res = await db.query(
    `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, is_active`,
    [isActive, id]
  );
  return res.rows[0] || null;
}

async function setAgentVerification(userId, isVerified) {
  const res = await db.query(
    `UPDATE agent_profiles 
     SET verified_at = CASE WHEN $1 THEN NOW() ELSE NULL END, updated_at = NOW() 
     WHERE user_id = $2 
     RETURNING *`,
    [isVerified, userId]
  );
  return res.rows[0] || null;
}

/**
 * Admin update any user across all roles and fields
 */
async function updateUser(id, fields) {
  const { firstName, lastName, email, phone, role, isActive, agencyName, licenseNumber, bio } = fields;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Update users table
    const updateFields = [];
    const updateParams = [];
    let paramIdx = 1;

    if (firstName !== undefined) {
      updateFields.push(`first_name = $${paramIdx++}`);
      updateParams.push(firstName);
    }
    if (lastName !== undefined) {
      updateFields.push(`last_name = $${paramIdx++}`);
      updateParams.push(lastName);
    }
    if (email !== undefined) {
      updateFields.push(`email = LOWER($${paramIdx++})`);
      updateParams.push(email);
    }
    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIdx++}`);
      updateParams.push(phone);
    }
    if (role !== undefined) {
      updateFields.push(`role = $${paramIdx++}`);
      updateParams.push(role);
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIdx++}`);
      updateParams.push(Boolean(isActive));
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      updateParams.push(id);
      await client.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIdx}`,
        updateParams
      );
    }

    // If agent details provided or role is AGENT
    if (role === 'AGENT' || agencyName !== undefined || licenseNumber !== undefined || bio !== undefined) {
      await client.query(
        `INSERT INTO agent_profiles (user_id, agency_name, license_number, bio)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET agency_name = COALESCE($2, agent_profiles.agency_name),
             license_number = COALESCE($3, agent_profiles.license_number),
             bio = COALESCE($4, agent_profiles.bio),
             updated_at = NOW()`,
        [id, agencyName || null, licenseNumber || null, bio || null]
      );
    }

    await client.query('COMMIT');
    return findById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Admin delete any user and safely cascade dependent records
 */
async function deleteUser(id) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Delete property listings owned by this agent (cascades media, amenities, favorites)
    await client.query(`DELETE FROM properties WHERE agent_id = $1`, [id]);

    // 2. Delete viewing appointments
    await client.query(`DELETE FROM viewing_appointments WHERE agent_id = $1 OR customer_id = $1`, [id]);

    // 3. Delete inquiries
    await client.query(`DELETE FROM inquiries WHERE agent_id = $1 OR customer_id = $1`, [id]);

    // 4. Delete property deals
    await client.query(`DELETE FROM property_deals WHERE agent_id = $1 OR customer_id = $1`, [id]);

    // 5. Delete chat messages sent by user
    await client.query(`DELETE FROM chat_messages WHERE sender_id = $1`, [id]);

    // 6. Delete chat participant records
    await client.query(`DELETE FROM chat_participants WHERE user_id = $1`, [id]);

    // 7. Delete favorites
    await client.query(`DELETE FROM favorites WHERE user_id = $1`, [id]);

    // 8. Delete notifications
    await client.query(`DELETE FROM notifications WHERE user_id = $1`, [id]);

    // 9. Delete agent profile
    await client.query(`DELETE FROM agent_profiles WHERE user_id = $1`, [id]);

    // 10. Delete refresh tokens
    await client.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [id]);

    // 11. Delete user record
    const userRes = await client.query(`DELETE FROM users WHERE id = $1 RETURNING id, email`, [id]);

    await client.query('COMMIT');
    return userRes.rows[0] || null;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findByEmail,
  findByGoogleId,
  linkGoogleAccount,
  findById,
  createCustomer,
  createAgent,
  updateProfile,
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  listUsers,
  setUserActiveStatus,
  setAgentVerification,
  updateUser,
  deleteUser
};


