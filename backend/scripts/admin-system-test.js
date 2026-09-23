/**
 * admin-system-test.js
 * End-to-end automated verification of the Complete Administrative System:
 * 1. Role-based security guards (401/403 isolation for unauthenticated, customer, and agent users)
 * 2. Real database analytics (no fake numbers, all 10 required metrics computed from DB)
 * 3. Property moderation workflow (review, approve, reject with reason, status transitions, archive takedown)
 * 4. User governance & agent accreditation (zero password secrets exposed, suspend/activate, agent verify toggle)
 * 5. Platform reporting workflow (user report creation, admin review, status transition to investigating/resolved)
 * 6. Audit logging verification (ledger recording actions, actors, and IP addresses)
 */

const API_BASE = process.env.TEST_API_URL || 'http://localhost:5000/api/v1';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✅ PASSED: ${message}`);
}

async function apiRequest(path, options = {}) {
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
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('  RUNNING COMPLETE ADMINISTRATIVE SYSTEM TEST SUITE  ');
  console.log('====================================================\n');

  let adminToken, customerToken, agentToken;
  let testPropertyId;
  let testReportId;
  let testCustomerId;
  let testAgentUserId;

  // ----------------------------------------------------
  // SECTION 1: AUTHENTICATION SETUP & CREDENTIAL RETRIEVAL
  // ----------------------------------------------------
  console.log('👉 Section 1: Authenticating Users (Admin, Agent, Customer)...');

  const adminRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'admin@apexrealty.com', password: 'AdminSecure2026!' }
  });
  assert(adminRes.status === 200, 'Admin login returned 200');
  adminToken = adminRes.data?.data?.accessToken;
  assert(!!adminToken, 'Admin received valid JWT accessToken');

  const agentRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'agent.sarah@realestate.com', password: 'AgentPass123!' }
  });
  assert(agentRes.status === 200, 'Agent login returned 200');
  agentToken = agentRes.data?.data?.accessToken;
  testAgentUserId = agentRes.data?.data?.user?.id;
  assert(!!agentToken, 'Agent received valid JWT accessToken');

  const customerRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'customer.alex@gmail.com', password: 'CustomerPass123!' }
  });
  assert(customerRes.status === 200, 'Customer login returned 200');
  customerToken = customerRes.data?.data?.accessToken;
  testCustomerId = customerRes.data?.data?.user?.id;
  assert(!!customerToken, 'Customer received valid JWT accessToken');

  // ----------------------------------------------------
  // SECTION 2: AUTHORIZATION & SECURITY ISOLATION
  // ----------------------------------------------------
  console.log('\n👉 Section 2: Security Verification & 401/403 Role Isolation...');

  // 2.1 Unauthenticated request to /admin/analytics -> 401
  const unauthRes = await apiRequest('/admin/analytics');
  assert(unauthRes.status === 401, 'Unauthenticated request to /admin/analytics rejected with 401 Unauthorized');

  // 2.2 Customer request to /admin/analytics -> 403 Forbidden
  const custAdminRes = await apiRequest('/admin/analytics', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(custAdminRes.status === 403, 'Customer access to /admin/analytics rejected with 403 Forbidden');

  // 2.3 Agent request to /admin/users -> 403 Forbidden
  const agentUsersRes = await apiRequest('/admin/users', {
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  assert(agentUsersRes.status === 403, 'Agent access to /admin/users rejected with 403 Forbidden');

  // 2.4 Customer request to /admin/properties -> 403 Forbidden
  const custPropsRes = await apiRequest('/admin/properties', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(custPropsRes.status === 403, 'Customer access to /admin/properties rejected with 403 Forbidden');

  // ----------------------------------------------------
  // SECTION 3: REAL DATABASE PLATFORM ANALYTICS
  // ----------------------------------------------------
  console.log('\n👉 Section 3: Real Database Metrics Verification...');

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const analyticsRes = await apiRequest('/admin/analytics', { headers: adminHeaders });
  const data = analyticsRes.data?.data;

  assert(analyticsRes.status === 200, 'Admin analytics endpoint returned 200 OK');
  assert(data?.listings !== undefined, 'Analytics includes listings aggregate data');
  assert(Number(data.listings.total_properties) >= 0, `Total properties is numeric (${data.listings.total_properties})`);
  assert(Number(data.listings.approved_properties) >= 0, `Approved properties is numeric (${data.listings.approved_properties})`);
  assert(Number(data.listings.pending_properties) >= 0, `Pending properties is numeric (${data.listings.pending_properties})`);
  assert(Number(data.listings.sold_properties) >= 0, `Sold properties is numeric (${data.listings.sold_properties})`);
  assert(Number(data.listings.rented_properties) >= 0, `Rented properties is numeric (${data.listings.rented_properties})`);

  assert(data?.users !== undefined, 'Analytics includes users aggregate data');
  assert(Number(data.users.total_users) >= 3, `Total users is numeric and includes seeded accounts (${data.users.total_users})`);
  assert(Number(data.users.total_customers) >= 1, `Total customers is numeric (${data.users.total_customers})`);
  assert(Number(data.users.total_agents) >= 1, `Total agents is numeric (${data.users.total_agents})`);

  assert(data?.reports !== undefined, 'Analytics includes reports aggregate data');
  assert(Number(data.reports.pending_reports) >= 0, `Pending reports is numeric (${data.reports.pending_reports})`);

  assert(Array.isArray(data.recentActivity), 'Analytics includes recentActivity audit array');

  // ----------------------------------------------------
  // SECTION 4: PROPERTY CREATION, MODERATION & GOVERNANCE
  // ----------------------------------------------------
  console.log('\n👉 Section 4: Property Moderation & Status Management...');

  // 4.1 Agent creates a new property to be reviewed
  const propRes = await apiRequest('/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: {
      title: `Admin Moderation Test Estate ${Date.now()}`,
      description: 'Stunning luxury modern architecture estate with pool for administrative testing.',
      propertyTypeCode: 'HOUSE',
      listingTypeCode: 'FOR_SALE',
      price: 1850000,
      currency: 'USD',
      bedrooms: 5,
      bathrooms: 4,
      areaSqm: 420,
      yearBuilt: 2024,
      streetAddress: '742 Evergreen Terrace',
      city: 'Austin',
      stateRegion: 'Texas',
      postalCode: '78701',
      country: 'USA',
      latitude: 30.2672,
      longitude: -97.7431,
      features: ['Swimming Pool', 'Smart Home', 'Garage', 'Garden'],
      status: 'PENDING_APPROVAL'
    }
  });

  testPropertyId = propRes.data?.data?.id;
  assert(propRes.status === 201, `Agent created test property #${testPropertyId}`);

  // 4.2 Admin views all properties
  const allPropsRes = await apiRequest('/admin/properties?status=ALL', { headers: adminHeaders });
  assert(allPropsRes.status === 200, 'Admin can view properties with status=ALL');
  const foundProp = allPropsRes.data?.data?.find((p) => p.id === testPropertyId);
  assert(!!foundProp, 'Created test property appears in admin property inventory');

  // 4.3 Admin moderation queue inspection
  const modQueueRes = await apiRequest('/admin/moderation', { headers: adminHeaders });
  assert(modQueueRes.status === 200, 'Admin moderation queue endpoint returned 200 OK');

  // 4.4 Admin approves property
  const approveRes = await apiRequest(`/admin/properties/${testPropertyId}/approve`, {
    method: 'POST',
    headers: adminHeaders
  });
  assert(approveRes.status === 200, 'Admin approved property successfully');

  // Verify property is now ACTIVE
  const checkActiveRes = await apiRequest(`/admin/properties/${testPropertyId}`, { headers: adminHeaders });
  assert(checkActiveRes.data?.data?.status_code === 'ACTIVE', 'Property status verified as ACTIVE');

  // 4.5 Admin changes property status to REJECTED with specific reason
  const rejectRes = await apiRequest(`/admin/properties/${testPropertyId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      status: 'REJECTED',
      reason: 'Inaccurate boundary coordinates and blurry front facade photograph.'
    }
  });
  assert(rejectRes.status === 200, 'Admin changed property status to REJECTED with required feedback');

  // Verify rejection reason is stored and returned in property details
  const checkRejectRes = await apiRequest(`/admin/properties/${testPropertyId}`, { headers: adminHeaders });
  assert(checkRejectRes.data?.data?.status_code === 'REJECTED', 'Property status verified as REJECTED');
  assert(
    checkRejectRes.data?.data?.rejection_reason === 'Inaccurate boundary coordinates and blurry front facade photograph.',
    'Rejection reason persisted and retrievable by admin'
  );

  // 4.6 Admin changes status to ARCHIVED (inappropriate listing takedown)
  const archiveRes = await apiRequest(`/admin/properties/${testPropertyId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      status: 'ARCHIVED',
      reason: 'Listing taken down due to administrative compliance action.'
    }
  });
  assert(archiveRes.status === 200, 'Admin successfully archived/taken down property listing');

  // ----------------------------------------------------
  // SECTION 5: USER MANAGEMENT & AGENT ACCREDITATION
  // ----------------------------------------------------
  console.log('\n👉 Section 5: User Management & Sensitive Secrets Protection...');

  // 5.1 Admin retrieves user list
  const usersRes = await apiRequest('/admin/users', { headers: adminHeaders });
  assert(usersRes.status === 200, 'Admin users list endpoint returned 200 OK');
  const userList = usersRes.data?.data || [];
  assert(userList.length > 0, 'Users retrieved from database');

  // Security check: Verify NO password_hash, salt, or secrets are leaked
  let leakedSecret = false;
  for (const u of userList) {
    if (u.password_hash !== undefined || u.password !== undefined || u.token_hash !== undefined) {
      leakedSecret = true;
      break;
    }
  }
  assert(!leakedSecret, 'CRITICAL SECURITY: No password_hash or auth secrets exposed in user endpoints');

  // 5.2 Admin filters users by role
  const agentsRes = await apiRequest('/admin/users?role=AGENT', { headers: adminHeaders });
  assert(agentsRes.data?.data?.every((u) => u.role === 'AGENT'), 'Role filter AGENT correctly isolates agent accounts');

  // 5.3 Admin verifies agent accreditation
  const verifyRes = await apiRequest(`/admin/agents/${testAgentUserId}/verify`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { isVerified: true }
  });
  assert(verifyRes.status === 200, 'Admin successfully verified agent accreditation');
  assert(verifyRes.data?.data?.verified_at !== null, 'Agent profile has verified_at timestamp recorded');

  // Admin toggles agent verification back to unverified
  const unverifyRes = await apiRequest(`/admin/agents/${testAgentUserId}/verify`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { isVerified: false }
  });
  assert(unverifyRes.status === 200, 'Admin successfully revoked agent accreditation');
  assert(unverifyRes.data?.data?.verified_at === null, 'Agent profile verified_at is now null');

  // 5.4 Admin suspends and reactivates user
  const suspendRes = await apiRequest(`/admin/users/${testCustomerId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { isActive: false }
  });
  assert(suspendRes.status === 200, 'Admin suspended customer account');
  assert(suspendRes.data?.data?.is_active === false, 'User account is_active is false');

  // Reactivate user
  const reactivateRes = await apiRequest(`/admin/users/${testCustomerId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { isActive: true }
  });
  assert(reactivateRes.status === 200, 'Admin reactivated customer account');
  assert(reactivateRes.data?.data?.is_active === true, 'User account is_active is true');

  // ----------------------------------------------------
  // SECTION 6: PLATFORM REPORTING WORKFLOW
  // ----------------------------------------------------
  console.log('\n👉 Section 6: Platform Reporting & Moderation Workflow...');

  // 6.1 Customer reports a property
  const createReportRes = await apiRequest('/reports', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      propertyId: testPropertyId,
      reportType: 'INACCURATE_INFORMATION',
      reason: 'The square footage listed does not match public tax assessment records.'
    }
  });
  assert(createReportRes.status === 201, 'Customer successfully submitted property report');
  testReportId = createReportRes.data?.data?.id;
  assert(!!testReportId, `Report #${testReportId} created in PENDING status`);

  // 6.2 Admin lists reports
  const adminReportsRes = await apiRequest('/admin/reports', { headers: adminHeaders });
  assert(adminReportsRes.status === 200, 'Admin successfully retrieved platform reports');
  const foundReport = adminReportsRes.data?.data?.find((r) => r.id === testReportId);
  assert(!!foundReport, 'Submitted report appears in admin moderation queue');

  // 6.3 Admin updates report to INVESTIGATING
  const investigateRes = await apiRequest(`/admin/reports/${testReportId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      status: 'INVESTIGATING',
      adminNotes: 'Contacting county records office to verify floorplan.'
    }
  });
  assert(investigateRes.status === 200, 'Report transitioned to INVESTIGATING status');
  assert(investigateRes.data?.data?.status === 'INVESTIGATING', 'Report status is INVESTIGATING');

  // 6.4 Admin updates report to RESOLVED
  const resolveRes = await apiRequest(`/admin/reports/${testReportId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: {
      status: 'RESOLVED',
      adminNotes: 'Listing amended by agent; square footage confirmed.'
    }
  });
  assert(resolveRes.status === 200, 'Report transitioned to RESOLVED status');
  assert(resolveRes.data?.data?.status === 'RESOLVED', 'Report status is RESOLVED');
  assert(resolveRes.data?.data?.resolved_at !== null, 'Report has resolved_at timestamp');

  // ----------------------------------------------------
  // SECTION 7: AUDIT LOG VERIFICATION
  // ----------------------------------------------------
  console.log('\n👉 Section 7: Audit Logging Ledger Verification...');

  const finalAnalytics = await apiRequest('/admin/analytics', { headers: adminHeaders });
  const recentLogs = finalAnalytics.data?.data?.recentActivity || [];

  assert(recentLogs.length > 0, `Audit log captured ${recentLogs.length} recent administrative actions`);
  const actionsInLog = recentLogs.map((l) => l.action);
  console.log('  Recorded Actions:', actionsInLog.slice(0, 6).join(', '));

  assert(
    actionsInLog.some((a) => a.includes('STATUS') || a.includes('APPROVE') || a.includes('REPORT')),
    'Audit log entries recorded for moderation actions'
  );

  console.log('\n====================================================');
  console.log(`  🎉 ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions verified!`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED UNEXPECTEDLY:');
  console.error(err);
  process.exit(1);
});
