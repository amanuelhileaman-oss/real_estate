const db = require('../config/db');

/**
 * Find or create a 1-on-1 direct conversation between two users
 */
async function findOrCreateConversation({ userId, recipientId, propertyId = null, title = null }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Check if an active 1-on-1 conversation exists between these two users
    // If propertyId is provided, look for one specifically tied to this property or existing direct chat
    let findQuery = `
      SELECT c.id, c.property_id, c.title, c.created_at, c.updated_at
      FROM chat_conversations c
      JOIN chat_participants p1 ON c.id = p1.conversation_id AND p1.user_id = $1
      JOIN chat_participants p2 ON c.id = p2.conversation_id AND p2.user_id = $2
    `;
    const findParams = [userId, recipientId];

    if (propertyId) {
      findQuery += ` WHERE c.property_id = $3`;
      findParams.push(propertyId);
    }
    findQuery += ` ORDER BY c.updated_at DESC LIMIT 1`;

    const existingRes = await client.query(findQuery, findParams);

    if (existingRes.rows.length > 0) {
      await client.query('COMMIT');
      return existingRes.rows[0];
    }

    // Create new conversation
    const convRes = await client.query(
      `INSERT INTO chat_conversations (property_id, title)
       VALUES ($1, $2)
       RETURNING *`,
      [propertyId || null, title || null]
    );
    const newConv = convRes.rows[0];

    // Add both participants
    await client.query(
      `INSERT INTO chat_participants (conversation_id, user_id)
       VALUES ($1, $2), ($1, $3)`,
      [newConv.id, userId, recipientId]
    );

    await client.query('COMMIT');
    return newConv;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get all conversations for a user with preview of last message, other participant, and unread count
 */
async function getUserConversations(userId) {
  const query = `
    SELECT 
      c.id,
      c.property_id,
      c.title,
      c.created_at,
      c.updated_at,
      -- Other participant info
      other_u.id AS other_user_id,
      other_u.first_name AS other_first_name,
      other_u.last_name AS other_last_name,
      other_u.role AS other_role,
      other_u.email AS other_email,
      other_u.avatar_url AS other_avatar_url,
      ap.agency_name AS other_agency_name,
      -- Property info if linked
      p.title AS property_title,
      p.slug AS property_slug,
      p.city AS property_city,
      p.price AS property_price,
      p.currency AS property_currency,
      pm.url AS property_image_url,
      -- Last message
      lm.id AS last_message_id,
      lm.message AS last_message_text,
      lm.sender_id AS last_message_sender_id,
      lm.created_at AS last_message_created_at,
      -- Unread count for current user
      COALESCE(unread.unread_count, 0) AS unread_count
    FROM chat_conversations c
    JOIN chat_participants my_p ON c.id = my_p.conversation_id AND my_p.user_id = $1
    -- Find the other participant in this conversation
    JOIN chat_participants other_p ON c.id = other_p.conversation_id AND other_p.user_id != $1
    JOIN users other_u ON other_p.user_id = other_u.id
    LEFT JOIN agent_profiles ap ON ap.user_id = other_u.id
    -- Property details
    LEFT JOIN properties p ON c.property_id = p.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    -- Last message lateral join
    LEFT JOIN LATERAL (
      SELECT id, message, sender_id, created_at
      FROM chat_messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    -- Unread count lateral join
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS unread_count
      FROM chat_messages
      WHERE conversation_id = c.id
        AND sender_id != $1
        AND is_read = FALSE
    ) unread ON true
    ORDER BY COALESCE(lm.created_at, c.updated_at) DESC
  `;

  const res = await db.query(query, [userId]);
  return res.rows;
}

/**
 * Get messages for a specific conversation and mark them as read
 */
async function getConversationMessages(conversationId, userId, limit = 100) {
  // 1. Verify user is participant
  const partCheck = await db.query(
    `SELECT 1 FROM chat_participants WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
  if (partCheck.rows.length === 0) {
    return null; // Not authorized / not found
  }

  // 2. Mark unread messages sent to this user as read
  await db.query(
    `UPDATE chat_messages
     SET is_read = TRUE
     WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
    [conversationId, userId]
  );

  await db.query(
    `UPDATE chat_participants
     SET last_read_at = NOW()
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  // 3. Fetch messages
  const messagesQuery = `
    SELECT 
      m.id,
      m.conversation_id,
      m.sender_id,
      m.message,
      m.is_read,
      m.created_at,
      u.first_name AS sender_first_name,
      u.last_name AS sender_last_name,
      u.role AS sender_role,
      u.avatar_url AS sender_avatar_url
    FROM chat_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC
    LIMIT $2
  `;

  const res = await db.query(messagesQuery, [conversationId, limit]);
  return res.rows;
}

/**
 * Send a new chat message
 */
async function createMessage({ conversationId, senderId, message }) {
  // Check participation
  const partCheck = await db.query(
    `SELECT user_id FROM chat_participants WHERE conversation_id = $1`,
    [conversationId]
  );
  const participantIds = partCheck.rows.map((r) => r.user_id);
  if (!participantIds.includes(senderId)) {
    throw new Error('You are not a participant in this conversation.');
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const msgRes = await client.query(
      `INSERT INTO chat_messages (conversation_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [conversationId, senderId, message]
    );
    const newMsg = msgRes.rows[0];

    // Update conversation timestamp
    await client.query(
      `UPDATE chat_conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    await client.query('COMMIT');

    // Retrieve sender details for immediate frontend display
    const senderRes = await db.query(
      `SELECT first_name AS sender_first_name, last_name AS sender_last_name, role AS sender_role, avatar_url AS sender_avatar_url
       FROM users WHERE id = $1`,
      [senderId]
    );
    const sender = senderRes.rows[0] || {};

    const otherRecipientId = participantIds.find((id) => id !== senderId);

    return {
      ...newMsg,
      ...sender,
      recipientId: otherRecipientId
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Count total unread messages for user across all conversations
 */
async function getUnreadChatCount(userId) {
  const query = `
    SELECT COUNT(*)::int AS unread
    FROM chat_messages m
    JOIN chat_participants p ON m.conversation_id = p.conversation_id AND p.user_id = $1
    WHERE m.sender_id != $1 AND m.is_read = FALSE
  `;
  const res = await db.query(query, [userId]);
  return res.rows[0]?.unread || 0;
}

/**
 * Get contacts list that current user can initiate chat with
 */
async function getAvailableContacts(currentUserId) {
  const query = `
    SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.avatar_url,
           ap.agency_name, ap.license_number
    FROM users u
    LEFT JOIN agent_profiles ap ON ap.user_id = u.id
    WHERE u.id != $1 AND u.is_active = TRUE
    ORDER BY 
      CASE WHEN u.role = 'ADMIN' THEN 1 WHEN u.role = 'AGENT' THEN 2 ELSE 3 END,
      u.first_name ASC
    LIMIT 50
  `;
  const res = await db.query(query, [currentUserId]);
  return res.rows;
}

/**
 * Edit a specific message (checking ownership)
 */
async function updateMessage(messageId, userId, newContent) {
  const query = `
    UPDATE chat_messages
    SET message = $1
    WHERE id = $2 AND sender_id = $3
    RETURNING id, message, created_at
  `;
  const res = await db.query(query, [newContent, messageId, userId]);
  return res.rows[0] || null;
}

/**
 * Delete a specific message (checking ownership)
 */
async function deleteMessage(messageId, userId) {
  const query = `
    DELETE FROM chat_messages
    WHERE id = $1 AND sender_id = $2
    RETURNING id
  `;
  const res = await db.query(query, [messageId, userId]);
  return res.rowCount > 0;
}

module.exports = {
  findOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  getUnreadChatCount,
  getAvailableContacts
};
