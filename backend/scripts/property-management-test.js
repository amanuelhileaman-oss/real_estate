/**
 * Comprehensive Property-Management System Automated Test Suite
 * Tests:
 * 1. Property Creation (Agent creates real listing with all fields, coordinates, amenities)
 * 2. Field Validation (required fields, price, numbers, coordinates, types)
 * 3. Ownership & Authorization (Customer restricted, Agent isolation, Admin full access)
 * 4. Relational Database Integrity (property_amenities junction table, PostGIS location point)
 * 5. Property Editing (updates, amenity sync)
 * 6. Property Status Workflow (Draft -> Submit -> Pending -> Reject with feedback -> Re-submit -> Approve -> Live)
 * 7. Property Deletion (Ownership enforced, real deletion with cascading cleanup)
 */

const assert = require('assert');
const db = require('../src/config/db');

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let data = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    ok: res.ok,
    data
  };
}

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('🏢 STARTING PROPERTY-MANAGEMENT SYSTEM TEST SUITE');
  console.log('===============================================================\n');

  // Authenticate users
  console.log('1. Setting up Test Credentials...');
  const [adminLogin, agent1Login, agent2Login, customerLogin] = await Promise.all([
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@apexrealty.com', password: 'AdminSecure2026!' })
    }),
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'agent.sarah@realestate.com', password: 'AgentPass123!' })
    }),
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'agent.david@realestate.com', password: 'AgentPass123!' })
    }),
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'customer.alex@gmail.com', password: 'CustomerPass123!' })
    })
  ]);

  assert(adminLogin.status === 200, 'Admin login failed');
  assert(agent1Login.status === 200, 'Agent 1 login failed');
  assert(agent2Login.status === 200, 'Agent 2 login failed');
  assert(customerLogin.status === 200, 'Customer login failed');

  const adminHeaders = { Authorization: `Bearer ${adminLogin.data.data.accessToken}` };
  const agent1Headers = { Authorization: `Bearer ${agent1Login.data.data.accessToken}` };
  const agent2Headers = { Authorization: `Bearer ${agent2Login.data.data.accessToken}` };
  const customerHeaders = { Authorization: `Bearer ${customerLogin.data.data.accessToken}` };

  console.log('  ✅ Admin, Agents, and Customer authenticated successfully.\n');

  // -------------------------------------------------------------
  // Test 1: Property Creation
  // -------------------------------------------------------------
  console.log('2. Testing Property Creation...');
  const validListingPayload = {
    title: `Luxury Horizon Penthouse ${Date.now()}`,
    description: 'An exquisite high-rise penthouse featuring floor-to-ceiling panoramic glass walls, private elevator access, and designer finishes.',
    propertyTypeCode: 'APARTMENT',
    listingTypeCode: 'FOR_SALE',
    price: 1850000.00,
    currency: 'USD',
    bedrooms: 3,
    bathrooms: 3.5,
    areaSqm: 245.5,
    lotSizeSqm: 300.0,
    yearBuilt: 2023,
    parkingSpaces: 2,
    furnishedStatus: 'FURNISHED',
    amenities: ['swimming_pool', 'smart_home', 'concierge', 'balcony'],
    country: 'United States',
    stateRegion: 'Texas',
    city: 'Austin',
    subcityDistrict: 'Downtown',
    streetAddress: '300 Colorado St, Unit 3801',
    postalCode: '78701',
    latitude: 30.2672,
    longitude: -97.7431,
    status: 'DRAFT'
  };

  const createRes = await request('/properties', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify(validListingPayload)
  });

  let createdPropertyId = null;

  test('Agent can create real property listing with all fields and amenities', () => {
    assert(createRes.status === 201, `Expected 201, got ${createRes.status}: ${JSON.stringify(createRes.data)}`);
    assert(createRes.data.success === true, 'Response success is true');
    assert(createRes.data.data.id, 'Created property has UUID id');
    assert(createRes.data.data.title === validListingPayload.title, 'Title matches');
    assert(parseFloat(createRes.data.data.price) === 1850000.00, 'Price matches');
    assert(createRes.data.data.status_code === 'DRAFT', 'Status is DRAFT');
    assert(Array.isArray(createRes.data.data.amenities), 'Amenities returned as array');
    assert(createRes.data.data.amenities.length === 4, `Expected 4 amenities, got ${createRes.data.data.amenities.length}`);
    createdPropertyId = createRes.data.data.id;
  });

  // -------------------------------------------------------------
  // Test 2: Validation
  // -------------------------------------------------------------
  console.log('\n3. Testing Field & Coordinate Validation...');

  // 2.1 Missing required title
  const missingTitleRes = await request('/properties', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify({ ...validListingPayload, title: undefined })
  });
  test('Reject creation when required title is missing (400)', () => {
    assert(missingTitleRes.status === 400, `Expected 400, got ${missingTitleRes.status}`);
  });

  // 2.2 Invalid price (negative or 0)
  const invalidPriceRes = await request('/properties', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify({ ...validListingPayload, price: -500 })
  });
  test('Reject creation when price is <= 0 (400)', () => {
    assert(invalidPriceRes.status === 400, `Expected 400, got ${invalidPriceRes.status}`);
  });

  // 2.3 Invalid coordinates (latitude > 90)
  const invalidLatRes = await request('/properties', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify({ ...validListingPayload, latitude: 120 })
  });
  test('Reject creation when latitude is > 90 (400)', () => {
    assert(invalidLatRes.status === 400, `Expected 400, got ${invalidLatRes.status}`);
  });

  // 2.4 Invalid coordinates (longitude < -180)
  const invalidLngRes = await request('/properties', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify({ ...validListingPayload, longitude: -200 })
  });
  test('Reject creation when longitude is < -180 (400)', () => {
    assert(invalidLngRes.status === 400, `Expected 400, got ${invalidLngRes.status}`);
  });

  // 2.5 Invalid listing type
  const invalidListingTypeRes = await request('/properties', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify({ ...validListingPayload, listingTypeCode: 'LEASE_TO_OWN' })
  });
  test('Reject creation with invalid listingTypeCode (400)', () => {
    assert(invalidListingTypeRes.status === 400, `Expected 400, got ${invalidListingTypeRes.status}`);
  });

  // 2.6 Invalid property type
  const invalidPropTypeRes = await request('/properties', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify({ ...validListingPayload, propertyTypeCode: 'TREEHOUSE' })
  });
  test('Reject creation with non-existent propertyTypeCode', () => {
    assert(invalidPropTypeRes.status >= 400, `Expected >= 400, got ${invalidPropTypeRes.status}`);
  });

  // -------------------------------------------------------------
  // Test 3: Ownership & Role Authorization
  // -------------------------------------------------------------
  console.log('\n4. Testing Ownership & Role-Based Authorization...');

  // 3.1 Customer cannot create property
  const customerCreateRes = await request('/properties', {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify(validListingPayload)
  });
  test('Customer cannot create property listing (403)', () => {
    assert(customerCreateRes.status === 403, `Expected 403, got ${customerCreateRes.status}`);
  });

  // 3.2 Customer cannot update property
  const customerUpdateRes = await request(`/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: customerHeaders,
    body: JSON.stringify({ price: 1700000 })
  });
  test('Customer cannot modify property listing (403)', () => {
    assert(customerUpdateRes.status === 403, `Expected 403, got ${customerUpdateRes.status}`);
  });

  // 3.3 Customer cannot delete property
  const customerDeleteRes = await request(`/properties/${createdPropertyId}`, {
    method: 'DELETE',
    headers: customerHeaders
  });
  test('Customer cannot delete property listing (403)', () => {
    assert(customerDeleteRes.status === 403, `Expected 403, got ${customerDeleteRes.status}`);
  });

  // 3.4 Agent 2 cannot edit Agent 1's property
  const agent2EditRes = await request(`/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: agent2Headers,
    body: JSON.stringify({ price: 1600000 })
  });
  test('Agent 2 cannot edit Agent 1 property listing (403)', () => {
    assert(agent2EditRes.status === 403, `Expected 403, got ${agent2EditRes.status}`);
  });

  // 3.5 Agent 2 cannot submit Agent 1's property
  const agent2SubmitRes = await request(`/properties/${createdPropertyId}/submit`, {
    method: 'POST',
    headers: agent2Headers
  });
  test('Agent 2 cannot submit Agent 1 property for approval (403)', () => {
    assert(agent2SubmitRes.status === 403, `Expected 403, got ${agent2SubmitRes.status}`);
  });

  // 3.6 Agent 2 cannot delete Agent 1's property
  const agent2DeleteRes = await request(`/properties/${createdPropertyId}`, {
    method: 'DELETE',
    headers: agent2Headers
  });
  test('Agent 2 cannot delete Agent 1 property listing (403)', () => {
    assert(agent2DeleteRes.status === 403, `Expected 403, got ${agent2DeleteRes.status}`);
  });

  // 3.7 Agent 1 cannot self-approve listing to ACTIVE
  const agent1SelfApproveRes = await request(`/properties/${createdPropertyId}/status`, {
    method: 'PATCH',
    headers: agent1Headers,
    body: JSON.stringify({ status: 'ACTIVE' })
  });
  test('Agent cannot self-approve listing to ACTIVE (403)', () => {
    assert(agent1SelfApproveRes.status === 403, `Expected 403, got ${agent1SelfApproveRes.status}`);
  });

  // -------------------------------------------------------------
  // Test 4: Relational Database Integrity & PostGIS
  // -------------------------------------------------------------
  console.log('\n5. Testing Relational Database Integrity & PostGIS...');

  // 4.1 Check property_amenities junction table
  const dbAmenityCheck = await db.query(
    `SELECT pa.property_id, a.code, a.name 
     FROM property_amenities pa 
     JOIN amenities a ON pa.amenity_id = a.id 
     WHERE pa.property_id = $1`,
    [createdPropertyId]
  );
  test('Relational property_amenities junction entries exist in PostgreSQL', () => {
    assert(dbAmenityCheck.rows.length === 4, `Expected 4 junction rows, found ${dbAmenityCheck.rows.length}`);
    const codes = dbAmenityCheck.rows.map(r => r.code);
    assert(codes.includes('swimming_pool'), 'Includes swimming_pool');
    assert(codes.includes('smart_home'), 'Includes smart_home');
    assert(codes.includes('concierge'), 'Includes concierge');
    assert(codes.includes('balcony'), 'Includes balcony');
  });

  // 4.2 Check PostGIS location point computation
  const dbGeomCheck = await db.query(
    `SELECT ST_AsText(location) as location_wkt, 
            ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 500) as within_500m
     FROM properties WHERE id = $3`,
    [-97.7431, 30.2672, createdPropertyId]
  );
  test('PostGIS location point correctly computed and spatial query matches coordinates', () => {
    assert(dbGeomCheck.rows.length === 1, 'Property found in DB');
    assert(dbGeomCheck.rows[0].location_wkt.startsWith('POINT(-97.7431 30.2672)'), `Location point WKT is ${dbGeomCheck.rows[0].location_wkt}`);
    assert(dbGeomCheck.rows[0].within_500m === true, 'ST_DWithin within 500m matches');
  });

  // -------------------------------------------------------------
  // Test 5: Property Editing
  // -------------------------------------------------------------
  console.log('\n6. Testing Property Editing & Relational Update...');
  const editPayload = {
    title: `Updated Horizon Penthouse ${Date.now()}`,
    price: 1950000.00,
    parkingSpaces: 3,
    amenities: ['swimming_pool', 'smart_home', 'wine_cellar', 'gym', 'solar_panels']
  };

  const updateRes = await request(`/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: agent1Headers,
    body: JSON.stringify(editPayload)
  });

  test('Owning agent can update property and sync relational amenities', () => {
    assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);
    assert(updateRes.data.data.title === editPayload.title, 'Updated title matches');
    assert(parseFloat(updateRes.data.data.price) === 1950000.00, 'Updated price matches');
    assert(updateRes.data.data.parking_spaces === 3, 'Updated parking matches');
    assert(updateRes.data.data.amenities.length === 5, `Expected 5 amenities, got ${updateRes.data.data.amenities.length}`);
  });

  // -------------------------------------------------------------
  // Test 6: Property Workflow
  // -------------------------------------------------------------
  console.log('\n7. Testing Property Status Workflow...');

  // 6.1 Draft property is NOT publicly visible
  const publicListDraft = await request(`/properties?query=${encodeURIComponent(editPayload.title)}`);
  test('Draft property is NOT publicly visible in property catalog', () => {
    assert(publicListDraft.status === 200, 'Search succeeds');
    assert(publicListDraft.data.data.length === 0, 'Draft listing not found in public catalog');
  });

  // 6.2 Agent submits property for approval
  const submitRes = await request(`/properties/${createdPropertyId}/submit`, {
    method: 'POST',
    headers: agent1Headers
  });
  test('Agent can submit listing for approval (Status -> PENDING)', () => {
    assert(submitRes.status === 200, `Expected 200, got ${submitRes.status}`);
    assert(submitRes.data.data.status_code === 'PENDING', `Status is ${submitRes.data.data.status_code}`);
  });

  // 6.3 Admin views moderation queue
  const queueRes = await request('/admin/moderation', {
    headers: adminHeaders
  });
  test('Admin moderation queue includes submitted property', () => {
    assert(queueRes.status === 200, 'Queue retrieved');
    const item = queueRes.data.data.find(p => p.id === createdPropertyId);
    assert(item, 'Submitted property found in admin moderation queue');
  });

  // 6.4 Admin rejects listing with feedback
  const rejectRes = await request(`/admin/properties/${createdPropertyId}/reject`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ reason: 'Please provide high-resolution architectural floor plans and confirm HOA fee details.' })
  });
  test('Admin can reject listing with feedback (Status -> REJECTED)', () => {
    assert(rejectRes.status === 200, `Expected 200, got ${rejectRes.status}`);
    assert(rejectRes.data.data.status_code === 'REJECTED', `Status is ${rejectRes.data.data.status_code}`);
    assert(rejectRes.data.data.rejection_reason.includes('floor plans'), 'Rejection reason stored');
  });

  // 6.5 Agent inspects listing and reviews rejection feedback
  const agentReadRes = await request(`/properties/${createdPropertyId}`, {
    headers: agent1Headers
  });
  test('Agent can review rejection reason on their listing', () => {
    assert(agentReadRes.status === 200, 'Details retrieved');
    assert(agentReadRes.data.data.status_code === 'REJECTED', 'Status is REJECTED');
    assert(agentReadRes.data.data.rejection_reason.includes('HOA fee'), 'Rejection feedback is visible to agent');
  });

  // 6.6 Agent makes corrections and re-submits for approval
  await request(`/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: agent1Headers,
    body: JSON.stringify({ description: 'Includes full certified architectural floor plans and HOA docs.' })
  });
  const resubmitRes = await request(`/properties/${createdPropertyId}/submit`, {
    method: 'POST',
    headers: agent1Headers
  });
  test('Agent can re-submit corrected listing (Status -> PENDING, reason cleared)', () => {
    assert(resubmitRes.status === 200, 'Re-submit succeeded');
    assert(resubmitRes.data.data.status_code === 'PENDING', 'Status is PENDING');
    assert(!resubmitRes.data.data.rejection_reason, 'Rejection reason is cleared upon re-submission');
  });

  // 6.7 Admin approves listing
  const approveRes = await request(`/admin/properties/${createdPropertyId}/approve`, {
    method: 'POST',
    headers: adminHeaders
  });
  test('Admin approves listing (Status -> ACTIVE/APPROVED, published_at set)', () => {
    assert(approveRes.status === 200, `Expected 200, got ${approveRes.status}`);
    assert(['ACTIVE', 'APPROVED', 'AVAILABLE'].includes(approveRes.data.data.status_code), `Status is ${approveRes.data.data.status_code}`);
    assert(approveRes.data.data.published_at, 'published_at timestamp is populated');
  });

  // 6.8 Approved property is now PUBLICLY visible
  const publicListApproved = await request(`/properties?query=${encodeURIComponent(editPayload.title)}`);
  test('Approved listing is publicly visible in catalog and search', () => {
    assert(publicListApproved.status === 200, 'Search succeeds');
    assert(publicListApproved.data.data.length >= 1, 'Approved property found in public catalog');
    assert(publicListApproved.data.data[0].id === createdPropertyId, 'Found property ID matches');
  });

  // 6.9 Status lifecycle: mark as SOLD or RENTED or UNAVAILABLE
  const soldRes = await request(`/properties/${createdPropertyId}/status`, {
    method: 'PATCH',
    headers: agent1Headers,
    body: JSON.stringify({ status: 'SOLD' })
  });
  test('Owning agent can mark listing as SOLD', () => {
    assert(soldRes.status === 200, 'Status updated to SOLD');
    assert(soldRes.data.data.status_code === 'SOLD', 'status_code is SOLD');
  });

  // -------------------------------------------------------------
  // Test 7: Property Deletion
  // -------------------------------------------------------------
  console.log('\n8. Testing Property Deletion & Cascading Cleanup...');

  const deleteRes = await request(`/properties/${createdPropertyId}`, {
    method: 'DELETE',
    headers: agent1Headers
  });
  test('Owning agent can delete listing (200)', () => {
    assert(deleteRes.status === 200, `Expected 200, got ${deleteRes.status}`);
  });

  // 7.1 Verify property is gone
  const getDeletedRes = await request(`/properties/${createdPropertyId}`);
  test('Deleted property returns 404 Not Found', () => {
    assert(getDeletedRes.status === 404, `Expected 404, got ${getDeletedRes.status}`);
  });

  // 7.2 Verify cascading cleanup in PostgreSQL
  const dbAmenityCheckAfterDelete = await db.query(
    'SELECT * FROM property_amenities WHERE property_id = $1',
    [createdPropertyId]
  );
  test('Cascading cleanup verified: zero orphan rows in property_amenities', () => {
    assert(dbAmenityCheckAfterDelete.rows.length === 0, 'Junction table rows cleanly cascaded');
  });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`PROPERTY SYSTEM TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
