const db = require('../config/db');

async function syncPropertySystem() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Sync Property Statuses
    const statuses = [
      { code: 'DRAFT', name: 'Draft' },
      { code: 'PENDING', name: 'Pending' },
      { code: 'PENDING_APPROVAL', name: 'Pending Approval' },
      { code: 'APPROVED', name: 'Approved' },
      { code: 'AVAILABLE', name: 'Available' },
      { code: 'ACTIVE', name: 'Active' },
      { code: 'REJECTED', name: 'Rejected' },
      { code: 'SOLD', name: 'Sold' },
      { code: 'RENTED', name: 'Rented' },
      { code: 'UNAVAILABLE', name: 'Unavailable' },
      { code: 'ARCHIVED', name: 'Archived' }
    ];

    for (const st of statuses) {
      await client.query(
        `INSERT INTO property_statuses (code, name)
         VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [st.code, st.name]
      );
    }
    console.log('✅ Property statuses synchronized.');

    // 2. Seed Amenities Table
    const standardAmenities = [
      { code: 'swimming_pool', name: 'Swimming Pool', category: 'OUTDOOR', icon: 'Waves' },
      { code: 'waterfront', name: 'Waterfront / Lake Access', category: 'LOCATION', icon: 'Compass' },
      { code: 'smart_home', name: 'Smart Home Automation', category: 'TECHNOLOGY', icon: 'Cpu' },
      { code: 'garden', name: 'Private Garden / Landscaping', category: 'OUTDOOR', icon: 'Trees' },
      { code: 'home_theater', name: 'Home Cinema / Theater', category: 'ENTERTAINMENT', icon: 'Film' },
      { code: 'wine_cellar', name: 'Wine Cellar', category: 'LUXURY', icon: 'Wine' },
      { code: 'gym', name: 'Fitness Center / Gym', category: 'WELLNESS', icon: 'Dumbbell' },
      { code: 'concierge', name: '24/7 Concierge & Security', category: 'SERVICE', icon: 'Shield' },
      { code: 'balcony', name: 'Balcony / Panoramic Terrace', category: 'ARCHITECTURE', icon: 'Maximize2' },
      { code: 'ev_charging', name: 'EV Charger Station', category: 'SUSTAINABILITY', icon: 'Zap' },
      { code: 'solar_panels', name: 'Solar Energy Panels', category: 'SUSTAINABILITY', icon: 'Sun' },
      { code: 'guest_house', name: 'Detached Guest House', category: 'ARCHITECTURE', icon: 'Home' }
    ];

    for (const am of standardAmenities) {
      await client.query(
        `INSERT INTO amenities (code, name, category, icon, is_active)
         VALUES ($1, $2, $3, $4, TRUE)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           icon = EXCLUDED.icon,
           is_active = TRUE`,
        [am.code, am.name, am.category, am.icon]
      );
    }
    console.log('✅ Standard amenities seeded.');

    // 3. Link existing properties to property_amenities based on their features JSON
    const amenityMapRes = await client.query('SELECT id, code FROM amenities');
    const amenityMap = {};
    amenityMapRes.rows.forEach(row => {
      amenityMap[row.code] = row.id;
    });

    const propsRes = await client.query('SELECT id, features FROM properties');
    let linkedCount = 0;
    for (const prop of propsRes.rows) {
      let featList = [];
      if (Array.isArray(prop.features)) {
        featList = prop.features;
      } else if (typeof prop.features === 'string') {
        try { featList = JSON.parse(prop.features); } catch { featList = []; }
      }

      for (const featCode of featList) {
        const amenityId = amenityMap[featCode];
        if (amenityId) {
          await client.query(
            `INSERT INTO property_amenities (property_id, amenity_id)
             VALUES ($1, $2)
             ON CONFLICT (property_id, amenity_id) DO NOTHING`,
            [prop.id, amenityId]
          );
          linkedCount++;
        }
      }
    }
    console.log(`✅ Linked existing properties to ${linkedCount} property_amenities entries.`);

    await client.query('COMMIT');
    console.log('🚀 Property system DB sync completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Property system DB sync failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  syncPropertySystem()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = syncPropertySystem;
