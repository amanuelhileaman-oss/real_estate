/**
 * Complete Customer Interaction System Automated Test Suite
 *
 * Requirements Tested:
 * 1. FAVORITES:
 *    - Add property to favorites
 *    - Remove property from favorites
 *    - View favorite properties
 *    - Prevent duplicate favorite records (idempotent ON CONFLICT / unique constraint)
 *    - Ownership isolation: Customer cannot manipulate or view another customer's favorites
 *
 * 2. INQUIRIES:
 *    - Customer contacts agent about specific property
 *    - Association of Customer, Agent, Property, Message, Status, Created timestamp
 *    - Agent views inquiries related to their properties
 *    - Customer views their own inquiries
 *    - Status updates (NEW -> CONTACTED -> CLOSED)
 *    - Isolation: Unrelated agent cannot view another agent's customer inquiries
 *
 * 3. APPOINTMENTS:
 *    - Customer requests property viewing tour (Date, Time, Message, Status)
 *    - Lifecycle states: PENDING, CONFIRMED, REJECTED, CANCELLED, COMPLETED
 *    - Agent manages appointments related to their properties (Confirm, Reject, Complete)
 *    - Customer manages their own viewing appointments (Cancel)
 *    - Isolation: Cross-customer and cross-agent viewing isolation
 *
 * 4. NOTIFICATIONS:
 *    - In-app notification for Property approval & rejection (to Agent)
 *    - In-app notification for New inquiry (to Agent)
 *    - In-app notification for Appointment request (to Agent)
 *    - In-app notification for Appointment confirmation (to Customer)
 *    - In-app notification for Appointment rejection (to Customer)
 *    - In-app notification for Appointment cancellation (to Counterparty)
 *    - Unread count tracking, marking single read, mark all read, deletion
 *
 * 5. SECURITY:
 *    - Role-based and ownership checks on every endpoint
 */

const assert = require('assert');
const db = require('../src/config/db');

const API_BASE = 'http://localhost:5000/api/v1';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
}

async function run() {
  console.log('\n======================================================');
  console.log('🤝 CUSTOMER INTERACTION SYSTEM VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // Step 0: Authenticate accounts
  console.log('🔐 Step 0: Authenticating test accounts...');

  const [sarahLogin, davidLogin, alexLogin, adminLogin] = await Promise.all([
    request('/auth/login', {
      method: 'POST',
      body: { email: 'agent.sarah@realestate.com', password: 'AgentPass123!' }
    }),
    request('/auth/login', {
      method: 'POST',
      body: { email: 'agent.david@realestate.com', password: 'AgentPass123!' }
    }),
    request('/auth/login', {
      method: 'POST',
      body: { email: 'customer.alex@gmail.com', password: 'CustomerPass123!' }
    }),
    request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@apexrealty.com', password: 'AdminSecure2026!' }
    })
  ]);

  assert.strictEqual(sarahLogin.status, 200, 'Agent Sarah login succeeded');
  assert.strictEqual(davidLogin.status, 200, 'Agent David login succeeded');
  assert.strictEqual(alexLogin.status, 200, 'Customer Alex login succeeded');
  assert.strictEqual(adminLogin.status, 200, 'Admin login succeeded');

  const sarahToken = sarahLogin.data.data.accessToken;
  const davidToken = davidLogin.data.data.accessToken;
  const alexToken = alexLogin.data.data.accessToken;
  const adminToken = adminLogin.data.data.accessToken;
  const sarahId = sarahLogin.data.data.user.id;
  const davidId = davidLogin.data.data.user.id;
  const alexId = alexLogin.data.data.user.id;

  // Register second customer for isolation testing
  let emmaToken = null;
  let emmaId = null;
  const emmaLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'customer.emma@gmail.com', password: 'CustomerPass123!' }
  });

  if (emmaLogin.status === 200) {
    emmaToken = emmaLogin.data.data.accessToken;
    emmaId = emmaLogin.data.data.user.id;
  } else {
    const emmaReg = await request('/auth/register', {
      method: 'POST',
      body: {
        email: 'customer.emma@gmail.com',
        password: 'CustomerPass123!',
        firstName: 'Emma',
        lastName: 'Watson',
        role: 'CUSTOMER'
      }
    });
    assert(emmaReg.status === 201, 'Customer Emma registered');
    emmaToken = emmaReg.data.data.accessToken;
    emmaId = emmaReg.data.data.user.id;
  }

  console.log(`  Agent Sarah ID: ${sarahId}`);
  console.log(`  Agent David ID: ${davidId}`);
  console.log(`  Customer Alex ID: ${alexId}`);
  console.log(`  Customer Emma ID: ${emmaId}`);

  // Fetch an active property listed by Agent Sarah
  const propRes = await db.query(
    `SELECT p.id, p.title, p.agent_id
     FROM properties p
     JOIN property_statuses ps ON p.status_id = ps.id
     WHERE p.agent_id = $1 AND ps.code = 'ACTIVE'
     LIMIT 1`,
    [sarahId]
  );
  assert(propRes.rows.length > 0, 'Found active property for Agent Sarah');
  const propertySarah = propRes.rows[0];
  console.log(`  Testing with Sarah's listing: "${propertySarah.title}" (${propertySarah.id})`);

  // ==========================================
  // SECTION 1: FAVORITES WORKFLOW & SECURITY
  // ==========================================
  console.log('\n⭐ SECTION 1: Favorites Workflow & Security');

  // 1.1 Customer Alex adds property to favorites
  const addFav1 = await request(`/favorites/${propertySarah.id}/add`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Customer Alex can add property to favorites (201)', () => {
    assert.strictEqual(addFav1.status, 201);
    assert.strictEqual(addFav1.data.data.favorited, true);
  });

  // 1.2 Prevent duplicate favorite record (idempotent addition)
  const addFavDuplicate = await request(`/favorites/${propertySarah.id}/add`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Prevent duplicate favorite records without error (201, favorited=true)', () => {
    assert.strictEqual(addFavDuplicate.status, 201);
    assert.strictEqual(addFavDuplicate.data.data.favorited, true);
  });

  // Verify database count for duplicate protection
  const dbFavCount = await db.query(
    'SELECT COUNT(*) as count FROM favorites WHERE user_id = $1 AND property_id = $2',
    [alexId, propertySarah.id]
  );
  test('Database enforces UNIQUE(user_id, property_id) constraint: exactly 1 row', () => {
    assert.strictEqual(parseInt(dbFavCount.rows[0].count, 10), 1);
  });

  // 1.3 Check favorite status
  const checkFav = await request(`/favorites/check/${propertySarah.id}`, {
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Check favorite returns { favorited: true }', () => {
    assert.strictEqual(checkFav.status, 200);
    assert.strictEqual(checkFav.data.data.favorited, true);
  });

  // 1.4 View favorite properties
  const getFavs = await request('/favorites', {
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Customer Alex can view their favorite properties', () => {
    assert.strictEqual(getFavs.status, 200);
    assert(Array.isArray(getFavs.data.data), 'Data is an array');
    const found = getFavs.data.data.some((f) => f.id === propertySarah.id);
    assert(found, 'Favorited property is in Alex favorites list');
  });

  // 1.5 Security: Customer Emma cannot see Customer Alex favorites
  const emmaFavs = await request('/favorites', {
    headers: { Authorization: `Bearer ${emmaToken}` }
  });
  test('Customer Emma cannot see Customer Alex favorites (Security Isolation)', () => {
    assert.strictEqual(emmaFavs.status, 200);
    const hasSarahProp = emmaFavs.data.data.some((f) => f.id === propertySarah.id);
    assert.strictEqual(hasSarahProp, false, 'Emma favorites do not contain Alex favorites');
  });

  // 1.6 Remove property from favorites
  const removeFav = await request(`/favorites/${propertySarah.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Customer Alex can remove property from favorites (200)', () => {
    assert.strictEqual(removeFav.status, 200);
    assert.strictEqual(removeFav.data.data.favorited, false);
  });

  // 1.7 Verify removal reflected in list
  const getFavsAfterRemove = await request('/favorites', {
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Removed property no longer appears in customer favorites', () => {
    assert.strictEqual(getFavsAfterRemove.status, 200);
    const found = getFavsAfterRemove.data.data.some((f) => f.id === propertySarah.id);
    assert.strictEqual(found, false);
  });

  // 1.8 Shortcut route on property: POST /properties/:id/favorite
  const propFavPost = await request(`/properties/${propertySarah.id}/favorite`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Property sub-route POST /properties/:id/favorite adds/toggles favorite', () => {
    assert.strictEqual(propFavPost.status, 200);
    assert.strictEqual(propFavPost.data.data.favorited, true);
  });

  // ==========================================
  // SECTION 2: INQUIRIES WORKFLOW & ISOLATION
  // ==========================================
  console.log('\n💬 SECTION 2: Inquiries Workflow & Isolation');

  // Clear unread notifications for Sarah before testing
  await db.query('DELETE FROM notifications WHERE user_id = $1', [sarahId]);

  // 2.1 Customer Alex submits inquiry for Agent Sarah's property
  const inquiryRes = await request('/inquiries', {
    method: 'POST',
    headers: { Authorization: `Bearer ${alexToken}` },
    body: {
      propertyId: propertySarah.id,
      name: 'Alex Johnson',
      email: 'customer.alex@gmail.com',
      phone: '+1 555-123-4567',
      message: 'Hello Sarah, I would love to know if this home includes private parking!'
    }
  });

  test('Customer Alex can submit inquiry for listing agent (201 Created)', () => {
    assert.strictEqual(inquiryRes.status, 201);
    assert.strictEqual(inquiryRes.data.data.property_id, propertySarah.id);
    assert.strictEqual(inquiryRes.data.data.agent_id, sarahId);
    assert.strictEqual(inquiryRes.data.data.customer_id, alexId);
    assert.strictEqual(inquiryRes.data.data.status, 'NEW');
    assert(inquiryRes.data.data.created_at, 'created_at timestamp populated');
  });

  const createdInquiryId = inquiryRes.data.data.id;

  // 2.2 Verify Agent Sarah received INQUIRY_RECEIVED notification
  const sarahNotifsInq = await request('/notifications', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Agent Sarah receives in-app notification for new inquiry', () => {
    assert.strictEqual(sarahNotifsInq.status, 200);
    const inqNotif = sarahNotifsInq.data.data.find((n) => n.type === 'INQUIRY_RECEIVED');
    assert(inqNotif, 'Found INQUIRY_RECEIVED notification for Sarah');
    assert(inqNotif.message.includes('Alex Johnson'), 'Notification contains customer name');
    assert.strictEqual(inqNotif.is_read, false, 'Notification is unread initially');
  });

  // 2.3 Customer Alex views their own inquiries
  const alexInquiries = await request('/inquiries/my', {
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Customer Alex can view their submitted inquiries (/inquiries/my)', () => {
    assert.strictEqual(alexInquiries.status, 200);
    const found = alexInquiries.data.data.find((i) => i.id === createdInquiryId);
    assert(found, 'Alex sees their submitted inquiry');
    assert.strictEqual(found.status, 'NEW');
    assert(found.agent_first_name, 'Includes listing agent details');
  });

  // 2.4 Agent Sarah views inquiries related to her properties
  const sarahInquiries = await request('/inquiries/agent', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Agent Sarah can view inquiries related to her properties (/inquiries/agent)', () => {
    assert.strictEqual(sarahInquiries.status, 200);
    const found = sarahInquiries.data.data.find((i) => i.id === createdInquiryId);
    assert(found, 'Sarah sees the inquiry for her property');
    assert.strictEqual(found.email, 'customer.alex@gmail.com');
  });

  // 2.5 Security: Unrelated Agent David cannot see Sarah's inquiries
  const davidInquiries = await request('/inquiries/agent', {
    headers: { Authorization: `Bearer ${davidToken}` }
  });
  test('Agent David does not see Agent Sarah customer inquiries (Agent Privacy Isolation)', () => {
    assert.strictEqual(davidInquiries.status, 200);
    const found = davidInquiries.data.data.find((i) => i.id === createdInquiryId);
    assert.strictEqual(found, undefined, 'David cannot see inquiries for Sarah properties');
  });

  // 2.6 Security: Customer Emma cannot see Customer Alex inquiries
  const emmaInquiries = await request('/inquiries/my', {
    headers: { Authorization: `Bearer ${emmaToken}` }
  });
  test('Customer Emma does not see Alex private inquiries (Customer Privacy Isolation)', () => {
    assert.strictEqual(emmaInquiries.status, 200);
    const found = emmaInquiries.data.data.find((i) => i.id === createdInquiryId);
    assert.strictEqual(found, undefined, 'Emma cannot see Alex private inquiries');
  });

  // 2.7 Agent Sarah updates inquiry status to CONTACTED
  const updateInqStatus = await request(`/inquiries/${createdInquiryId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sarahToken}` },
    body: { status: 'CONTACTED' }
  });
  test('Agent Sarah can update inquiry status to CONTACTED (200 OK)', () => {
    assert.strictEqual(updateInqStatus.status, 200);
    assert.strictEqual(updateInqStatus.data.data.status, 'CONTACTED');
  });

  // 2.8 Unrelated Agent David cannot update Sarah inquiry status (403 Forbidden)
  const davidUpdateInq = await request(`/inquiries/${createdInquiryId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${davidToken}` },
    body: { status: 'CLOSED' }
  });
  test('Unrelated Agent David cannot update Sarah inquiry status (403 Forbidden)', () => {
    assert.strictEqual(davidUpdateInq.status, 403);
  });

  // ==========================================
  // SECTION 3: APPOINTMENTS WORKFLOW & STATES
  // ==========================================
  console.log('\n📅 SECTION 3: Viewing Appointments Workflow & State Machine');

  // Clear notifications for clean assertions
  await db.query('DELETE FROM notifications WHERE user_id IN ($1, $2)', [sarahId, alexId]);

  // Tomorrow date string YYYY-MM-DD
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 3.1 Customer Alex requests viewing appointment
  const apt1Res = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${alexToken}` },
    body: {
      propertyId: propertySarah.id,
      requestedDate: tomorrow,
      timeSlot: '14:00 - 15:00',
      notes: 'Interested in touring the master suite and rooftop terrace.'
    }
  });

  test('Customer Alex can request viewing tour (201 Created with PENDING status)', () => {
    assert.strictEqual(apt1Res.status, 201);
    assert.strictEqual(apt1Res.data.data.property_id, propertySarah.id);
    assert.strictEqual(apt1Res.data.data.agent_id, sarahId);
    assert.strictEqual(apt1Res.data.data.customer_id, alexId);
    assert.strictEqual(apt1Res.data.data.status, 'PENDING');
    assert.strictEqual(apt1Res.data.data.time_slot, '14:00 - 15:00');
  });

  const apt1Id = apt1Res.data.data.id;

  // 3.2 Verify Agent Sarah received APPOINTMENT_REQUESTED notification
  const sarahNotifsApt = await request('/notifications', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Agent Sarah receives APPOINTMENT_REQUESTED notification', () => {
    assert.strictEqual(sarahNotifsApt.status, 200);
    const aptNotif = sarahNotifsApt.data.data.find((n) => n.type === 'APPOINTMENT_REQUESTED');
    assert(aptNotif, 'Found APPOINTMENT_REQUESTED notification');
    assert(aptNotif.message.includes('Alex'), 'Notification includes customer name');
  });

  // 3.3 Customer Alex views their scheduled appointments
  const alexApts = await request('/appointments/my', {
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Customer Alex can view their own scheduled appointments (/appointments/my)', () => {
    assert.strictEqual(alexApts.status, 200);
    const found = alexApts.data.data.find((a) => a.id === apt1Id);
    assert(found, 'Alex sees their requested viewing');
    assert.strictEqual(found.status, 'PENDING');
  });

  // 3.4 Agent Sarah views appointments for her properties
  const sarahApts = await request('/appointments/agent', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Agent Sarah can view appointment schedule for her properties (/appointments/agent)', () => {
    assert.strictEqual(sarahApts.status, 200);
    const found = sarahApts.data.data.find((a) => a.id === apt1Id);
    assert(found, 'Sarah sees the appointment request');
    assert.strictEqual(found.customer_first_name, 'Alex');
  });

  // 3.5 Security: Unrelated Agent David cannot see Sarah's appointments
  const davidApts = await request('/appointments/agent', {
    headers: { Authorization: `Bearer ${davidToken}` }
  });
  test('Agent David does not see Agent Sarah appointments (Agent Schedule Isolation)', () => {
    assert.strictEqual(davidApts.status, 200);
    const found = davidApts.data.data.find((a) => a.id === apt1Id);
    assert.strictEqual(found, undefined, 'David cannot see appointments for Sarah listings');
  });

  // 3.6 Security: Customer Emma cannot see Customer Alex appointments
  const emmaApts = await request('/appointments/my', {
    headers: { Authorization: `Bearer ${emmaToken}` }
  });
  test('Customer Emma does not see Customer Alex appointments (Customer Privacy Isolation)', () => {
    assert.strictEqual(emmaApts.status, 200);
    const found = emmaApts.data.data.find((a) => a.id === apt1Id);
    assert.strictEqual(found, undefined, 'Emma cannot see Alex viewing appointments');
  });

  // 3.7 Agent Sarah confirms viewing appointment (PENDING -> CONFIRMED)
  const confirmApt1 = await request(`/appointments/${apt1Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sarahToken}` },
    body: { status: 'CONFIRMED' }
  });
  test('Agent Sarah confirms viewing appointment (Status -> CONFIRMED)', () => {
    assert.strictEqual(confirmApt1.status, 200);
    assert.strictEqual(confirmApt1.data.data.status, 'CONFIRMED');
  });

  // 3.8 Customer Alex receives APPOINTMENT_CONFIRMED notification
  const alexNotifsConfirm = await request('/notifications', {
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Customer Alex receives APPOINTMENT_CONFIRMED in-app notification', () => {
    assert.strictEqual(alexNotifsConfirm.status, 200);
    const notif = alexNotifsConfirm.data.data.find((n) => n.type === 'APPOINTMENT_CONFIRMED');
    assert(notif, 'Found APPOINTMENT_CONFIRMED notification for Alex');
    assert(notif.message.includes('confirmed by the agent'));
  });

  // 3.9 Testing REJECTED state:
  // Create 2nd appointment, then Agent Sarah rejects it
  const apt2Res = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${alexToken}` },
    body: {
      propertyId: propertySarah.id,
      requestedDate: tomorrow,
      timeSlot: '18:00 - 19:00',
      notes: 'Evening viewing request'
    }
  });
  assert.strictEqual(apt2Res.status, 201, 'Appointment 2 created');
  const apt2Id = apt2Res.data.data.id;

  const rejectApt2 = await request(`/appointments/${apt2Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sarahToken}` },
    body: {
      status: 'REJECTED',
      cancellationReason: 'Agent is attending a closing at that hour.'
    }
  });
  test('Agent Sarah can reject appointment request (Status -> REJECTED with reason)', () => {
    assert.strictEqual(rejectApt2.status, 200);
    assert.strictEqual(rejectApt2.data.data.status, 'REJECTED');
    assert.strictEqual(rejectApt2.data.data.cancellation_reason, 'Agent is attending a closing at that hour.');
  });

  // 3.10 Customer Alex receives APPOINTMENT_REJECTED notification
  const alexNotifsReject = await request('/notifications', {
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Customer Alex receives APPOINTMENT_REJECTED in-app notification with reason', () => {
    assert.strictEqual(alexNotifsReject.status, 200);
    const notif = alexNotifsReject.data.data.find(
      (n) => n.type === 'APPOINTMENT_REJECTED' && n.metadata?.appointmentId === apt2Id
    );
    assert(notif, 'Found APPOINTMENT_REJECTED notification');
    assert(notif.message.includes('declined'), 'Notification indicates tour was declined');
  });

  // 3.11 Testing CANCELLED state:
  // Create 3rd appointment, then Customer Alex cancels it
  const apt3Res = await request('/appointments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${alexToken}` },
    body: {
      propertyId: propertySarah.id,
      requestedDate: tomorrow,
      timeSlot: '09:00 - 10:00',
      notes: 'Early morning tour'
    }
  });
  assert.strictEqual(apt3Res.status, 201, 'Appointment 3 created');
  const apt3Id = apt3Res.data.data.id;

  const cancelApt3 = await request(`/appointments/${apt3Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${alexToken}` },
    body: {
      status: 'CANCELLED',
      cancellationReason: 'Schedule conflict on customer side'
    }
  });
  test('Customer Alex can cancel their own viewing appointment (Status -> CANCELLED)', () => {
    assert.strictEqual(cancelApt3.status, 200);
    assert.strictEqual(cancelApt3.data.data.status, 'CANCELLED');
  });

  // 3.12 Agent Sarah receives APPOINTMENT_CANCELLED notification
  const sarahNotifsCancel = await request('/notifications', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Agent Sarah receives APPOINTMENT_CANCELLED notification from customer', () => {
    assert.strictEqual(sarahNotifsCancel.status, 200);
    const notif = sarahNotifsCancel.data.data.find(
      (n) => n.type === 'APPOINTMENT_CANCELLED' && n.metadata?.appointmentId === apt3Id
    );
    assert(notif, 'Found APPOINTMENT_CANCELLED notification for Sarah');
    assert(notif.message.includes('cancelled by the customer'));
  });

  // 3.13 Testing COMPLETED state:
  const completeApt1 = await request(`/appointments/${apt1Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sarahToken}` },
    body: { status: 'COMPLETED' }
  });
  test('Agent Sarah marks tour as COMPLETED', () => {
    assert.strictEqual(completeApt1.status, 200);
    assert.strictEqual(completeApt1.data.data.status, 'COMPLETED');
  });

  // 3.14 Security: Customer cannot confirm their own appointment (only cancel)
  const customerIllegalConfirm = await request(`/appointments/${apt2Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${alexToken}` },
    body: { status: 'CONFIRMED' }
  });
  test('Customer cannot confirm appointments (400 Bad Request: Customers can only cancel)', () => {
    assert.strictEqual(customerIllegalConfirm.status, 400);
  });

  // 3.15 Security: Unrelated Agent David cannot modify Sarah appointments (403 Forbidden)
  const davidIllegalMod = await request(`/appointments/${apt1Id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${davidToken}` },
    body: { status: 'CANCELLED' }
  });
  test('Unrelated Agent David cannot modify Agent Sarah appointments (403 Forbidden)', () => {
    assert.strictEqual(davidIllegalMod.status, 403);
  });

  // ========================================================
  // SECTION 4: PROPERTY APPROVAL & REJECTION NOTIFICATIONS
  // ========================================================
  console.log('\n🏠 SECTION 4: Property Approval & Rejection In-App Notifications');

  // Agent Sarah creates a test property to be approved
  const typeRes = await db.query('SELECT id FROM property_types LIMIT 1');
  const listTypeRes = await db.query('SELECT id FROM listing_types LIMIT 1');
  const propertyTypeId = typeRes.rows[0].id;
  const listingTypeId = listTypeRes.rows[0].id;

  const propApprovalRes = await request('/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sarahToken}` },
    body: {
      title: 'Automated Approval Notification Test Villa',
      description: 'Luxury modern villa designed for automated notification verification suite.',
      price: 1850000,
      propertyTypeCode: 'VILLA',
      listingTypeCode: 'FOR_SALE',
      bedrooms: 4,
      bathrooms: 4.5,
      areaSqm: 420,
      country: 'United States',
      stateRegion: 'Texas',
      city: 'Austin',
      streetAddress: '777 Notification Way',
      postalCode: '78701',
      latitude: 30.2672,
      longitude: -97.7431
    }
  });
  assert.strictEqual(propApprovalRes.status, 201, 'Test property created');
  const propApprovalId = propApprovalRes.data.data.id;

  // Clear Sarah's notifications
  await db.query('DELETE FROM notifications WHERE user_id = $1', [sarahId]);

  // Admin approves listing
  const approveRes = await request(`/admin/properties/${propApprovalId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  test('Admin approves listing (200 OK)', () => {
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.data.status_code, 'ACTIVE');
  });

  // Verify Agent Sarah received PROPERTY_APPROVED notification
  const sarahNotifsApprove = await request('/notifications', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Agent Sarah receives in-app notification when property is approved (PROPERTY_APPROVED)', () => {
    assert.strictEqual(sarahNotifsApprove.status, 200);
    const notif = sarahNotifsApprove.data.data.find((n) => n.type === 'PROPERTY_APPROVED');
    assert(notif, 'Found PROPERTY_APPROVED notification');
    assert(notif.message.includes('Automated Approval Notification Test Villa'));
  });

  // Agent Sarah creates another test property to be rejected
  const propRejectRes = await request('/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sarahToken}` },
    body: {
      title: 'Automated Rejection Notification Test Condo',
      description: 'Condo listing created to verify admin rejection notification delivery.',
      price: 450000,
      propertyTypeCode: 'CONDO',
      listingTypeCode: 'FOR_SALE',
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: 65,
      country: 'United States',
      stateRegion: 'Texas',
      city: 'Austin',
      streetAddress: '888 Rejection Blvd',
      postalCode: '78701',
      latitude: 30.2672,
      longitude: -97.7431
    }
  });
  assert.strictEqual(propRejectRes.status, 201, 'Test rejection property created');
  const propRejectId = propRejectRes.data.data.id;

  // Admin rejects listing with reason
  const rejectRes = await request(`/admin/properties/${propRejectId}/reject`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { reason: 'Please upload higher-resolution exterior photographs before publishing.' }
  });
  test('Admin rejects listing with feedback reason (200 OK)', () => {
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.data.data.status_code, 'REJECTED');
  });

  // Verify Agent Sarah received PROPERTY_REJECTED notification
  const sarahNotifsReject = await request('/notifications', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Agent Sarah receives in-app notification when property is rejected (PROPERTY_REJECTED)', () => {
    assert.strictEqual(sarahNotifsReject.status, 200);
    const notif = sarahNotifsReject.data.data.find((n) => n.type === 'PROPERTY_REJECTED');
    assert(notif, 'Found PROPERTY_REJECTED notification');
    assert(notif.message.includes('Please upload higher-resolution exterior photographs'));
  });

  // ========================================================
  // SECTION 5: NOTIFICATION API, UNREAD COUNT & READ STATE
  // ========================================================
  console.log('\n🔔 SECTION 5: Notification API, Read Tracking & Ownership Isolation');

  // 5.1 Fetch unread count for Sarah
  const unreadCountRes = await request('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Fetch unread notifications count (200 OK, unreadCount >= 2)', () => {
    assert.strictEqual(unreadCountRes.status, 200);
    assert(typeof unreadCountRes.data.data.unreadCount === 'number');
    assert(unreadCountRes.data.data.unreadCount >= 2);
  });

  const sarahUnreadCountBefore = unreadCountRes.data.data.unreadCount;

  // 5.2 Mark single notification as read
  const notifToMark = sarahNotifsReject.data.data[0];
  const markReadRes = await request(`/notifications/${notifToMark.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Mark single notification as read (200 OK, is_read = true)', () => {
    assert.strictEqual(markReadRes.status, 200);
    assert.strictEqual(markReadRes.data.data.is_read, true);
  });

  // Verify unread count decremented by 1
  const unreadCountAfterSingle = await request('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Unread count decremented after marking single notification read', () => {
    assert.strictEqual(
      unreadCountAfterSingle.data.data.unreadCount,
      sarahUnreadCountBefore - 1
    );
  });

  // 5.3 Security: Customer Alex cannot mark Agent Sarah's notification as read (404/403)
  const alexIllegalMark = await request(`/notifications/${notifToMark.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${alexToken}` }
  });
  test('Cross-user notification modification blocked (Security Isolation 404)', () => {
    assert.strictEqual(alexIllegalMark.status, 404);
  });

  // 5.4 Mark all notifications as read
  const markAllRes = await request('/notifications/read-all', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Mark all notifications as read (200 OK)', () => {
    assert.strictEqual(markAllRes.status, 200);
  });

  // Verify unread count is now 0
  const unreadCountAfterAll = await request('/notifications/unread-count', {
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Unread count is 0 after mark-all-read', () => {
    assert.strictEqual(unreadCountAfterAll.data.data.unreadCount, 0);
  });

  // 5.5 Delete notification
  const deleteNotifRes = await request(`/notifications/${notifToMark.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sarahToken}` }
  });
  test('Delete notification (200 OK)', () => {
    assert.strictEqual(deleteNotifRes.status, 200);
    assert.strictEqual(deleteNotifRes.data.data.deleted, true);
  });

  // 5.6 Unauthenticated requests are rejected
  const unauthNotifs = await request('/notifications');
  test('Unauthenticated request to /notifications returns 401 Unauthorized', () => {
    assert.strictEqual(unauthNotifs.status, 401);
  });

  // Cleanup test properties
  await db.query('DELETE FROM properties WHERE id IN ($1, $2)', [propApprovalId, propRejectId]);

  console.log('\n======================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
