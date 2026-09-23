/**
 * complete-user-flow-test.js
 * End-to-end user flow verification across all 4 roles:
 * - Public Visitor Flow
 * - Customer Flow
 * - Agent Flow
 * - Administrator Flow
 */

const API_BASE = process.env.TEST_API_URL || 'http://localhost:5000/api/v1';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passed++;
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
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('====================================================');
  console.log('  RUNNING COMPLETE MULTI-ROLE USER FLOW TEST SUITE  ');
  console.log('====================================================\n');

  let customerToken, agentToken, adminToken;
  let testListingId, testAgentId, testCustomerId;

  // ----------------------------------------------------
  // FLOW 1: PUBLIC VISITOR FLOW
  // ----------------------------------------------------
  console.log('👉 Flow 1: Public Visitor Flow...');

  // 1.1 Browse catalog
  const catalogRes = await apiRequest('/properties?limit=6');
  assert(catalogRes.status === 200, 'Public visitor can browse property catalog');
  assert(Array.isArray(catalogRes.data?.data), 'Catalog returns property array');
  assert(catalogRes.data?.data?.length > 0, `Catalog contains active listings (${catalogRes.data?.data?.length})`);

  const firstListing = catalogRes.data?.data[0];
  testListingId = firstListing.id;

  // 1.2 View property details with coordinates & agent
  const detailRes = await apiRequest(`/properties/${firstListing.slug || testListingId}`);
  assert(detailRes.status === 200, `Public visitor views property "${firstListing.title}" details`);
  assert(detailRes.data?.data?.latitude !== undefined, 'Property details includes PostGIS latitude');
  assert(detailRes.data?.data?.longitude !== undefined, 'Property details includes PostGIS longitude');
  assert(!!detailRes.data?.data?.agent_id, 'Property details includes listing agent association');
  testAgentId = detailRes.data?.data?.agent_id;

  // 1.3 View agent directory
  const agentsRes = await apiRequest('/agents?limit=6');
  assert(agentsRes.status === 200, 'Public visitor browses licensed agent directory');
  assert(Array.isArray(agentsRes.data?.data), 'Agent directory returns array');

  // 1.4 View agent public profile with portfolio
  const agentProfileRes = await apiRequest(`/agents/profile/${testAgentId}`);
  assert(agentProfileRes.status === 200, `Public visitor views Agent #${testAgentId} profile`);
  assert(agentProfileRes.data?.data?.first_name !== undefined, 'Agent profile contains first_name');
  assert(Array.isArray(agentProfileRes.data?.data?.activeListings), 'Agent profile contains active property portfolio');

  // ----------------------------------------------------
  // FLOW 2: CUSTOMER USER FLOW
  // ----------------------------------------------------
  console.log('\n👉 Flow 2: Customer User Flow...');

  // 2.1 Customer Login
  const custLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'customer.alex@gmail.com', password: 'CustomerPass123!' }
  });
  assert(custLogin.status === 200, 'Customer logs in successfully');
  customerToken = custLogin.data?.data?.accessToken;
  testCustomerId = custLogin.data?.data?.user?.id;
  const custHeaders = { Authorization: `Bearer ${customerToken}` };

  // 2.2 Toggle favorite
  const favToggle = await apiRequest(`/favorites/${testListingId}`, {
    method: 'POST',
    headers: custHeaders
  });
  assert(favToggle.status === 200 || favToggle.status === 201, 'Customer toggles property bookmark');

  // 2.3 List favorites
  const favList = await apiRequest('/favorites', { headers: custHeaders });
  assert(favList.status === 200, 'Customer retrieves saved favorites list');
  assert(favList.data?.data !== undefined, 'Favorites list has data array');

  // 2.4 View customer inquiries
  const custInquiries = await apiRequest('/inquiries/my', { headers: custHeaders });
  assert(custInquiries.status === 200, 'Customer views their submitted inquiries');

  // 2.5 View customer viewing appointments
  const custAppointments = await apiRequest('/appointments/my', { headers: custHeaders });
  assert(custAppointments.status === 200, 'Customer views scheduled viewing tours');

  // 2.6 View customer notifications & unread count
  const unreadCountRes = await apiRequest('/notifications/unread-count', { headers: custHeaders });
  assert(unreadCountRes.status === 200, 'Customer checks unread notification counter');

  const notificationsRes = await apiRequest('/notifications', { headers: custHeaders });
  assert(notificationsRes.status === 200, 'Customer accesses notification center');

  // 2.7 Update customer profile
  const custUpdate = await apiRequest('/auth/me', {
    method: 'PUT',
    headers: custHeaders,
    body: {
      firstName: 'Alex',
      lastName: 'Mercer',
      phone: '+1 (512) 555-0199'
    }
  });
  assert(custUpdate.status === 200, 'Customer successfully updates personal contact profile');

  // ----------------------------------------------------
  // FLOW 3: AGENT USER FLOW
  // ----------------------------------------------------
  console.log('\n👉 Flow 3: Licensed Agent User Flow...');

  // 3.1 Agent Login
  const agentLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'agent.sarah@realestate.com', password: 'AgentPass123!' }
  });
  assert(agentLogin.status === 200, 'Agent logs in successfully');
  agentToken = agentLogin.data?.data?.accessToken;
  const agentHeaders = { Authorization: `Bearer ${agentToken}` };

  // 3.2 View agent's managed listings
  const myListings = await apiRequest('/agents/my-listings', { headers: agentHeaders });
  assert(myListings.status === 200, 'Agent views their managed property listings');

  // 3.3 Create a new listing
  const newPropRes = await apiRequest('/properties', {
    method: 'POST',
    headers: agentHeaders,
    body: {
      title: `Modern Coastal Villa Flow Test ${Date.now()}`,
      description: 'Exceptional contemporary design with custom pool and landscaped gardens.',
      propertyTypeCode: 'HOUSE',
      listingTypeCode: 'FOR_SALE',
      price: 2450000,
      currency: 'USD',
      bedrooms: 4,
      bathrooms: 3.5,
      areaSqm: 380,
      yearBuilt: 2023,
      streetAddress: '1200 Scenic Loop',
      city: 'Austin',
      stateRegion: 'Texas',
      country: 'USA',
      latitude: 30.2989,
      longitude: -97.7712,
      features: ['Pool', 'Terrace', 'Fireplace'],
      status: 'PENDING_APPROVAL'
    }
  });
  assert(newPropRes.status === 201, 'Agent successfully creates new property listing');
  const createdPropId = newPropRes.data?.data?.id;

  // 3.4 Manage inquiries for agent listings
  const agentInquiries = await apiRequest('/inquiries/agent', { headers: agentHeaders });
  assert(agentInquiries.status === 200, 'Agent retrieves inquiries related to their listings');

  // 3.5 Manage viewing appointments schedule
  const agentAppointments = await apiRequest('/appointments/agent', { headers: agentHeaders });
  assert(agentAppointments.status === 200, 'Agent retrieves scheduled viewing calendar');

  // 3.6 Update agent profile branding & bio
  const agentUpdate = await apiRequest('/auth/me', {
    method: 'PUT',
    headers: agentHeaders,
    body: {
      firstName: 'Sarah',
      lastName: 'Jenkins',
      phone: '+1 (512) 555-0144',
      agencyName: 'ApexRealty Premier Advisors',
      bio: 'Top 1% luxury broker specializing in high-end Austin waterfront estates.',
      officeAddress: '100 Congress Ave, Suite 1800, Austin, TX 78701'
    }
  });
  assert(agentUpdate.status === 200, 'Agent updates agency firm branding and advisor bio');

  // ----------------------------------------------------
  // FLOW 4: ADMINISTRATOR GOVERNANCE FLOW
  // ----------------------------------------------------
  console.log('\n👉 Flow 4: Super Administrator Governance Flow...');

  // 4.1 Admin Login
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'admin@apexrealty.com', password: 'AdminSecure2026!' }
  });
  assert(adminLogin.status === 200, 'Admin logs in successfully');
  adminToken = adminLogin.data?.data?.accessToken;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // 4.2 Dashboard Analytics (10 real metrics)
  const analyticsRes = await apiRequest('/admin/analytics', { headers: adminHeaders });
  assert(analyticsRes.status === 200, 'Admin checks real-time database analytics');
  assert(analyticsRes.data?.data?.listings?.total_properties > 0, 'Analytics has real property counts');

  // 4.3 Review Moderation Queue
  const moderationRes = await apiRequest('/admin/moderation', { headers: adminHeaders });
  assert(moderationRes.status === 200, 'Admin views property approval moderation queue');

  // 4.4 Approve Agent's Submitted Listing
  const approveRes = await apiRequest(`/admin/properties/${createdPropId}/approve`, {
    method: 'POST',
    headers: adminHeaders
  });
  assert(approveRes.status === 200, `Admin approves listing #${createdPropId} for live catalog`);

  // 4.5 Inspect All Platform Properties
  const allProps = await apiRequest('/admin/properties?status=ALL', { headers: adminHeaders });
  assert(allProps.status === 200, 'Admin accesses complete inventory across all statuses');

  // 4.6 Inspect Platform User Accounts
  const usersRes = await apiRequest('/admin/users', { headers: adminHeaders });
  assert(usersRes.status === 200, 'Admin retrieves platform user directory');

  // 4.7 Inspect Grievance & Content Reports
  const reportsRes = await apiRequest('/admin/reports', { headers: adminHeaders });
  assert(reportsRes.status === 200, 'Admin retrieves moderation grievance reports');

  console.log('\n====================================================');
  console.log(`  🎉 COMPLETE FLOW VERIFIED: ${passed} / ${total} tests passed!`);
  console.log('====================================================\n');
}

run().catch((err) => {
  console.error('\n❌ FLOW VERIFICATION FAILED:');
  console.error(err);
  process.exit(1);
});
