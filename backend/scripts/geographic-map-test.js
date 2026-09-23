/**
 * Complete Geographic and Interactive-Map Automated Verification Test Suite
 *
 * Requirements Tested:
 * 1. Create property with location
 * 2. Save coordinates (persisted in PostgreSQL + PostGIS geography point)
 * 3. Display marker (geo radius & bounds queries return coordinates and marker data)
 * 4. Open property details (details endpoint returns accurate coordinates and address)
 * 5. Search nearby properties (ST_DWithin radius filtering and distance-based results)
 * 6. Edit location (PUT updates coordinates and triggers PostGIS point sync)
 * 7. Verify PostGIS queries (ST_Distance, GiST index, coordinate boundary enforcement)
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
  console.log('🌍 GEOGRAPHIC & INTERACTIVE-MAP VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // Step 0: Authenticating test agent and admin
  console.log('🔐 Step 0: Authenticating test agent and admin...');
  const [loginRes, adminLoginRes] = await Promise.all([
    request('/auth/login', {
      method: 'POST',
      body: { email: 'agent.sarah@realestate.com', password: 'AgentPass123!' }
    }),
    request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@apexrealty.com', password: 'AdminSecure2026!' }
    })
  ]);

  assert.strictEqual(loginRes.status, 200, 'Agent login must succeed');
  assert.strictEqual(adminLoginRes.status, 200, 'Admin login must succeed');
  const agentToken = loginRes.data.data.accessToken || loginRes.data.data.token;
  const adminToken = adminLoginRes.data.data.accessToken || adminLoginRes.data.data.token;
  const agentHeaders = { Authorization: `Bearer ${agentToken}` };
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const testStamp = Date.now();
  let createdPropertyId = null;
  let createdPropertySlug = null;

  // -------------------------------------------------------------------------
  // 1. Create Property with Location
  // -------------------------------------------------------------------------
  console.log('\n📍 1. Testing Property Creation with Geographic Location...');
  const createPayload = {
    title: `Austin Lakeside Villa ${testStamp}`,
    description: 'Breathtaking contemporary estate overlooking Lake Austin with private boat dock and infinity pool.',
    propertyTypeCode: 'VILLA',
    listingTypeCode: 'FOR_SALE',
    price: 3250000,
    currency: 'USD',
    bedrooms: 5,
    bathrooms: 4.5,
    areaSqm: 420.5,
    country: 'United States',
    stateRegion: 'Texas',
    city: 'Austin',
    subcityDistrict: 'Westlake Hills',
    streetAddress: '4502 Westlake Ridge Dr',
    postalCode: '78746',
    latitude: 30.291500,
    longitude: -97.795200,
    status: 'PENDING_APPROVAL'
  };

  const createRes = await request('/properties', {
    method: 'POST',
    headers: agentHeaders,
    body: createPayload
  });

  test('Agent can create property with geographic coordinates', () => {
    assert.strictEqual(createRes.status, 201);
    assert(createRes.data.data.id, 'Response should contain property ID');
    createdPropertyId = createRes.data.data.id;
    createdPropertySlug = createRes.data.data.slug;
  });

  // Admin approves listing so it becomes active and publicly visible in spatial queries
  const approveRes = await request(`/properties/${createdPropertyId}/status`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: { status: 'ACTIVE' }
  });
  assert.strictEqual(approveRes.status, 200, 'Admin must be able to approve listing to ACTIVE');

  // -------------------------------------------------------------------------
  // 2. Save Coordinates & Verify PostGIS Geography Persistence
  // -------------------------------------------------------------------------
  console.log('\n💾 2. Verifying Coordinate Persistence & PostGIS Spatial Point...');
  const dbRes = await db.query(
    `SELECT id, latitude, longitude, 
            ST_AsText(location) as location_wkt, 
            ST_SRID(location::geometry) as srid,
            geometrytype(location::geometry) as geom_type
     FROM properties 
     WHERE id = $1`,
    [createdPropertyId]
  );

  test('Coordinates saved accurately in database', () => {
    assert.strictEqual(dbRes.rows.length, 1);
    const row = dbRes.rows[0];
    assert.strictEqual(parseFloat(row.latitude).toFixed(4), '30.2915');
    assert.strictEqual(parseFloat(row.longitude).toFixed(4), '-97.7952');
  });

  test('Location is stored as PostGIS GEOGRAPHY(POINT, 4326), not plain text', () => {
    const row = dbRes.rows[0];
    assert.strictEqual(row.geom_type, 'POINT');
    assert.strictEqual(row.srid, 4326);
    assert(row.location_wkt.startsWith('POINT('), `Location must be WKT point, got ${row.location_wkt}`);
    assert(row.location_wkt.includes('-97.7952') && row.location_wkt.includes('30.2915'));
  });

  // -------------------------------------------------------------------------
  // 3. Display Marker Data (Geo Radius & Viewport Queries)
  // -------------------------------------------------------------------------
  console.log('\n🗺️  3. Testing Map Marker Data Retrieval...');
  const markerRadiusRes = await request(
    `/properties/geo/radius?lat=30.2915&lng=-97.7952&radius=10`
  );

  test('Geo radius endpoint returns valid marker items', () => {
    assert.strictEqual(markerRadiusRes.status, 200);
    assert(Array.isArray(markerRadiusRes.data.data), 'Data should be an array of markers');
    const match = markerRadiusRes.data.data.find(p => p.id === createdPropertyId);
    assert(match, 'Created property must appear in geo radius markers');
    assert.strictEqual(parseFloat(match.latitude).toFixed(4), '30.2915');
    assert.strictEqual(parseFloat(match.longitude).toFixed(4), '-97.7952');
    assert.strictEqual(parseFloat(match.distance_km), 0);
  });

  const markerBoundsRes = await request(
    `/properties/geo/bounds?minLat=30.20&maxLat=30.35&minLng=-97.85&maxLng=-97.70`
  );

  test('Geo bounding box endpoint returns markers for map viewport', () => {
    assert.strictEqual(markerBoundsRes.status, 200);
    const inViewport = markerBoundsRes.data.data.find(p => p.id === createdPropertyId);
    assert(inViewport, 'Property must appear inside the spatial bounding box');
  });

  // -------------------------------------------------------------------------
  // 4. Open Property Details
  // -------------------------------------------------------------------------
  console.log('\n🔍 4. Testing Property Details Location & Map Data...');
  const detailsRes = await request(`/properties/${createdPropertyId}`);

  test('Property details returns exact location, address, and coordinates', () => {
    assert.strictEqual(detailsRes.status, 200);
    const p = detailsRes.data.data;
    assert.strictEqual(p.id, createdPropertyId);
    assert.strictEqual(parseFloat(p.latitude).toFixed(4), '30.2915');
    assert.strictEqual(parseFloat(p.longitude).toFixed(4), '-97.7952');
    assert.strictEqual(p.street_address, '4502 Westlake Ridge Dr');
    assert.strictEqual(p.city, 'Austin');
    assert.strictEqual(p.subcity_district, 'Westlake Hills');
    assert.strictEqual(p.state_region, 'Texas');
    assert.strictEqual(p.country, 'United States');
  });

  // -------------------------------------------------------------------------
  // 5. Search Nearby Properties (Proximity & Distance Results)
  // -------------------------------------------------------------------------
  console.log('\n🧭 5. Testing Proximity Search & Distance Calculations...');
  // Search from Austin Downtown (30.2672, -97.7431)
  const nearbyRes = await request(
    `/properties?lat=30.2672&lng=-97.7431&radius=15&sortBy=distance`
  );

  test('Proximity query returns distance_meters and distance_km via PostGIS ST_Distance', () => {
    assert.strictEqual(nearbyRes.status, 200);
    assert(nearbyRes.data.data.length > 0, 'Should find properties in radius');
    const first = nearbyRes.data.data[0];
    assert(first.distance_meters !== undefined, 'Result must include distance_meters');
    assert(first.distance_km !== undefined, 'Result must include distance_km');
  });

  test('Distance sorting orders properties from nearest to farthest', () => {
    const list = nearbyRes.data.data;
    for (let i = 1; i < list.length; i++) {
      const prevDist = parseFloat(list[i - 1].distance_km);
      const currDist = parseFloat(list[i].distance_km);
      assert(currDist >= prevDist, `Distance order violated: ${currDist} < ${prevDist}`);
    }
  });

  const tightRadiusRes = await request(
    `/properties?lat=30.2672&lng=-97.7431&radius=0.1` // 100 meters
  );

  test('ST_DWithin excludes properties outside the specified radius', () => {
    assert.strictEqual(tightRadiusRes.status, 200);
    const outsideMatch = tightRadiusRes.data.data.find(p => p.id === createdPropertyId);
    assert(!outsideMatch, 'Westlake Ridge Dr (5km away) must be excluded from 100m radius');
  });

  // -------------------------------------------------------------------------
  // 6. Edit Location & Verify Coordinate Updates
  // -------------------------------------------------------------------------
  console.log('\n✏️  6. Testing Property Location Editing...');
  const newLat = 30.250100;
  const newLng = -97.750500;
  const newAddress = '1400 South Congress Ave';

  const updateRes = await request(`/properties/${createdPropertyId}`, {
    method: 'PUT',
    headers: agentHeaders,
    body: {
      latitude: newLat,
      longitude: newLng,
      streetAddress: newAddress,
      subcityDistrict: 'South Congress'
    }
  });

  test('Agent can update coordinates and address', () => {
    assert.strictEqual(updateRes.status, 200);
    const updated = updateRes.data.data;
    assert.strictEqual(parseFloat(updated.latitude).toFixed(4), '30.2501');
    assert.strictEqual(parseFloat(updated.longitude).toFixed(4), '-97.7505');
    assert.strictEqual(updated.street_address, newAddress);
  });

  test('Database PostGIS trigger updates location point on coordinate edit', async () => {
    const updatedDbRes = await db.query(
      `SELECT ST_AsText(location) as location_wkt, latitude, longitude
       FROM properties WHERE id = $1`,
      [createdPropertyId]
    );
    const row = updatedDbRes.rows[0];
    assert.strictEqual(parseFloat(row.latitude).toFixed(4), '30.2501');
    assert.strictEqual(parseFloat(row.longitude).toFixed(4), '-97.7505');
    assert(row.location_wkt.includes('-97.7505') && row.location_wkt.includes('30.2501'),
      `PostGIS location must reflect updated coordinates, got ${row.location_wkt}`);
  });

  // -------------------------------------------------------------------------
  // 7. Verify PostGIS Spatial Queries & Robustness
  // -------------------------------------------------------------------------
  console.log('\n📐 7. Verifying PostGIS Spatial Indexes & Defensive Error Handling...');
  
  // 7.1 Check GiST Spatial Index
  const indexRes = await db.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'properties' AND indexname = 'idx_properties_location_gist'
  `);

  test('PostGIS GiST spatial index exists and is active on properties(location)', () => {
    assert.strictEqual(indexRes.rows.length, 1);
    assert(indexRes.rows[0].indexdef.includes('USING gist (location)'), 'Must use GIST index on location');
  });

  // 7.2 Reject Invalid Coordinates
  const invalidLatRes = await request('/properties', {
    method: 'POST',
    headers: agentHeaders,
    body: {
      ...createPayload,
      title: 'Invalid Lat Property',
      latitude: 105.0 // Latitude > 90 is physically invalid
    }
  });

  test('API rejects invalid latitude (> 90°) with 400 Bad Request', () => {
    assert.strictEqual(invalidLatRes.status, 400);
    assert(JSON.stringify(invalidLatRes.data).includes('Latitude must be between -90 and 90'));
  });

  const invalidLngRes = await request('/properties', {
    method: 'POST',
    headers: agentHeaders,
    body: {
      ...createPayload,
      title: 'Invalid Lng Property',
      longitude: -200.0 // Longitude < -180 is physically invalid
    }
  });

  test('API rejects invalid longitude (<-180°) with 400 Bad Request', () => {
    assert.strictEqual(invalidLngRes.status, 400);
    assert(JSON.stringify(invalidLngRes.data).includes('Longitude must be between -180 and 180'));
  });

  // 7.3 Direct PostGIS Mathematical Distance verification
  const distCheck = await db.query(`
    SELECT ROUND(ST_Distance(
      ST_SetSRID(ST_MakePoint(-97.7431, 30.2672), 4326)::geography,
      ST_SetSRID(ST_MakePoint(-97.7505, 30.2501), 4326)::geography
    )::numeric, 1) as distance_m
  `);

  test('PostGIS ST_Distance calculates accurate geodesic meter distance between points', () => {
    const distMeters = parseFloat(distCheck.rows[0].distance_m);
    assert(distMeters > 1900 && distMeters < 2200, `Expected ~2000m, got ${distMeters}m`);
  });

  // Clean up created test property
  await db.query('DELETE FROM properties WHERE id = $1', [createdPropertyId]);

  console.log('\n======================================================');
  console.log(`📊 GEOGRAPHIC TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
