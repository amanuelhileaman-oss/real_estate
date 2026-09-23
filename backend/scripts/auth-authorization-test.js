/**
 * Comprehensive Authentication & Role-Based Authorization Verification Suite
 * 
 * Verifies all 9 core requirements:
 * 1. Test registration
 * 2. Test login
 * 3. Test logout
 * 4. Test protected routes
 * 5. Test each role
 * 6. Test unauthorized access
 * 7. Test ownership restrictions
 * 8. Verify passwords are hashed
 * 9. Verify sensitive credentials are not exposed
 */

const config = require('../src/config/env');
const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');
const { ensureSuperAdmin } = require('../src/utils/adminInit');

const BASE_URL = `http://localhost:${config.PORT || 5000}/api/v1`;

let totalTests = 0;
let passedTests = 0;

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
  return { status: response.status, data, headers: response.headers };
}

async function runSuite() {
  console.log('================================================================');
  console.log('🛡️  RUNNING AUTHENTICATION & AUTHORIZATION VERIFICATION SUITE');
  console.log('================================================================\n');

  // Step 0: Ensure Super Admin is initialized
  await ensureSuperAdmin();

  const timestamp = Date.now();
  const testCustomerEmail = `cust.test.${timestamp}@example.com`;
  const testAgent1Email = `agent1.test.${timestamp}@example.com`;
  const testAgent2Email = `agent2.test.${timestamp}@example.com`;
  const securePassword = 'ValidPass123!';

  // ============================================================================
  // 1. TEST REGISTRATION
  // ============================================================================
  console.log('1️⃣  Testing User Registration');

  // 1.1 Valid Customer Registration
  const custRegRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: testCustomerEmail,
      password: securePassword,
      role: 'CUSTOMER',
      firstName: 'Alice',
      lastName: 'Customer',
      phone: '+15551234567'
    })
  });
  assert(custRegRes.status === 201, 'Customer registration returns 201 Created');
  assert(custRegRes.data.data.user.role === 'CUSTOMER', 'Registered user role is CUSTOMER');
  assert(custRegRes.data.data.user.password_hash === undefined, 'Customer password_hash is not exposed in registration');
  assert(custRegRes.data.data.accessToken !== undefined, 'Customer registration returns access token');
  const customerId = custRegRes.data.data.user.id;
  const customerToken = custRegRes.data.data.accessToken;
  const customerHeaders = { Authorization: `Bearer ${customerToken}` };

  // 1.2 Valid Agent 1 Registration
  const agent1RegRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: testAgent1Email,
      password: securePassword,
      role: 'AGENT',
      firstName: 'Bob',
      lastName: 'AgentOne',
      agencyName: 'Premier Realty Austin',
      licenseNumber: `TX-LIC-${timestamp}-1`,
      bio: 'Top producer in central Texas.'
    })
  });
  assert(agent1RegRes.status === 201, 'Agent 1 registration returns 201 Created');
  assert(agent1RegRes.data.data.user.role === 'AGENT', 'Registered user role is AGENT');
  const agent1Id = agent1RegRes.data.data.user.id;
  const agent1Token = agent1RegRes.data.data.accessToken;
  const agent1Headers = { Authorization: `Bearer ${agent1Token}` };

  // 1.3 Valid Agent 2 Registration (for cross-agent ownership testing)
  const agent2RegRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: testAgent2Email,
      password: securePassword,
      role: 'AGENT',
      firstName: 'Charlie',
      lastName: 'AgentTwo',
      agencyName: 'Highland Park Brokers',
      licenseNumber: `TX-LIC-${timestamp}-2`,
      bio: 'Luxury real estate specialist.'
    })
  });
  assert(agent2RegRes.status === 201, 'Agent 2 registration returns 201 Created');
  const agent2Token = agent2RegRes.data.data.accessToken;
  const agent2Headers = { Authorization: `Bearer ${agent2Token}` };

  // 1.4 Registration Validation: Weak Password (<8 chars or no number)
  const weakPassRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `weak.${timestamp}@example.com`,
      password: 'short',
      role: 'CUSTOMER',
      firstName: 'Weak',
      lastName: 'Password'
    })
  });
  assert(weakPassRes.status === 400, 'Registration rejects weak password with 400 Bad Request');

  // 1.5 Registration Validation: Disallow self-registration as ADMIN
  const adminRegRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `fakeadmin.${timestamp}@example.com`,
      password: securePassword,
      role: 'ADMIN',
      firstName: 'Fake',
      lastName: 'Admin'
    })
  });
  assert(adminRegRes.status === 400, 'Registration strictly rejects role ADMIN with 400 Bad Request');

  // 1.6 Registration Conflict: Duplicate email
  const dupEmailRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: testCustomerEmail,
      password: securePassword,
      role: 'CUSTOMER',
      firstName: 'Duplicate',
      lastName: 'User'
    })
  });
  assert(dupEmailRes.status === 409, 'Registration rejects duplicate email with 409 Conflict');

  // ============================================================================
  // 2. TEST LOGIN
  // ============================================================================
  console.log('\n2️⃣  Testing User Login');

  // 2.1 Customer Login (Valid)
  const custLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testCustomerEmail,
      password: securePassword
    })
  });
  assert(custLoginRes.status === 200, 'Customer login succeeds with 200 OK');
  assert(custLoginRes.data.data.accessToken !== undefined, 'Customer login returns accessToken');
  assert(custLoginRes.data.data.user.password_hash === undefined, 'Login omits password_hash in response');

  // 2.2 Case-Insensitive Email Login
  const caseLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testCustomerEmail.toUpperCase(),
      password: securePassword
    })
  });
  assert(caseLoginRes.status === 200, 'Login succeeds with uppercase email (case-insensitive)');

  // 2.3 Super-Admin Login (via environment credentials)
  const adminLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: config.ADMIN_EMAIL,
      password: config.ADMIN_PASSWORD
    })
  });
  assert(adminLoginRes.status === 200, 'Admin login succeeds using environment credentials');
  assert(adminLoginRes.data.data.user.role === 'ADMIN', 'Admin user has role ADMIN');
  const adminToken = adminLoginRes.data.data.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 2.4 Wrong Password
  const wrongPassRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testCustomerEmail,
      password: 'WrongPassword123!'
    })
  });
  assert(wrongPassRes.status === 401, 'Login with wrong password returns 401 Unauthorized');
  assert(wrongPassRes.data.error?.message === 'Invalid email or password.', 'Generic error message on wrong password');

  // 2.5 Non-Existent Email
  const nonExistentRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nonexistent.user.123984@example.com',
      password: securePassword
    })
  });
  assert(nonExistentRes.status === 401, 'Login with non-existent email returns 401 Unauthorized');
  assert(nonExistentRes.data.error?.message === 'Invalid email or password.', 'Generic error message prevents enumeration');

  // 2.6 Deactivated Account Login
  await db.query('UPDATE users SET is_active = FALSE WHERE id = $1', [customerId]);
  const deactLoginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testCustomerEmail,
      password: securePassword
    })
  });
  assert(deactLoginRes.status === 401 || deactLoginRes.status === 403, 'Deactivated user login rejected');
  // Reactivate customer for remaining tests
  await db.query('UPDATE users SET is_active = TRUE WHERE id = $1', [customerId]);

  // ============================================================================
  // 3. TEST LOGOUT
  // ============================================================================
  console.log('\n3️⃣  Testing Logout & Token Revocation');

  // 3.1 Fresh login to test logout
  const freshLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: testCustomerEmail, password: securePassword })
  });
  const tempToken = freshLogin.data.data.accessToken;
  const tempHeaders = { Authorization: `Bearer ${tempToken}` };

  // 3.2 Logout
  const logoutRes = await request('/auth/logout', {
    method: 'POST',
    headers: tempHeaders
  });
  assert(logoutRes.status === 200, 'Logout returns 200 OK');

  // ============================================================================
  // 4. TEST PROTECTED ROUTES & CURRENT-USER
  // ============================================================================
  console.log('\n4️⃣  Testing Protected Routes & Current-User');

  // 4.1 Missing token
  const noTokenRes = await request('/auth/me');
  assert(noTokenRes.status === 401, 'Request without token returns 401 Unauthorized');

  // 4.2 Malformed token
  const badTokenRes = await request('/auth/me', {
    headers: { Authorization: 'Bearer thisisobviouslynotajwt' }
  });
  assert(badTokenRes.status === 401, 'Request with malformed token returns 401 Unauthorized');

  // 4.3 GET /auth/me with valid Customer token
  const getMeCustomer = await request('/auth/me', { headers: customerHeaders });
  assert(getMeCustomer.status === 200, 'GET /auth/me returns 200 OK for Customer');
  assert(getMeCustomer.data.data.email === testCustomerEmail.toLowerCase(), 'GET /auth/me matches customer email');
  assert(getMeCustomer.data.data.password_hash === undefined, 'GET /auth/me omits password_hash');

  // 4.4 GET /auth/me with valid Agent token
  const getMeAgent = await request('/auth/me', { headers: agent1Headers });
  assert(getMeAgent.status === 200, 'GET /auth/me returns 200 OK for Agent');
  assert(getMeAgent.data.data.agency_name === 'Premier Realty Austin', 'Agent profile data attached to /auth/me');

  // 4.5 Update Profile: PUT /auth/me
  const updateMeRes = await request('/auth/me', {
    method: 'PUT',
    headers: customerHeaders,
    body: JSON.stringify({
      firstName: 'AliceUpdated'
    })
  });
  assert(updateMeRes.status === 200, 'PUT /auth/me updates customer profile');
  assert(updateMeRes.data.data.first_name === 'AliceUpdated', 'Updated first name confirmed');

  // ============================================================================
  // 5. TEST EACH ROLE'S PERMITTED ACTIONS
  // ============================================================================
  console.log('\n5️⃣  Testing Permitted Actions for Each Role');

  // 5.1 Admin Role: Platform Analytics
  const adminAnalytics = await request('/admin/analytics', { headers: adminHeaders });
  assert(adminAnalytics.status === 200, 'Admin can access platform analytics');
  assert(adminAnalytics.data.data.listings !== undefined, 'Analytics includes listing counts');

  // 5.2 Admin Role: Moderation Queue
  const adminModQueue = await request('/admin/moderation', { headers: adminHeaders });
  assert(adminModQueue.status === 200, 'Admin can access moderation queue');

  // 5.3 Admin Role: User Management
  const adminUsers = await request('/admin/users', { headers: adminHeaders });
  assert(adminUsers.status === 200, 'Admin can access user management list');

  // 5.4 Admin Role: Agents Management & Verification
  const adminAgents = await request('/admin/agents', { headers: adminHeaders });
  assert(adminAgents.status === 200, 'Admin can access agents directory in admin portal');
  const verifyAgentRes = await request(`/admin/agents/${agent1Id}/verify`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ isVerified: true })
  });
  assert(verifyAgentRes.status === 200, 'Admin can verify agent accreditation');

  // 5.5 Agent Role: Create Property Listing
  const createPropRes = await request('/properties', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify({
      title: `Modern Downtown Loft ${timestamp}`,
      description: 'A luxurious loft in downtown with skyline views.',
      price: 650000,
      currency: 'USD',
      propertyTypeCode: 'APARTMENT',
      listingTypeCode: 'FOR_SALE',
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 110,
      country: 'USA',
      stateRegion: 'Texas',
      city: 'Austin',
      streetAddress: '400 Congress Ave',
      latitude: 30.2672,
      longitude: -97.7431,
      features: ['smart_home', 'balcony']
    })
  });
  assert(createPropRes.status === 201, 'Agent can create a property listing (201 Created)');
  const prop1Id = createPropRes.data.data.id;
  assert(createPropRes.data.data.status_code === 'PENDING_APPROVAL', 'New listing status is PENDING_APPROVAL');

  // 5.6 Admin Role: Approve Listing
  const approvePropRes = await request(`/admin/properties/${prop1Id}/approve`, {
    method: 'PATCH',
    headers: adminHeaders
  });
  assert(approvePropRes.status === 200, 'Admin can approve pending listing');
  assert(approvePropRes.data.data.status_code === 'ACTIVE', 'Approved listing status is ACTIVE');

  // 5.7 Customer Role: Browse Properties
  const browseRes = await request('/properties?page=1&limit=5');
  assert(browseRes.status === 200, 'Customer can browse active properties');

  // 5.8 Customer Role: Save Favorite
  const favRes = await request(`/favorites/${prop1Id}`, {
    method: 'POST',
    headers: customerHeaders
  });
  assert(favRes.status === 200, 'Customer can favorite a property');

  // 5.9 Customer Role: Send Inquiry
  const inqRes = await request('/inquiries', {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      propertyId: prop1Id,
      name: 'Alice Customer',
      email: testCustomerEmail,
      phone: '+15551234567',
      message: 'Hello, is this downtown loft still available for private viewings?'
    })
  });
  assert(inqRes.status === 201, 'Customer can send an inquiry (201 Created)');
  const inqId = inqRes.data.data.id;

  // 5.10 Customer Role: View My Inquiries
  const myInqRes = await request('/inquiries/my', { headers: customerHeaders });
  assert(myInqRes.status === 200, 'Customer can view their own inquiries');
  assert(myInqRes.data.data.some(i => i.id === inqId), 'Customer inquiry appears in their inquiry list');

  // 5.11 Agent Role: View Inquiries for their property
  const agentInqRes = await request('/inquiries/agent', { headers: agent1Headers });
  assert(agentInqRes.status === 200, 'Agent can view inquiries for their listings');
  assert(agentInqRes.data.data.some(i => i.id === inqId), 'Agent receives the inquiry');

  // 5.12 Agent Role: Update Inquiry Status
  const updateInqRes = await request(`/inquiries/${inqId}/status`, {
    method: 'PATCH',
    headers: agent1Headers,
    body: JSON.stringify({ status: 'CONTACTED' })
  });
  assert(updateInqRes.status === 200, 'Agent can update status of inquiry on their listing');

  // 5.13 Customer Role: Request Viewing Appointment
  const apptRes = await request('/appointments', {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      propertyId: prop1Id,
      requestedDate: '2026-10-15',
      timeSlot: '14:00 - 15:00',
      notes: 'Please confirm if parking is available on site.'
    })
  });
  assert(apptRes.status === 201, 'Customer can request viewing appointment (201 Created)');
  const apptId = apptRes.data.data.id;

  // 5.14 Agent Role: View and Confirm Appointment
  const agentApptRes = await request('/appointments/agent', { headers: agent1Headers });
  assert(agentApptRes.status === 200, 'Agent can view their appointment schedule');
  const confirmApptRes = await request(`/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: agent1Headers,
    body: JSON.stringify({ status: 'CONFIRMED' })
  });
  assert(confirmApptRes.status === 200, 'Agent can confirm viewing appointment');

  // 5.15 Customer Role: Submit Listing Report & Admin Moderation
  const reportRes = await request('/reports', {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      propertyId: prop1Id,
      reportType: 'INACCURATE_INFORMATION',
      reason: 'The square meters listed might be slightly different from tax records.'
    })
  });
  assert(reportRes.status === 201, 'Customer can submit a listing report');
  const reportId = reportRes.data.data.id;

  const adminReportsRes = await request('/admin/reports', { headers: adminHeaders });
  assert(adminReportsRes.status === 200, 'Admin can view platform reports list');
  const updateReportRes = await request(`/admin/reports/${reportId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ status: 'INVESTIGATING', adminNotes: 'Contacting agent for clarification.' })
  });
  assert(updateReportRes.status === 200, 'Admin can update report status and add notes');

  // ============================================================================
  // 6. TEST UNAUTHORIZED ACCESS (ROLE RESTRICTIONS)
  // ============================================================================
  console.log('\n6️⃣  Testing Unauthorized Access Across Roles');

  // 6.1 Customer accessing Admin routes -> 403 Forbidden
  const custAdmin1 = await request('/admin/analytics', { headers: customerHeaders });
  assert(custAdmin1.status === 403, 'Customer accessing /admin/analytics returns 403 Forbidden');
  const custAdmin2 = await request('/admin/users', { headers: customerHeaders });
  assert(custAdmin2.status === 403, 'Customer accessing /admin/users returns 403 Forbidden');
  const custAdmin3 = await request('/admin/moderation', { headers: customerHeaders });
  assert(custAdmin3.status === 403, 'Customer accessing /admin/moderation returns 403 Forbidden');

  // 6.2 Agent accessing Admin routes -> 403 Forbidden
  const agentAdmin1 = await request('/admin/analytics', { headers: agent1Headers });
  assert(agentAdmin1.status === 403, 'Agent accessing /admin/analytics returns 403 Forbidden');
  const agentAdmin2 = await request('/admin/reports', { headers: agent1Headers });
  assert(agentAdmin2.status === 403, 'Agent accessing /admin/reports returns 403 Forbidden');

  // 6.3 Customer creating Property Listing -> 403 Forbidden
  const custCreateProp = await request('/properties', {
    method: 'POST',
    headers: customerHeaders,
    body: JSON.stringify({
      title: 'Unauthorized Customer Listing',
      description: 'Customer trying to bypass agent requirement',
      price: 500000,
      propertyTypeCode: 'HOUSE',
      listingTypeCode: 'FOR_SALE',
      areaSqm: 100,
      country: 'USA',
      stateRegion: 'Texas',
      city: 'Austin',
      streetAddress: '123 Fake St',
      latitude: 30.2,
      longitude: -97.7
    })
  });
  assert(custCreateProp.status === 403, 'Customer attempting to create property listing returns 403 Forbidden');

  // 6.4 Customer accessing Agent schedule -> 403 Forbidden
  const custAgentAppts = await request('/appointments/agent', { headers: customerHeaders });
  assert(custAgentAppts.status === 403, 'Customer accessing /appointments/agent returns 403 Forbidden');

  // 6.5 Customer accessing Agent inquiries -> 403 Forbidden
  const custAgentInqs = await request('/inquiries/agent', { headers: customerHeaders });
  assert(custAgentInqs.status === 403, 'Customer accessing /inquiries/agent returns 403 Forbidden');

  // 6.6 Agent attempting to book appointment as Customer -> 403 Forbidden
  const agentBookAppt = await request('/appointments', {
    method: 'POST',
    headers: agent1Headers,
    body: JSON.stringify({
      propertyId: prop1Id,
      requestedDate: '2026-10-20',
      timeSlot: '10:00 - 11:00'
    })
  });
  assert(agentBookAppt.status === 403, 'Agent attempting to book viewing appointment returns 403 Forbidden');

  // ============================================================================
  // 7. TEST OWNERSHIP RESTRICTIONS (AGENT & CUSTOMER ISOLATION)
  // ============================================================================
  console.log('\n7️⃣  Testing Ownership Restrictions');

  // 7.1 Agent 2 attempts to edit Agent 1's property -> 403 Forbidden
  const agent2EditProp1 = await request(`/properties/${prop1Id}`, {
    method: 'PUT',
    headers: agent2Headers,
    body: JSON.stringify({
      title: 'Hijacked by Agent 2'
    })
  });
  assert(agent2EditProp1.status === 403, 'Agent 2 editing Agent 1 property returns 403 Forbidden');

  // 7.2 Agent 2 attempts to delete Agent 1's property -> 403 Forbidden
  const agent2DeleteProp1 = await request(`/properties/${prop1Id}`, {
    method: 'DELETE',
    headers: agent2Headers
  });
  assert(agent2DeleteProp1.status === 403, 'Agent 2 deleting Agent 1 property returns 403 Forbidden');

  // 7.3 Agent 2 attempts to change status of Agent 1's property -> 403 Forbidden
  const agent2StatusProp1 = await request(`/properties/${prop1Id}/status`, {
    method: 'PATCH',
    headers: agent2Headers,
    body: JSON.stringify({ status: 'ARCHIVED' })
  });
  assert(agent2StatusProp1.status === 403, 'Agent 2 updating status of Agent 1 property returns 403 Forbidden');

  // 7.4 Agent 1 attempts to approve their own property directly to ACTIVE -> 403 Forbidden
  const agent1SelfApprove = await request(`/properties/${prop1Id}/status`, {
    method: 'PATCH',
    headers: agent1Headers,
    body: JSON.stringify({ status: 'ACTIVE' })
  });
  assert(agent1SelfApprove.status === 403, 'Agent attempting to self-approve listing to ACTIVE returns 403 Forbidden');

  // 7.5 Agent 2 attempts to update Agent 1's inquiry -> 403 Forbidden
  const agent2UpdateInq = await request(`/inquiries/${inqId}/status`, {
    method: 'PATCH',
    headers: agent2Headers,
    body: JSON.stringify({ status: 'CLOSED' })
  });
  assert(agent2UpdateInq.status === 403, 'Agent 2 updating Agent 1 inquiry returns 403 Forbidden');

  // 7.6 Agent 2 attempts to confirm/update Agent 1's appointment -> 403 Forbidden
  const agent2UpdateAppt = await request(`/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: agent2Headers,
    body: JSON.stringify({ status: 'CANCELLED' })
  });
  assert(agent2UpdateAppt.status === 403, 'Agent 2 modifying Agent 1 appointment returns 403 Forbidden');

  // 7.7 Customer 2 attempts to cancel Customer 1's appointment -> 403 Forbidden
  // Create second customer
  const cust2RegRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `cust2.${timestamp}@example.com`,
      password: securePassword,
      role: 'CUSTOMER',
      firstName: 'CustomerTwo',
      lastName: 'User'
    })
  });
  const cust2Headers = { Authorization: `Bearer ${cust2RegRes.data.data.accessToken}` };

  const cust2CancelAppt = await request(`/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: cust2Headers,
    body: JSON.stringify({ status: 'CANCELLED', cancellationReason: 'Malicious attempt' })
  });
  assert(cust2CancelAppt.status === 403, 'Customer 2 cancelling Customer 1 appointment returns 403 Forbidden');

  // 7.8 Customer 1 cancelling their own appointment -> 200 OK
  const cust1CancelAppt = await request(`/appointments/${apptId}/status`, {
    method: 'PATCH',
    headers: customerHeaders,
    body: JSON.stringify({ status: 'CANCELLED', cancellationReason: 'Schedule conflict' })
  });
  assert(cust1CancelAppt.status === 200, 'Customer 1 can cancel their own appointment (200 OK)');

  // ============================================================================
  // 8. VERIFY PASSWORDS ARE HASHED
  // ============================================================================
  console.log('\n8️⃣  Verifying Passwords are Stored Securely as Bcrypt Hashes');

  const usersDbRes = await db.query(
    'SELECT email, password_hash, role FROM users WHERE email IN ($1, $2, $3, $4)',
    [config.ADMIN_EMAIL, testCustomerEmail.toLowerCase(), testAgent1Email.toLowerCase(), testAgent2Email.toLowerCase()]
  );
  assert(usersDbRes.rows.length >= 4, `Found ${usersDbRes.rows.length} test users in database`);

  for (const row of usersDbRes.rows) {
    const isBcrypt = row.password_hash.startsWith('$2a$') || row.password_hash.startsWith('$2b$');
    assert(isBcrypt, `User ${row.email} password is valid bcrypt hash: ${row.password_hash.substring(0, 10)}...`);
    assert(row.password_hash !== securePassword, `User ${row.email} password is NOT stored in plain-text`);
  }

  // ============================================================================
  // 9. VERIFY SENSITIVE CREDENTIALS ARE NOT EXPOSED
  // ============================================================================
  console.log('\n9️⃣  Verifying Sensitive Credentials are Not Exposed in Source / Frontend');

  // 9.1 Check frontend constants
  const constantsFile = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/utils/constants.js'), 'utf8');
  assert(!constantsFile.includes('aman_1221'), 'Frontend constants.js does NOT contain admin password');
  assert(!constantsFile.includes('aman12@gmail.com'), 'Frontend constants.js does NOT contain admin email');

  // 9.2 Check LoginPage
  const loginPageFile = fs.readFileSync(path.resolve(__dirname, '../../frontend/src/pages/LoginPage.jsx'), 'utf8');
  assert(!loginPageFile.includes('aman_1221'), 'Frontend LoginPage.jsx does NOT contain admin password');
  assert(!loginPageFile.includes("handleSelectRole('ADMIN')"), 'Frontend LoginPage does NOT have an Admin autofill button');

  // 9.3 Check backend .env.example
  const envExample = fs.readFileSync(path.resolve(__dirname, '../.env.example'), 'utf8');
  assert(!envExample.includes('aman_1221'), 'backend/.env.example does NOT contain actual production passwords');

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
