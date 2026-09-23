/**
 * Automated Test Suite: Production-Quality Property Discovery System
 * Validates:
 * 1. Search (Title, City, Location, Keyword, Type, Listing Type)
 * 2. Individual Filters (Price, Type, Listing Type, Beds, Baths, Area, Furnished, Amenities, Status)
 * 3. Combined Multi-Filters (Multiple filters applied simultaneously)
 * 4. All Sorting Options (newest, oldest, price_asc, price_desc, area_desc, area_asc, distance)
 * 5. Backend Pagination & Metadata (page, limit, total, totalItems, totalPages, hasNextPage, hasPrevPage)
 * 6. Empty Results Handling (returns 200 OK with empty array & zero total)
 * 7. Security & Parameter Validation (400 on negative prices, invalid sorts, out-of-range coords, SQLi defense)
 * 8. PostGIS Spatial Queries (Distance calculation, Radius filtering, Nearest-first sorting)
 * 9. PostgreSQL Index Verification
 */

const assert = require('assert');
const db = require('../src/config/db');

const BASE_URL = 'http://localhost:5000/api/v1/properties';

async function request(query = '') {
  const url = query ? `${BASE_URL}?${query}` : BASE_URL;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: res.status,
    ok: res.ok,
    data
  };
}

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

async function runDiscoveryTestSuite() {
  console.log('================================================================');
  console.log('🔍 PRODUCTION PROPERTY DISCOVERY SYSTEM TEST SUITE');
  console.log('================================================================\n');

  // Check server health first
  const initialRes = await request();
  assert(initialRes.status === 200, `API server not accessible (HTTP ${initialRes.status})`);
  assert(initialRes.data.success === true, 'Initial discovery response not successful');
  console.log(`Connected to API. Active catalog count: ${initialRes.data.meta.total} properties.\n`);

  // -------------------------------------------------------------
  // 1. SEARCH FUNCTIONALITY
  // -------------------------------------------------------------
  console.log('1️⃣  Testing Search Capabilities (Title, City, Location, Types)...');

  const titleSearch = await request('query=Villa');
  test('Search by title keyword ("Villa")', () => {
    assert.strictEqual(titleSearch.status, 200);
    assert(titleSearch.data.data.length > 0, 'Should find at least 1 villa');
    assert(titleSearch.data.data.some(p => p.title.toLowerCase().includes('villa') || p.property_type_code === 'VILLA'));
  });

  const citySearch = await request('city=Austin');
  test('Search by specific city ("Austin")', () => {
    assert.strictEqual(citySearch.status, 200);
    assert(citySearch.data.data.length > 0, 'Should find properties in Austin');
    assert(citySearch.data.data.every(p => p.city.toLowerCase().includes('austin')));
  });

  const locationSearch = await request('location=Texas');
  test('Search by general location ("Texas")', () => {
    assert.strictEqual(locationSearch.status, 200);
    assert(locationSearch.data.data.length > 0, 'Should find properties matching location Texas');
    assert(locationSearch.data.data.every(p => 
      (p.state_region && p.state_region.toLowerCase().includes('texas')) ||
      (p.city && p.city.toLowerCase().includes('texas')) ||
      (p.street_address && p.street_address.toLowerCase().includes('texas'))
    ));
  });

  const typeSearch = await request('type=HOUSE');
  test('Search by property type ("HOUSE")', () => {
    assert.strictEqual(typeSearch.status, 200);
    assert(typeSearch.data.data.length > 0, 'Should find houses');
    assert(typeSearch.data.data.every(p => p.property_type_code === 'HOUSE'));
  });

  const listingTypeSearch = await request('listingType=FOR_RENT');
  test('Search by listing type ("FOR_RENT")', () => {
    assert.strictEqual(listingTypeSearch.status, 200);
    assert(listingTypeSearch.data.data.length > 0, 'Should find rental properties');
    assert(listingTypeSearch.data.data.every(p => p.listing_type_code === 'FOR_RENT'));
  });

  // -------------------------------------------------------------
  // 2. INDIVIDUAL FILTERS
  // -------------------------------------------------------------
  console.log('\n2️⃣  Testing Individual Filters (Price, Beds, Baths, Area, Furnished, Amenities)...');

  const minPrice = 800000;
  const minPriceRes = await request(`minPrice=${minPrice}`);
  test(`Filter by minimum price (>= $${minPrice})`, () => {
    assert.strictEqual(minPriceRes.status, 200);
    assert(minPriceRes.data.data.every(p => parseFloat(p.price) >= minPrice));
  });

  const maxPrice = 600000;
  const maxPriceRes = await request(`maxPrice=${maxPrice}`);
  test(`Filter by maximum price (<= $${maxPrice})`, () => {
    assert.strictEqual(maxPriceRes.status, 200);
    assert(maxPriceRes.data.data.every(p => parseFloat(p.price) <= maxPrice));
  });

  const minBeds = 4;
  const bedsRes = await request(`minBeds=${minBeds}`);
  test(`Filter by minimum bedrooms (>= ${minBeds})`, () => {
    assert.strictEqual(bedsRes.status, 200);
    assert(bedsRes.data.data.length > 0);
    assert(bedsRes.data.data.every(p => p.bedrooms >= minBeds));
  });

  const minBaths = 3;
  const bathsRes = await request(`minBaths=${minBaths}`);
  test(`Filter by minimum bathrooms (>= ${minBaths})`, () => {
    assert.strictEqual(bathsRes.status, 200);
    assert(bathsRes.data.data.length > 0);
    assert(bathsRes.data.data.every(p => parseFloat(p.bathrooms) >= minBaths));
  });

  const minArea = 250;
  const areaMinRes = await request(`minArea=${minArea}`);
  test(`Filter by minimum area (>= ${minArea} m²)`, () => {
    assert.strictEqual(areaMinRes.status, 200);
    assert(areaMinRes.data.data.length > 0);
    assert(areaMinRes.data.data.every(p => parseFloat(p.area_sqm) >= minArea));
  });

  const maxArea = 200;
  const areaMaxRes = await request(`maxArea=${maxArea}`);
  test(`Filter by maximum area (<= ${maxArea} m²)`, () => {
    assert.strictEqual(areaMaxRes.status, 200);
    assert(areaMaxRes.data.data.length > 0);
    assert(areaMaxRes.data.data.every(p => parseFloat(p.area_sqm) <= maxArea));
  });

  const furnishedRes = await request('furnishedStatus=FURNISHED');
  test('Filter by furnished status ("FURNISHED")', () => {
    assert.strictEqual(furnishedRes.status, 200);
    assert(furnishedRes.data.data.every(p => p.furnished_status === 'FURNISHED'));
  });

  const unfurnishedRes = await request('furnishedStatus=UNFURNISHED');
  test('Filter by furnished status ("UNFURNISHED")', () => {
    assert.strictEqual(unfurnishedRes.status, 200);
    assert(unfurnishedRes.data.data.every(p => p.furnished_status === 'UNFURNISHED'));
  });

  const amenityPoolRes = await request('amenities=swimming_pool');
  test('Filter by single amenity ("swimming_pool")', () => {
    assert.strictEqual(amenityPoolRes.status, 200);
    assert(amenityPoolRes.data.data.length > 0, 'Should find properties with swimming pool');
    assert(amenityPoolRes.data.data.every(p => 
      p.amenities?.some(a => a.code === 'swimming_pool') || 
      (Array.isArray(p.features) && p.features.includes('swimming_pool'))
    ));
  });

  const multiAmenityRes = await request('amenities=swimming_pool,gym');
  test('Filter by multiple amenities simultaneously ("swimming_pool,gym")', () => {
    assert.strictEqual(multiAmenityRes.status, 200);
    assert(multiAmenityRes.data.data.every(p => {
      const hasPool = p.amenities?.some(a => a.code === 'swimming_pool') || (Array.isArray(p.features) && p.features.includes('swimming_pool'));
      const hasGym = p.amenities?.some(a => a.code === 'gym') || (Array.isArray(p.features) && p.features.includes('gym'));
      return hasPool && hasGym;
    }));
  });

  // -------------------------------------------------------------
  // 3. COMBINED MULTI-FILTERS
  // -------------------------------------------------------------
  console.log('\n3️⃣  Testing Combined Multi-Filters...');

  const combinedRes = await request('type=HOUSE&listingType=FOR_SALE&minBeds=3&minBaths=2&minPrice=400000&city=Austin');
  test('Multi-filter combination: HOUSE + FOR_SALE + 3+ Beds + 2+ Baths + $400k+ in Austin', () => {
    assert.strictEqual(combinedRes.status, 200);
    assert(combinedRes.data.data.every(p => 
      p.property_type_code === 'HOUSE' &&
      p.listing_type_code === 'FOR_SALE' &&
      p.bedrooms >= 3 &&
      parseFloat(p.bathrooms) >= 2 &&
      parseFloat(p.price) >= 400000 &&
      p.city.toLowerCase().includes('austin')
    ));
  });

  // -------------------------------------------------------------
  // 4. SORTING
  // -------------------------------------------------------------
  console.log('\n4️⃣  Testing All Sorting Modes (Newest, Oldest, Price Asc/Desc, Area Asc/Desc, Distance)...');

  const newestRes = await request('sortBy=newest&limit=10');
  test('Sort: Newest First (created_at DESC)', () => {
    assert.strictEqual(newestRes.status, 200);
    const dates = newestRes.data.data.map(p => new Date(p.created_at).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      assert(dates[i] >= dates[i + 1], `Dates should be descending: ${dates[i]} >= ${dates[i + 1]}`);
    }
  });

  const oldestRes = await request('sortBy=oldest&limit=10');
  test('Sort: Oldest First (created_at ASC)', () => {
    assert.strictEqual(oldestRes.status, 200);
    const dates = oldestRes.data.data.map(p => new Date(p.created_at).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      assert(dates[i] <= dates[i + 1], `Dates should be ascending: ${dates[i]} <= ${dates[i + 1]}`);
    }
  });

  const priceAscRes = await request('sortBy=price_asc&limit=10');
  test('Sort: Price Low to High (price ASC)', () => {
    assert.strictEqual(priceAscRes.status, 200);
    const prices = priceAscRes.data.data.map(p => parseFloat(p.price));
    for (let i = 0; i < prices.length - 1; i++) {
      assert(prices[i] <= prices[i + 1], `Prices should be ascending: ${prices[i]} <= ${prices[i + 1]}`);
    }
  });

  const priceDescRes = await request('sortBy=price_desc&limit=10');
  test('Sort: Price High to Low (price DESC)', () => {
    assert.strictEqual(priceDescRes.status, 200);
    const prices = priceDescRes.data.data.map(p => parseFloat(p.price));
    for (let i = 0; i < prices.length - 1; i++) {
      assert(prices[i] >= prices[i + 1], `Prices should be descending: ${prices[i]} >= ${prices[i + 1]}`);
    }
  });

  const areaDescRes = await request('sortBy=area_desc&limit=10');
  test('Sort: Largest Area (area_sqm DESC)', () => {
    assert.strictEqual(areaDescRes.status, 200);
    const areas = areaDescRes.data.data.map(p => parseFloat(p.area_sqm));
    for (let i = 0; i < areas.length - 1; i++) {
      assert(areas[i] >= areas[i + 1], `Areas should be descending: ${areas[i]} >= ${areas[i + 1]}`);
    }
  });

  const areaAscRes = await request('sortBy=area_asc&limit=10');
  test('Sort: Smallest Area (area_sqm ASC)', () => {
    assert.strictEqual(areaAscRes.status, 200);
    const areas = areaAscRes.data.data.map(p => parseFloat(p.area_sqm));
    for (let i = 0; i < areas.length - 1; i++) {
      assert(areas[i] <= areas[i + 1], `Areas should be ascending: ${areas[i]} <= ${areas[i + 1]}`);
    }
  });

  const distanceSortRes = await request('lat=30.2672&lng=-97.7431&sortBy=distance&limit=10');
  test('Sort: Distance Nearest First (distance_meters ASC)', () => {
    assert.strictEqual(distanceSortRes.status, 200);
    assert(distanceSortRes.data.data.length > 0);
    const distances = distanceSortRes.data.data.map(p => parseFloat(p.distance_meters));
    for (let i = 0; i < distances.length - 1; i++) {
      assert(!isNaN(distances[i]), 'Distance must be numeric');
      assert(distances[i] <= distances[i + 1], `Distances should be ascending: ${distances[i]} <= ${distances[i + 1]}`);
    }
  });

  // -------------------------------------------------------------
  // 5. BACKEND PAGINATION & METADATA
  // -------------------------------------------------------------
  console.log('\n5️⃣  Testing Backend Pagination & Metadata...');

  const page1Res = await request('page=1&limit=5');
  const page2Res = await request('page=2&limit=5');

  test('Pagination: Page 1 metadata structure', () => {
    assert.strictEqual(page1Res.status, 200);
    const meta = page1Res.data.meta;
    assert.strictEqual(meta.page, 1);
    assert.strictEqual(meta.limit, 5);
    assert(typeof meta.total === 'number');
    assert.strictEqual(meta.total, meta.totalItems);
    assert.strictEqual(meta.totalPages, Math.ceil(meta.total / 5));
    assert.strictEqual(meta.hasPrevPage, false);
    assert.strictEqual(meta.hasNextPage, meta.totalPages > 1);
  });

  test('Pagination: Page 2 returns next subset without overlap', () => {
    assert.strictEqual(page2Res.status, 200);
    const meta = page2Res.data.meta;
    assert.strictEqual(meta.page, 2);
    assert.strictEqual(meta.hasPrevPage, true);

    const page1Ids = new Set(page1Res.data.data.map(p => p.id));
    const page2Ids = new Set(page2Res.data.data.map(p => p.id));
    for (const id of page2Ids) {
      assert(!page1Ids.has(id), 'Page 1 and Page 2 should not share duplicate property IDs');
    }
  });

  // -------------------------------------------------------------
  // 6. EMPTY RESULTS HANDLING
  // -------------------------------------------------------------
  console.log('\n6️⃣  Testing Empty Results Handling...');

  const emptyRes = await request('query=xyz_nonexistent_luxury_estate_never_matches_anything_123');
  test('Empty search query returns HTTP 200 with empty array and total 0', () => {
    assert.strictEqual(emptyRes.status, 200);
    assert.strictEqual(emptyRes.data.success, true);
    assert.strictEqual(emptyRes.data.data.length, 0);
    assert.strictEqual(emptyRes.data.meta.total, 0);
    assert.strictEqual(emptyRes.data.meta.totalPages, 0);
    assert.strictEqual(emptyRes.data.meta.hasNextPage, false);
    assert.strictEqual(emptyRes.data.meta.hasPrevPage, false);
  });

  const highPriceRes = await request('minPrice=999999999');
  test('Unreachable price filter returns HTTP 200 with empty array', () => {
    assert.strictEqual(highPriceRes.status, 200);
    assert.strictEqual(highPriceRes.data.data.length, 0);
    assert.strictEqual(highPriceRes.data.meta.total, 0);
  });

  // -------------------------------------------------------------
  // 7. SECURITY & PARAMETER VALIDATION
  // -------------------------------------------------------------
  console.log('\n7️⃣  Testing Security & Parameter Validation...');

  const negPriceRes = await request('minPrice=-500');
  test('Reject negative minPrice with 400 Bad Request', () => {
    assert.strictEqual(negPriceRes.status, 400);
    assert.strictEqual(negPriceRes.data.success, false);
    assert.strictEqual(negPriceRes.data.error.code, 'VALIDATION_ERROR');
  });

  const badSortRes = await request('sortBy=drop_table_users');
  test('Reject invalid sort column with 400 Bad Request', () => {
    assert.strictEqual(badSortRes.status, 400);
    assert.strictEqual(badSortRes.data.success, false);
    assert.strictEqual(badSortRes.data.error.code, 'VALIDATION_ERROR');
  });

  const outOfBoundsLat = await request('lat=120&lng=-97.74');
  test('Reject latitude > 90 with 400 Bad Request', () => {
    assert.strictEqual(outOfBoundsLat.status, 400);
    assert.strictEqual(outOfBoundsLat.data.success, false);
    assert.strictEqual(outOfBoundsLat.data.error.code, 'VALIDATION_ERROR');
  });

  const outOfBoundsLng = await request('lat=30.26&lng=250');
  test('Reject longitude > 180 with 400 Bad Request', () => {
    assert.strictEqual(outOfBoundsLng.status, 400);
    assert.strictEqual(outOfBoundsLng.data.success, false);
    assert.strictEqual(outOfBoundsLng.data.error.code, 'VALIDATION_ERROR');
  });

  const limitExceededRes = await request('limit=500');
  test('Reject pagination limit > 100 with 400 Bad Request', () => {
    assert.strictEqual(limitExceededRes.status, 400);
    assert.strictEqual(limitExceededRes.data.success, false);
    assert.strictEqual(limitExceededRes.data.error.code, 'VALIDATION_ERROR');
  });

  const sqlInjectionAttempt = await request('query=' + encodeURIComponent("' OR '1'='1; DROP TABLE properties; --"));
  test('SQL Injection attempt in query string is neutralized safely (HTTP 200, zero syntax errors)', () => {
    assert.strictEqual(sqlInjectionAttempt.status, 200);
    assert.strictEqual(sqlInjectionAttempt.data.success, true);
  });

  // -------------------------------------------------------------
  // 8. POSTGIS GEOGRAPHIC QUERIES
  // -------------------------------------------------------------
  console.log('\n8️⃣  Testing PostGIS Geographic Queries...');

  const austinLat = 30.2672;
  const austinLng = -97.7431;

  const distanceCalcRes = await request(`lat=${austinLat}&lng=${austinLng}&limit=5`);
  test('PostGIS calculates distance_km and distance_meters from coordinates', () => {
    assert.strictEqual(distanceCalcRes.status, 200);
    assert(distanceCalcRes.data.data.length > 0);
    for (const prop of distanceCalcRes.data.data) {
      assert(prop.distance_meters !== undefined && prop.distance_meters !== null, 'Property must include distance_meters');
      assert(prop.distance_km !== undefined && prop.distance_km !== null, 'Property must include distance_km');
      assert(parseFloat(prop.distance_meters) >= 0, 'Distance meters must be non-negative');
      assert(parseFloat(prop.distance_km) >= 0, 'Distance km must be non-negative');
    }
  });

  const tightRadiusRes = await request(`lat=${austinLat}&lng=${austinLng}&radius=10`);
  test('PostGIS ST_DWithin: Radius search (10 km) strictly enforces boundary', () => {
    assert.strictEqual(tightRadiusRes.status, 200);
    for (const prop of tightRadiusRes.data.data) {
      assert(parseFloat(prop.distance_km) <= 10.05, `Distance ${prop.distance_km}km exceeds 10km radius`);
    }
  });

  const widerRadiusRes = await request(`lat=${austinLat}&lng=${austinLng}&radius=50`);
  test('PostGIS ST_DWithin: 50 km radius returns equal or more properties than 10 km', () => {
    assert.strictEqual(widerRadiusRes.status, 200);
    assert(widerRadiusRes.data.meta.total >= tightRadiusRes.data.meta.total);
  });

  // -------------------------------------------------------------
  // 9. POSTGRESQL INDEX VERIFICATION
  // -------------------------------------------------------------
  console.log('\n9️⃣  Verifying PostgreSQL Indexes in Database Schema...');

  const indexQuery = await db.query(`
    SELECT indexname 
    FROM pg_indexes 
    WHERE tablename = 'properties'
  `);
  const indexNames = new Set(indexQuery.rows.map(r => r.indexname));

  test('PostGIS GiST index exists (idx_properties_location_gist)', () => {
    assert(indexNames.has('idx_properties_location_gist'));
  });

  test('Area index exists (idx_properties_area_sqm)', () => {
    assert(indexNames.has('idx_properties_area_sqm'));
  });

  test('Bedrooms index exists (idx_properties_bedrooms)', () => {
    assert(indexNames.has('idx_properties_bedrooms'));
  });

  test('Bathrooms index exists (idx_properties_bathrooms)', () => {
    assert(indexNames.has('idx_properties_bathrooms'));
  });

  test('Furnished status index exists (idx_properties_furnished_status)', () => {
    assert(indexNames.has('idx_properties_furnished_status'));
  });

  test('Price B-Tree index exists (idx_properties_price)', () => {
    assert(indexNames.has('idx_properties_price'));
  });

  test('Title Trigram GIN index exists (idx_properties_title_trgm)', () => {
    assert(indexNames.has('idx_properties_title_trgm'));
  });

  test('Address Trigram GIN index exists (idx_properties_address_trgm)', () => {
    assert(indexNames.has('idx_properties_address_trgm'));
  });

  test('Status B-Tree index exists (idx_properties_status_id)', () => {
    assert(indexNames.has('idx_properties_status_id'));
  });

  test('Created At B-Tree index exists (idx_properties_created_at)', () => {
    assert(indexNames.has('idx_properties_created_at'));
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PROPERTY DISCOVERY TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runDiscoveryTestSuite()
  .catch(err => {
    console.error('Fatal error during test run:', err);
    process.exit(1);
  })
  .finally(() => db.pool.end());
