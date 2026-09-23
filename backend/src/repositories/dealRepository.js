const db = require('../config/db');

/**
 * Submit a formal Buy Offer or Rental Application
 */
async function createDeal({ propertyId, customerId, agentId, dealType, amount, terms = {}, customerNotes = '' }) {
  const query = `
    INSERT INTO property_deals (
      property_id, customer_id, agent_id, deal_type, amount, status, terms, customer_notes
    )
    VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)
    RETURNING *
  `;
  const res = await db.query(query, [
    propertyId,
    customerId,
    agentId,
    dealType,
    amount,
    JSON.stringify(terms),
    customerNotes
  ]);
  return getDealById(res.rows[0].id);
}

/**
 * Fetch a single deal by ID with joined property, customer, and agent details
 */
async function getDealById(dealId) {
  const query = `
    SELECT 
      d.id,
      d.property_id,
      d.customer_id,
      d.agent_id,
      d.deal_type,
      d.amount,
      d.status,
      d.counter_amount,
      d.terms,
      d.agent_notes,
      d.customer_notes,
      d.created_at,
      d.updated_at,
      -- Property info
      p.title AS property_title,
      p.slug AS property_slug,
      p.price AS property_listing_price,
      p.currency AS property_currency,
      p.price_period AS property_price_period,
      p.city AS property_city,
      p.street_address AS property_street_address,
      ps.code AS property_status_code,
      ps.name AS property_status_name,
      pt.name AS property_type_name,
      lt.code AS listing_type_code,
      lt.name AS listing_type_name,
      pm.url AS property_image_url,
      -- Customer info
      cu.first_name AS customer_first_name,
      cu.last_name AS customer_last_name,
      cu.email AS customer_email,
      cu.phone AS customer_phone,
      -- Agent info
      au.first_name AS agent_first_name,
      au.last_name AS agent_last_name,
      au.email AS agent_email,
      au.phone AS agent_phone,
      ap.agency_name,
      ap.license_number
    FROM property_deals d
    JOIN properties p ON d.property_id = p.id
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN property_types pt ON p.property_type_id = pt.id
    JOIN listing_types lt ON p.listing_type_id = lt.id
    JOIN users cu ON d.customer_id = cu.id
    JOIN users au ON d.agent_id = au.id
    LEFT JOIN agent_profiles ap ON ap.user_id = au.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE d.id = $1
  `;
  const res = await db.query(query, [dealId]);
  return res.rows[0] || null;
}

/**
 * Fetch deals submitted by a specific customer
 */
async function getCustomerDeals(customerId, { dealType, status } = {}) {
  const whereClauses = ['d.customer_id = $1'];
  const params = [customerId];

  if (dealType) {
    params.push(dealType);
    whereClauses.push(`d.deal_type = $${params.length}`);
  }

  if (status) {
    params.push(status);
    whereClauses.push(`d.status = $${params.length}`);
  }

  const query = `
    SELECT 
      d.id,
      d.property_id,
      d.customer_id,
      d.agent_id,
      d.deal_type,
      d.amount,
      d.status,
      d.counter_amount,
      d.terms,
      d.agent_notes,
      d.customer_notes,
      d.created_at,
      d.updated_at,
      -- Property info
      p.title AS property_title,
      p.slug AS property_slug,
      p.price AS property_listing_price,
      p.currency AS property_currency,
      p.price_period AS property_price_period,
      p.city AS property_city,
      ps.code AS property_status_code,
      pm.url AS property_image_url,
      -- Agent info
      au.first_name AS agent_first_name,
      au.last_name AS agent_last_name,
      au.phone AS agent_phone,
      ap.agency_name
    FROM property_deals d
    JOIN properties p ON d.property_id = p.id
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN users au ON d.agent_id = au.id
    LEFT JOIN agent_profiles ap ON ap.user_id = au.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY d.created_at DESC
  `;

  const res = await db.query(query, params);
  return res.rows;
}

/**
 * Fetch deals received by an agent for their listings
 */
async function getAgentDeals(agentId, { dealType, status } = {}) {
  const whereClauses = ['d.agent_id = $1'];
  const params = [agentId];

  if (dealType) {
    params.push(dealType);
    whereClauses.push(`d.deal_type = $${params.length}`);
  }

  if (status) {
    params.push(status);
    whereClauses.push(`d.status = $${params.length}`);
  }

  const query = `
    SELECT 
      d.id,
      d.property_id,
      d.customer_id,
      d.agent_id,
      d.deal_type,
      d.amount,
      d.status,
      d.counter_amount,
      d.terms,
      d.agent_notes,
      d.customer_notes,
      d.created_at,
      d.updated_at,
      -- Property info
      p.title AS property_title,
      p.slug AS property_slug,
      p.price AS property_listing_price,
      p.currency AS property_currency,
      p.price_period AS property_price_period,
      p.city AS property_city,
      ps.code AS property_status_code,
      pm.url AS property_image_url,
      -- Customer info
      cu.first_name AS customer_first_name,
      cu.last_name AS customer_last_name,
      cu.email AS customer_email,
      cu.phone AS customer_phone
    FROM property_deals d
    JOIN properties p ON d.property_id = p.id
    JOIN property_statuses ps ON p.status_id = ps.id
    JOIN users cu ON d.customer_id = cu.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY d.created_at DESC
  `;

  const res = await db.query(query, params);
  return res.rows;
}

/**
 * Update deal status (Agent Accepts/Counters/Rejects or Customer Accepts Counter/Cancels)
 */
async function updateDealStatus(dealId, { status, counterAmount, agentNotes, customerNotes }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch current deal state
    const currentDealRes = await client.query('SELECT * FROM property_deals WHERE id = $1 FOR UPDATE', [dealId]);
    if (currentDealRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }
    const currentDeal = currentDealRes.rows[0];

    // 2. Update the deal status
    const updateRes = await client.query(
      `UPDATE property_deals
       SET status = $1,
           counter_amount = COALESCE($2, counter_amount),
           agent_notes = COALESCE($3, agent_notes),
           customer_notes = COALESCE($4, customer_notes),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [status, counterAmount || null, agentNotes || null, customerNotes || null, dealId]
    );
    const updatedDeal = updateRes.rows[0];

    // 3. Property status transitions on acceptance!
    if (status === 'ACCEPTED') {
      let targetStatusCode = null;
      if (currentDeal.deal_type === 'BUY_OFFER') {
        targetStatusCode = 'SOLD';
      } else if (currentDeal.deal_type === 'RENT_APPLICATION') {
        targetStatusCode = 'RENTED';
      }

      if (targetStatusCode) {
        // Look up status_id from property_statuses
        const statusLookup = await client.query('SELECT id FROM property_statuses WHERE code = $1', [targetStatusCode]);
        if (statusLookup.rows.length > 0) {
          const statusId = statusLookup.rows[0].id;
          await client.query(
            'UPDATE properties SET status_id = $1, updated_at = NOW() WHERE id = $2',
            [statusId, currentDeal.property_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    return getDealById(dealId);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createDeal,
  getDealById,
  getCustomerDeals,
  getAgentDeals,
  updateDealStatus
};
