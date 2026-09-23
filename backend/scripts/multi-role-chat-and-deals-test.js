/**
 * multi-role-chat-and-deals-test.js
 * End-to-end automated test covering:
 * 1. Multi-role chat system (Customer <-> Agent, Customer <-> Admin, Agent <-> Admin, unread counts, contact picker)
 * 2. Rent vs Buy/Sell workflows:
 *    - Buy Offer for FOR_SALE property (financing, earnest deposit, contingencies -> counter -> accept -> SOLD)
 *    - Rental Application for FOR_RENT property (monthly income, lease duration, move-in, occupants -> accept -> RENTED)
 * 3. Admin CRUD actions (Edit/Delete users of any role, Edit/Delete any property, Approve/Reject)
 * 4. Agent CRUD actions (Edit and Delete own properties)
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
  console.log('========================================================================');
  console.log('  RUNNING MULTI-ROLE CHAT, DEALS (BUY/RENT), AND CRUD VERIFICATION SUITE');
  console.log('========================================================================\n');

  let adminToken, agentToken, customerToken;
  let adminUser, agentUser, customerUser;

  // 1. Authenticate users
  console.log('👉 Step 1: Authenticating Admin, Agent, and Customer...');
  const adminRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'admin@apexrealty.com', password: 'AdminSecure2026!' }
  });
  assert(adminRes.status === 200 && adminRes.data?.data?.accessToken, 'Admin successfully logged in');
  adminToken = adminRes.data.data.accessToken;
  adminUser = adminRes.data.data.user;

  const agentRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'agent.sarah@realestate.com', password: 'AgentPass123!' }
  });
  assert(agentRes.status === 200 && agentRes.data?.data?.accessToken, 'Agent successfully logged in');
  agentToken = agentRes.data.data.accessToken;
  agentUser = agentRes.data.data.user;

  const customerRes = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email: 'customer.alex@gmail.com', password: 'CustomerPass123!' }
  });
  assert(customerRes.status === 200 && customerRes.data?.data?.accessToken, 'Customer successfully logged in');
  customerToken = customerRes.data.data.accessToken;
  customerUser = customerRes.data.data.user;

  // -------------------------------------------------------------------------
  // SECTION 2: MULTI-ROLE CHAT VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n👉 Step 2: Testing Multi-Role Chat Capabilities...');

  // 2a. Fetch contacts for Customer
  const customerContacts = await apiRequest('/chat/contacts', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(customerContacts.status === 200 && Array.isArray(customerContacts.data.data), 'Customer can fetch chat contacts');
  const hasAgentInContacts = customerContacts.data.data.some(c => c.role === 'AGENT');
  const hasAdminInContacts = customerContacts.data.data.some(c => c.role === 'ADMIN');
  assert(hasAgentInContacts, 'Contacts list includes agents');
  assert(hasAdminInContacts, 'Contacts list includes admin desk');

  // 2b. Customer starts conversation with Agent
  const conv1Res = await apiRequest('/chat/conversations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      recipientId: agentUser.id,
      initialMessage: 'Hello Agent Sarah, I am very interested in scheduling a viewing!'
    }
  });
  assert((conv1Res.status === 201 || conv1Res.status === 200) && conv1Res.data?.data?.id, 'Customer started conversation with Agent');
  const conv1Id = conv1Res.data.data.id;

  // 2c. Agent retrieves messages and sends reply
  const agentMessagesRes = await apiRequest(`/chat/conversations/${conv1Id}/messages`, {
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  assert(agentMessagesRes.status === 200 && agentMessagesRes.data?.data?.length >= 1, 'Agent retrieved conversation messages');

  const agentReplyRes = await apiRequest(`/chat/conversations/${conv1Id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: { message: 'Hi Alex! I would be delighted to host a private tour for you.' }
  });
  assert(agentReplyRes.status === 201 && agentReplyRes.data?.data?.id, 'Agent replied to Customer via chat');

  // 2d. Customer starts conversation with Admin Support
  const convAdminRes = await apiRequest('/chat/conversations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      recipientId: adminUser.id,
      initialMessage: 'Hi Admin Support, how can I verify my account tier?'
    }
  });
  assert((convAdminRes.status === 201 || convAdminRes.status === 200) && convAdminRes.data?.data?.id, 'Customer started chat with Admin Support');
  const convAdminId = convAdminRes.data.data.id;

  // 2e. Admin sends reply
  const adminReplyRes = await apiRequest(`/chat/conversations/${convAdminId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { message: 'Hello Alex! All verified accounts enjoy standard prime access.' }
  });
  assert(adminReplyRes.status === 201 && adminReplyRes.data?.data?.id, 'Admin replied to Customer via chat');

  // 2f. Agent starts conversation with Admin
  const agentAdminConvRes = await apiRequest('/chat/conversations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: {
      recipientId: adminUser.id,
      initialMessage: 'Admin, please review my newest luxury penthouse submission.'
    }
  });
  assert((agentAdminConvRes.status === 201 || agentAdminConvRes.status === 200) && agentAdminConvRes.data?.data?.id, 'Agent started chat with Admin');

  // 2g. Check unread count
  const unreadRes = await apiRequest('/chat/unread-count', {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(unreadRes.status === 200 && typeof unreadRes.data?.data?.unread === 'number', 'Unread count endpoint functions correctly');

  // -------------------------------------------------------------------------
  // SECTION 3: CLARIFIED BUY/SELL WORKFLOW (FOR_SALE -> SOLD)
  // -------------------------------------------------------------------------
  console.log('\n👉 Step 3: Testing Buy/Sell Workflow (Offer -> Counter -> Accept -> Property SOLD)...');

  // 3a. Agent creates a FOR_SALE property with proper schema
  const salePropRes = await apiRequest('/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: {
      title: `Beverly Hills Modern Villa ${Date.now()}`,
      description: 'Stunning luxury villa for sale with private pool, sprawling gardens, and panoramic mountain views.',
      propertyTypeCode: 'HOUSE',
      listingTypeCode: 'FOR_SALE',
      price: 1250000,
      currency: 'USD',
      bedrooms: 4,
      bathrooms: 3,
      areaSqm: 350,
      country: 'United States',
      stateRegion: 'California',
      city: 'Beverly Hills',
      streetAddress: '742 Evergreen Terr',
      latitude: 34.0736,
      longitude: -118.4004,
      status: 'PENDING_APPROVAL'
    }
  });
  assert(salePropRes.status === 201 && salePropRes.data?.data?.id, 'Agent created FOR_SALE property');
  const salePropId = salePropRes.data.data.id;

  // 3b. Admin approves the property
  const approveSaleRes = await apiRequest(`/admin/properties/${salePropId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(approveSaleRes.status === 200, 'Admin approved FOR_SALE property');

  // 3c. Customer submits a BUY_OFFER
  const buyOfferRes = await apiRequest('/deals', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      propertyId: salePropId,
      dealType: 'BUY_OFFER',
      amount: 1200000,
      terms: {
        financingType: 'CONVENTIONAL',
        earnestDeposit: 50000,
        desiredClosingDate: '2026-11-30',
        contingencies: ['FINANCING', 'INSPECTION', 'APPRAISAL']
      },
      customerNotes: 'Pre-approved with Chase Bank. Ready for quick closing.'
    }
  });
  assert(buyOfferRes.status === 201 && buyOfferRes.data?.data?.id, 'Customer submitted Buy Offer with financing and contingencies');
  const buyDealId = buyOfferRes.data.data.id;
  assert(buyOfferRes.data.data.status === 'PENDING', 'Initial buy deal status is PENDING');

  // 3d. Agent counters the buy offer
  const counterBuyRes = await apiRequest(`/deals/${buyDealId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: {
      status: 'COUNTERED',
      counterAmount: 1225000,
      agentNotes: 'Owner is willing to accept 1,225,000 with a 30-day closing.'
    }
  });
  assert(counterBuyRes.status === 200 && counterBuyRes.data?.data?.status === 'COUNTERED', 'Agent countered buy offer');
  assert(Number(counterBuyRes.data.data.counter_amount) === 1225000, 'Counter amount correctly recorded');

  // 3e. Customer accepts the counter-offer
  const acceptBuyRes = await apiRequest(`/deals/${buyDealId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { status: 'ACCEPTED' }
  });
  assert(acceptBuyRes.status === 200 && acceptBuyRes.data?.data?.status === 'ACCEPTED', 'Customer accepted counter-offer');

  // 3f. Verify the property status has automatically transitioned to 'SOLD'
  const verifySoldPropRes = await apiRequest(`/properties/${salePropId}`);
  assert(verifySoldPropRes.status === 200, 'Fetched updated property');
  assert(verifySoldPropRes.data?.data?.status_code === 'SOLD', 'Property status automatically transitioned to SOLD on accepted buy offer');

  // -------------------------------------------------------------------------
  // SECTION 4: CLARIFIED RENT / LEASE WORKFLOW (FOR_RENT -> RENTED)
  // -------------------------------------------------------------------------
  console.log('\n👉 Step 4: Testing Rent/Lease Workflow (Application -> Accept -> Property RENTED)...');

  // 4a. Agent creates a FOR_RENT property
  const rentPropRes = await apiRequest('/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: {
      title: `Downtown Skyline Loft ${Date.now()}`,
      description: 'Modern luxury loft available for lease in the heart of downtown with soaring ceiling height.',
      propertyTypeCode: 'APARTMENT',
      listingTypeCode: 'FOR_RENT',
      price: 4500,
      currency: 'USD',
      pricePeriod: 'MONTHLY',
      bedrooms: 2,
      bathrooms: 2,
      areaSqm: 130,
      country: 'United States',
      stateRegion: 'California',
      city: 'Los Angeles',
      streetAddress: '100 Grand Ave',
      latitude: 34.0522,
      longitude: -118.2437,
      status: 'PENDING_APPROVAL'
    }
  });
  assert(rentPropRes.status === 201 && rentPropRes.data?.data?.id, 'Agent created FOR_RENT property');
  const rentPropId = rentPropRes.data.data.id;

  // 4b. Admin approves the rental listing
  const approveRentRes = await apiRequest(`/admin/properties/${rentPropId}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(approveRentRes.status === 200, 'Admin approved FOR_RENT property');

  // 4c. Customer submits a RENT_APPLICATION
  const rentAppRes = await apiRequest('/deals', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      propertyId: rentPropId,
      dealType: 'RENT_APPLICATION',
      amount: 4500,
      terms: {
        leaseDurationMonths: 12,
        desiredMoveInDate: '2026-10-15',
        occupantsCount: 2,
        monthlyIncome: 18000,
        employmentInfo: 'Senior Software Architect at TechCorp (5 yrs)',
        petsDetail: '1 hypoallergenic cat (spayed, vaccinated)',
        parkingNeeded: true
      },
      customerNotes: 'Excellent credit score 780+, references available upon request.'
    }
  });
  assert(rentAppRes.status === 201 && rentAppRes.data?.data?.id, 'Customer submitted detailed Rental Application');
  const rentDealId = rentAppRes.data.data.id;
  assert(rentAppRes.data.data.terms.leaseDurationMonths === 12, 'Lease duration recorded');
  assert(rentAppRes.data.data.terms.monthlyIncome === 18000, 'Monthly income recorded');

  // 4d. Agent approves the rental application
  const acceptRentRes = await apiRequest(`/deals/${rentDealId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: { status: 'ACCEPTED' }
  });
  assert(acceptRentRes.status === 200 && acceptRentRes.data?.data?.status === 'ACCEPTED', 'Agent approved rental application');

  // 4e. Verify property status automatically transitioned to 'RENTED'
  const verifyRentedPropRes = await apiRequest(`/properties/${rentPropId}`);
  assert(verifyRentedPropRes.status === 200, 'Fetched rental property');
  assert(verifyRentedPropRes.data?.data?.status_code === 'RENTED', 'Property status automatically transitioned to RENTED on accepted application');

  // -------------------------------------------------------------------------
  // SECTION 5: ADMIN CRUD CAPABILITIES (ALL ROLES & ALL PROPERTIES)
  // -------------------------------------------------------------------------
  console.log('\n👉 Step 5: Testing Admin CRUD Capabilities (Users & Properties)...');

  // 5a. Admin creates a user to test edit and delete
  const createTempUserRes = await apiRequest('/auth/register', {
    method: 'POST',
    body: {
      firstName: 'TestDisposable',
      lastName: 'User',
      email: `disposable_${Date.now()}@apexrealty.com`,
      password: 'TempPassword123!',
      role: 'CUSTOMER'
    }
  });
  assert(createTempUserRes.status === 201 && createTempUserRes.data?.data?.user?.id, 'Registered disposable user');
  const tempUserId = createTempUserRes.data.data.user.id;

  // 5b. Admin edits the user
  const editUserRes = await apiRequest(`/admin/users/${tempUserId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      firstName: 'UpdatedDisposable',
      lastName: 'PromotedAgent',
      role: 'AGENT',
      phone: '+1 555-987-6543',
      bio: 'Promoted to agent by admin governance.',
      licenseNumber: 'BRE-999888'
    }
  });
  assert(editUserRes.status === 200 && editUserRes.data?.data?.first_name === 'UpdatedDisposable', 'Admin successfully updated user');
  assert(editUserRes.data?.data?.role === 'AGENT', 'Admin promoted user role to AGENT');

  // 5c. Admin deletes the user
  const deleteUserRes = await apiRequest(`/admin/users/${tempUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(deleteUserRes.status === 200, 'Admin successfully deleted user');

  // 5d. Admin updates a property
  const adminEditPropRes = await apiRequest(`/admin/properties/${salePropId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: {
      title: 'Beverly Hills Ultra-Luxury Villa (Admin Updated)',
      price: 1300000,
      description: 'Updated by Platform Admin with verified prestige status.'
    }
  });
  assert(adminEditPropRes.status === 200 && adminEditPropRes.data?.data?.title?.includes('Admin Updated'), 'Admin successfully updated property');

  // 5e. Admin deletes a property
  const adminDeletePropRes = await apiRequest(`/admin/properties/${salePropId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminDeletePropRes.status === 200, 'Admin successfully deleted property');

  // Verify it is gone
  const checkDeletedPropRes = await apiRequest(`/properties/${salePropId}`);
  assert(checkDeletedPropRes.status === 404, 'Deleted property returns 404 Not Found');

  // -------------------------------------------------------------------------
  // SECTION 6: AGENT EDIT & DELETE ACTIONS ON OWN PROPERTIES
  // -------------------------------------------------------------------------
  console.log('\n👉 Step 6: Testing Agent Edit & Delete Actions...');

  // 6a. Agent creates a new property to test agent delete
  const agentPropRes = await apiRequest('/properties', {
    method: 'POST',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: {
      title: `Agent Listing to Delete ${Date.now()}`,
      description: 'Listing created specifically to verify agent delete functionality.',
      propertyTypeCode: 'APARTMENT',
      listingTypeCode: 'FOR_RENT',
      price: 2800,
      currency: 'USD',
      pricePeriod: 'MONTHLY',
      bedrooms: 1,
      bathrooms: 1,
      areaSqm: 75,
      country: 'United States',
      stateRegion: 'California',
      city: 'Santa Monica',
      streetAddress: '55 Ocean View Way',
      latitude: 34.0195,
      longitude: -118.4912,
      status: 'DRAFT'
    }
  });
  assert(agentPropRes.status === 201 && agentPropRes.data?.data?.id, 'Agent created listing');
  const agentPropId = agentPropRes.data.data.id;

  // 6b. Agent edits their own listing
  const agentEditRes = await apiRequest(`/properties/${agentPropId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${agentToken}` },
    body: {
      title: 'Agent Temporary Listing (Modified Price)',
      price: 2950
    }
  });
  assert(agentEditRes.status === 200 && Number(agentEditRes.data?.data?.price) === 2950, 'Agent successfully edited own listing');

  // 6c. Agent deletes their own listing
  const agentDeleteRes = await apiRequest(`/properties/${agentPropId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${agentToken}` }
  });
  assert(agentDeleteRes.status === 200, 'Agent successfully deleted own listing');

  // Verify it is gone
  const verifyAgentDeleted = await apiRequest(`/properties/${agentPropId}`);
  assert(verifyAgentDeleted.status === 404, 'Deleted agent listing returns 404 Not Found');

  console.log('\n========================================================================');
  console.log(`  ALL TESTS PASSED! (${passedTests}/${totalTests} assertions passed)`);
  console.log('========================================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUNNER ABORTED WITH ERROR:', err);
  process.exit(1);
});
