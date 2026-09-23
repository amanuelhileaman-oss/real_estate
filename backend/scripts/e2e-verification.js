/**
 * Comprehensive End-to-End Verification Test Script
 * Verifies all 3 user roles, PostGIS spatial queries, property CRUD, inquiries, and admin moderation.
 */

const config = require('../src/config/env');
const BASE_URL = `http://localhost:${config.PORT || 5000}/api/v1`;


async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}

async function run() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE E2E VERIFICATION TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Health & PostGIS Test
  console.log('1️⃣  System Health & PostGIS Check');
  const healthRes = await request('/health');
  assert(healthRes.status === 200, 'Health endpoint responds with 200 OK');
  assert(healthRes.data.data.database === 'Connected', 'PostgreSQL database connected');
  assert(healthRes.data.data.postgis.includes('3.6'), `PostGIS 3.6 loaded: ${healthRes.data.data.postgis}`);

  // 2. Public Catalog & PostGIS Radius Search
  console.log('\n2️⃣  Public Catalog & Spatial Radius Search');
  const catalogRes = await request('/properties?page=1&limit=6');
  assert(catalogRes.status === 200, 'Public catalog returns 200 OK');
  const propList = catalogRes.data.data;
  assert(Array.isArray(propList) && propList.length > 0, `Properties found: ${propList.length}`);
  const sampleProp = propList.find(p => p.agent_first_name === 'Sarah') || propList[0];
  console.log(`     Sample Property: "${sampleProp.title}" - $${sampleProp.price} (Agent: ${sampleProp.agent_first_name} ${sampleProp.agent_last_name})`);



  // Spatial search centered on Austin (30.2672, -97.7431) with 25km radius
  const geoRes = await request('/properties/geo/radius?lat=30.2672&lng=-97.7431&radius=25');
  assert(geoRes.status === 200, 'PostGIS radius search returns 200 OK');
  const geoList = geoRes.data.data;
  assert(Array.isArray(geoList) && geoList.length > 0, `Found ${geoList.length} properties within 25km radius in Austin`);
  assert(geoList[0].distance_km !== undefined, `Distance computed by PostGIS: ${geoList[0].distance_km} km`);

  // Single property detail
  const detailRes = await request(`/properties/${sampleProp.id}`);
  assert(detailRes.status === 200, 'Property detail endpoint returns 200 OK');
  assert(detailRes.data.data.agent_first_name !== undefined, 'Agent details attached to property');
  assert(Array.isArray(detailRes.data.data.media), 'Property media array loaded');

  // Agent Directory
  const agentsRes = await request('/agents');
  assert(agentsRes.status === 200, 'Agent directory returns 200 OK');
  assert(agentsRes.data.data.length >= 2, `Agents loaded: ${agentsRes.data.data.length}`);

  // 3. Customer Role Workflow
  console.log('\n3️⃣  Customer Role Workflow (Alex Mercer)');
  const customerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'customer.alex@gmail.com',
      password: 'CustomerPass123!'
    })
  });
  assert(customerLogin.status === 200, 'Customer login succeeded');
  const customerToken = customerLogin.data.data.accessToken;
  const customerHeaders = { Authorization: `Bearer ${customerToken}` };

  // Add sample property to favorites
  const favAddRes = await request(`/favorites/${sampleProp.id}`, {
    method: 'POST',
    headers: customerHeaders
  });
  assert(favAddRes.status === 200 || favAddRes.status === 201, `Customer favorite toggled: ${favAddRes.data?.message || 'Success'}`);

  // Send Inquiry
  const inquiryRes = await request('/inquiries', {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      propertyId: sampleProp.id,
      agentId: sampleProp.agent_id,
      name: 'Alex Mercer',
      email: 'customer.alex@gmail.com',
      phone: '+1 512-555-0211',
      message: 'Hello, is this property available for an immediate closing?'
    })
  });
  assert(inquiryRes.status === 201, 'Customer inquiry successfully created');

  // Request Viewing Appointment
  const appointmentRes = await request('/appointments', {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      propertyId: sampleProp.id,
      requestedDate: '2026-10-15',
      timeSlot: '14:00 - 15:00',
      notes: 'Please let me know if weekend slots open up.'
    })
  });
  assert(appointmentRes.status === 201, 'Viewing appointment booked successfully');
  const appointmentId = appointmentRes.data.data.id;

  // View Customer Appointments
  const myApptsRes = await request('/appointments/my', {
    headers: customerHeaders
  });
  assert(myApptsRes.status === 200, 'Customer retrieved their viewing schedule');
  assert(myApptsRes.data.data.length > 0, `Customer has ${myApptsRes.data.data.length} appointments`);

  // 4. Agent Role Workflow
  console.log('\n4️⃣  Agent Role Workflow (Sarah Jenkins)');
  const agentLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'agent.sarah@realestate.com',
      password: 'AgentPass123!'
    })
  });
  assert(agentLogin.status === 200, 'Agent login succeeded');
  const agentToken = agentLogin.data.data.accessToken;
  const agentHeaders = { Authorization: `Bearer ${agentToken}` };

  // Agent's existing listings
  const myListingsRes = await request('/agents/my-listings', {
    headers: agentHeaders
  });
  assert(myListingsRes.status === 200, 'Agent loaded their listings');
  console.log(`     Agent has ${myListingsRes.data.data.length} active listings`);

  // Agent creates a new property listing with PostGIS coordinates
  const newPropRes = await request('/properties', {
    method: 'POST',
    headers: agentHeaders,
    body: JSON.stringify({
      title: 'Luxury Heights Penthouse Suite',
      description: 'Stunning panoramic views of downtown Austin with floor-to-ceiling smart glass, private elevator, and wraparound terrace.',
      price: 2450000,
      propertyTypeCode: 'CONDO',
      listingTypeCode: 'FOR_SALE',
      bedrooms: 4,
      bathrooms: 4,
      areaSqm: 380,
      lotSizeSqm: 380,
      yearBuilt: 2024,
      streetAddress: '360 Nueces St, Unit 3201',
      city: 'Austin',
      stateRegion: 'Texas',
      country: 'USA',
      postalCode: '78701',
      latitude: 30.2685,
      longitude: -97.7472,
      features: ['swimming_pool', 'smart_home', 'balcony', 'concierge'],
      status: 'PENDING_APPROVAL'
    })
  });
  assert(newPropRes.status === 201, 'Agent created new property listing');
  const newPropId = newPropRes.data.data.id;
  assert(newPropRes.data.data.status_code === 'PENDING_APPROVAL', 'New property starts in PENDING_APPROVAL status');
  console.log(`     Created Listing ID: ${newPropId} (Status: PENDING_APPROVAL)`);

  // Agent reviews inquiries
  const agentInquiriesRes = await request('/inquiries/agent', {
    headers: agentHeaders
  });
  assert(agentInquiriesRes.status === 200, 'Agent loaded inquiry inbox');
  const inqList = agentInquiriesRes.data.data;
  assert(Array.isArray(inqList) && inqList.length > 0, `Agent received ${inqList.length} inquiries`);

  // Agent confirms appointment
  const confirmApptRes = await request(`/appointments/${appointmentId}/status`, {
    method: 'PATCH',
    headers: agentHeaders,
    body: JSON.stringify({
      status: 'CONFIRMED'
    })
  });
  assert(confirmApptRes.status === 200, 'Agent confirmed viewing appointment status');
  assert(confirmApptRes.data.data.status === 'CONFIRMED', 'Appointment updated to CONFIRMED');

  // 5. Admin Role Workflow
  console.log('\n5️⃣  Admin Role Workflow (Amanuel - Super Admin)');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: config.ADMIN_EMAIL,
      password: config.ADMIN_PASSWORD
    })
  });
  assert(adminLogin.status === 200, 'Admin login succeeded');

  const adminToken = adminLogin.data.data.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // Platform Analytics
  const analyticsRes = await request('/admin/analytics', {
    headers: adminHeaders
  });
  assert(analyticsRes.status === 200, 'Admin analytics loaded');
  console.log(`     Platform Stats: ${analyticsRes.data.data.listings.total_listings} properties, ${analyticsRes.data.data.users.total_users} users, ${analyticsRes.data.data.engagement.total_inquiries} inquiries`);

  // Admin Moderation Queue
  const moderationRes = await request('/admin/moderation', {
    headers: adminHeaders
  });
  assert(moderationRes.status === 200, 'Admin loaded moderation queue');
  const pendingProps = moderationRes.data.data;
  const foundPending = pendingProps.find((p) => p.id === newPropId);
  assert(foundPending !== undefined, `Newly created property ${newPropId} appears in Admin Moderation Queue`);

  // Admin approves the listing
  const approveRes = await request(`/admin/properties/${newPropId}/approve`, {
    method: 'PATCH',
    headers: adminHeaders
  });
  assert(approveRes.status === 200, 'Admin approved property listing');
  assert(approveRes.data.data.status_code === 'ACTIVE', 'Property status changed to ACTIVE');

  // Verify approved listing now appears in Public Catalog
  const publicVerifyRes = await request(`/properties/${newPropId}`);
  assert(publicVerifyRes.status === 200, 'Approved property is now live on public catalog');
  assert(publicVerifyRes.data.data.status_code === 'ACTIVE', 'Public property status is ACTIVE');

  // Admin Users Management
  const usersRes = await request('/admin/users', {
    headers: adminHeaders
  });
  assert(usersRes.status === 200, 'Admin fetched users management list');
  const userList = usersRes.data.data;
  assert(Array.isArray(userList) && userList.length >= 5, `Total users: ${userList.length}`);

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED PERFECTLY!`);
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
