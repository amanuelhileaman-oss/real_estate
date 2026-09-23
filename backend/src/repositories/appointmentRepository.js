const db = require('../config/db');
const { ForbiddenError, BadRequestError, NotFoundError } = require('../utils/appError');

async function findAppointmentById(id) {
  const res = await db.query('SELECT * FROM viewing_appointments WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function createAppointment({ propertyId, customerId, requestedDate, timeSlot, alternativeDate, notes }) {
  // Find agent and title for this property
  const propRes = await db.query('SELECT id, agent_id, title, status_id FROM properties WHERE id = $1', [propertyId]);
  if (propRes.rows.length === 0) {
    throw new NotFoundError('Property not found');
  }

  const property = propRes.rows[0];
  const agentId = property.agent_id;

  if (agentId === customerId) {
    throw new BadRequestError('Agents cannot schedule viewing tours on their own listings.');
  }

  // Get customer info for notification
  const userRes = await db.query('SELECT first_name, last_name, email FROM users WHERE id = $1', [customerId]);
  const customerName = userRes.rows[0] ? `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}` : 'A customer';

  const res = await db.query(
    `INSERT INTO viewing_appointments (
      property_id, customer_id, agent_id,
      requested_date, time_slot, alternative_date, notes, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
    RETURNING *`,
    [propertyId, customerId, agentId, requestedDate, timeSlot, alternativeDate || null, notes || null]
  );

  const appointment = res.rows[0];

  // Dispatch in-app notification to the listing agent
  await db.query(
    `INSERT INTO notifications (user_id, type, title, message, link_url, metadata)
     VALUES ($1, 'APPOINTMENT_REQUESTED', $2, $3, $4, $5)`,
    [
      agentId,
      `New Viewing Request: ${property.title}`,
      `Tour requested for ${requestedDate} (${timeSlot}) by ${customerName}.`,
      `/portal/agent/appointments`,
      JSON.stringify({ appointmentId: appointment.id, propertyId })
    ]
  );

  return appointment;
}

async function getCustomerAppointments(customerId) {
  const sql = `
    SELECT 
      va.*,
      p.title AS property_title, p.slug AS property_slug, p.street_address, p.city,
      u.first_name AS agent_first_name, u.last_name AS agent_last_name, u.phone AS agent_phone, u.email AS agent_email,
      pm.url AS property_image_url
    FROM viewing_appointments va
    JOIN properties p ON va.property_id = p.id
    JOIN users u ON va.agent_id = u.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    WHERE va.customer_id = $1
    ORDER BY va.requested_date DESC, va.created_at DESC
  `;
  const res = await db.query(sql, [customerId]);
  return res.rows;
}

async function getAgentAppointments(agentId = null) {
  const where = agentId ? 'WHERE va.agent_id = $1' : '';
  const params = agentId ? [agentId] : [];

  const sql = `
    SELECT 
      va.*,
      p.title AS property_title, p.slug AS property_slug, p.street_address, p.city,
      u.first_name AS customer_first_name, u.last_name AS customer_last_name, u.phone AS customer_phone, u.email AS customer_email,
      pm.url AS property_image_url
    FROM viewing_appointments va
    JOIN properties p ON va.property_id = p.id
    JOIN users u ON va.customer_id = u.id
    LEFT JOIN LATERAL (
      SELECT url FROM property_media WHERE property_id = p.id ORDER BY is_primary DESC, sort_order ASC LIMIT 1
    ) pm ON true
    ${where}
    ORDER BY va.requested_date ASC, va.created_at DESC
  `;
  const res = await db.query(sql, params);
  return res.rows;
}

async function updateAppointmentStatus(appointmentId, { status, cancellationReason, alternativeDate, timeSlot }, userId, userRole) {
  const existing = await findAppointmentById(appointmentId);
  if (!existing) {
    return null;
  }

  // Ownership verification
  if (userRole === 'CUSTOMER') {
    if (existing.customer_id !== userId) {
      throw new ForbiddenError('You are not authorized to modify this appointment.');
    }
    if (status !== 'CANCELLED') {
      throw new BadRequestError('Customers can only cancel appointments.');
    }
  } else if (userRole === 'AGENT') {
    if (existing.agent_id !== userId) {
      throw new ForbiddenError('You are not authorized to modify this appointment.');
    }
  }

  const updates = ['status = $1', 'updated_at = NOW()'];
  const params = [status];

  if (cancellationReason !== undefined && cancellationReason !== null) {
    params.push(cancellationReason);
    updates.push(`cancellation_reason = $${params.length}`);
  }

  if (alternativeDate) {
    params.push(alternativeDate);
    updates.push(`alternative_date = $${params.length}`);
  }

  if (timeSlot) {
    params.push(timeSlot);
    updates.push(`time_slot = $${params.length}`);
  }

  params.push(appointmentId);

  const sql = `
    UPDATE viewing_appointments
    SET ${updates.join(', ')}
    WHERE id = $${params.length}
    RETURNING *
  `;

  const res = await db.query(sql, params);
  const updated = res.rows[0];

  if (updated) {
    // Fetch property title
    const propRes = await db.query('SELECT title FROM properties WHERE id = $1', [updated.property_id]);
    const propertyTitle = propRes.rows[0]?.title || 'Property';

    // Determine counterparty and event type
    const notifyUserId = userRole === 'CUSTOMER' ? updated.agent_id : updated.customer_id;
    let notifType = 'APPOINTMENT_UPDATED';
    let notifTitle = `Viewing Status: ${status}`;
    let notifMsg = `Your viewing tour for "${propertyTitle}" on ${updated.requested_date} (${updated.time_slot}) is now ${status}.`;

    if (status === 'CONFIRMED') {
      notifType = 'APPOINTMENT_CONFIRMED';
      notifTitle = 'Viewing Tour Confirmed!';
      notifMsg = `Your tour for "${propertyTitle}" on ${updated.requested_date} (${updated.time_slot}) was confirmed by the agent.`;
    } else if (status === 'REJECTED') {
      notifType = 'APPOINTMENT_REJECTED';
      notifTitle = 'Viewing Tour Request Declined';
      notifMsg = `Your tour request for "${propertyTitle}" on ${updated.requested_date} was declined.` + (cancellationReason ? ` Reason: ${cancellationReason}` : '');
    } else if (status === 'CANCELLED') {
      notifType = 'APPOINTMENT_CANCELLED';
      notifTitle = 'Viewing Tour Cancelled';
      notifMsg = `The viewing tour for "${propertyTitle}" on ${updated.requested_date} was cancelled by ${userRole === 'CUSTOMER' ? 'the customer' : 'the listing agent'}.` + (cancellationReason ? ` (${cancellationReason})` : '');
    }

    const linkUrl = userRole === 'CUSTOMER' ? '/portal/agent/appointments' : '/portal/customer/appointments';

    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, link_url, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        notifyUserId,
        notifType,
        notifTitle,
        notifMsg,
        linkUrl,
        JSON.stringify({ appointmentId: updated.id, propertyId: updated.property_id, status })
      ]
    );
  }

  return updated || null;
}

module.exports = {
  findAppointmentById,
  createAppointment,
  getCustomerAppointments,
  getAgentAppointments,
  updateAppointmentStatus
};
