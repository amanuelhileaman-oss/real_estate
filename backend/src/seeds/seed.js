const db = require('../config/db');
const bcrypt = require('bcryptjs');
const config = require('../config/env');

async function seed() {
  const client = await db.getClient();
  try {
    console.log('🌱 Starting database seeding...');
    await client.query('BEGIN');

    // 1. Seed Property Types
    const propertyTypes = [
      { code: 'HOUSE', name: 'House', description: 'Single-family standalone residential homes', icon: 'Home' },
      { code: 'APARTMENT', name: 'Apartment', description: 'Modern multi-family units and flats', icon: 'Building2' },
      { code: 'VILLA', name: 'Villa', description: 'Exclusive high-end luxury estates and retreats', icon: 'Sparkles' },
      { code: 'CONDO', name: 'Condo', description: 'Modern condominiums with shared amenities', icon: 'Layers' },
      { code: 'LAND', name: 'Land', description: 'Prime residential and development parcels', icon: 'Map' },
      { code: 'OFFICE', name: 'Office', description: 'Corporate workspaces and commercial floors', icon: 'Briefcase' },
      { code: 'SHOP', name: 'Shop', description: 'High-footfall retail storefronts and boutiques', icon: 'ShoppingBag' },
      { code: 'WAREHOUSE', name: 'Warehouse', description: 'Industrial storage, logistics and distribution centers', icon: 'Box' },
      { code: 'COMMERCIAL', name: 'Commercial', description: 'Mixed-use commercial and hospitality properties', icon: 'Building' }
    ];

    for (const pt of propertyTypes) {
      await client.query(
        `INSERT INTO property_types (code, name, description, icon) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon`,
        [pt.code, pt.name, pt.description, pt.icon]
      );
    }
    console.log('✅ Property types seeded.');

    // 2. Seed Listing Types
    const listingTypes = [
      { code: 'FOR_SALE', name: 'For Sale' },
      { code: 'FOR_RENT', name: 'For Rent' }
    ];

    for (const lt of listingTypes) {
      await client.query(
        `INSERT INTO listing_types (code, name) 
         VALUES ($1, $2) 
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [lt.code, lt.name]
      );
    }
    console.log('✅ Listing types seeded.');

    // 3. Seed Property Statuses
    const propertyStatuses = [
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

    for (const ps of propertyStatuses) {
      await client.query(
        `INSERT INTO property_statuses (code, name) 
         VALUES ($1, $2) 
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
        [ps.code, ps.name]
      );
    }
    console.log('✅ Property statuses seeded.');

    // 4. Seed Default Users
    const adminEmail = (config.ADMIN_EMAIL || 'admin@apexrealty.com').toLowerCase().trim();
    const adminPassword = config.ADMIN_PASSWORD || 'AdminSecure2026!';
    const adminFirstName = config.ADMIN_FIRST_NAME || 'Platform';
    const adminLastName = config.ADMIN_LAST_NAME || 'Admin';

    const passwordHashAdmin = await bcrypt.hash(adminPassword, 10);
    const passwordHashAgent = await bcrypt.hash('AgentPass123!', 10);
    const passwordHashCustomer = await bcrypt.hash('CustomerPass123!', 10);

    // Primary Admin user (from environment)
    const adminRes = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active)
       VALUES ($1, $2, 'ADMIN', $3, $4, $5, TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'ADMIN', is_active = TRUE
       RETURNING id`,
      [adminEmail, passwordHashAdmin, adminFirstName, adminLastName, '+1 (512) 555-0100']
    );
    const adminId = adminRes.rows[0].id;

    // Agent 1: Sarah Jenkins
    const agent1Res = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active)
       VALUES ($1, $2, 'AGENT', $3, $4, $5, TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['agent.sarah@realestate.com', passwordHashAgent, 'Sarah', 'Jenkins', '+1 (512) 555-0199']
    );
    const agent1Id = agent1Res.rows[0].id;

    await client.query(
      `INSERT INTO agent_profiles (user_id, agency_name, license_number, bio, office_address, office_phone, rating_avg, review_count, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET agency_name = EXCLUDED.agency_name`,
      [
        agent1Id,
        'Austin Premier Estates',
        'TX-RE-89104',
        'Specializing in prime residential waterfront and downtown luxury penthouses for over 12 years.',
        '100 Congress Ave, Suite 2000, Austin, TX 78701',
        '+1 (512) 555-0199',
        4.95,
        48
      ]
    );

    // Agent 2: David Vance
    const agent2Res = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active)
       VALUES ($1, $2, 'AGENT', $3, $4, $5, TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['agent.david@realestate.com', passwordHashAgent, 'David', 'Vance', '+1 (310) 555-0144']
    );
    const agent2Id = agent2Res.rows[0].id;

    await client.query(
      `INSERT INTO agent_profiles (user_id, agency_name, license_number, bio, office_address, office_phone, rating_avg, review_count, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (user_id) DO UPDATE SET agency_name = EXCLUDED.agency_name`,
      [
        agent2Id,
        'Pacific Horizon Realty',
        'CA-DRE-019842',
        'Architectural, mid-century modern, and coastal estate expert serving Southern California and West Coast buyers.',
        '9601 Wilshire Blvd, Beverly Hills, CA 90210',
        '+1 (310) 555-0144',
        4.88,
        32
      ]
    );

    // Customer 1: Alex Mercer
    const customer1Res = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active)
       VALUES ($1, $2, 'CUSTOMER', $3, $4, $5, TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['customer.alex@gmail.com', passwordHashCustomer, 'Alex', 'Mercer', '+1 (512) 555-0211']
    );
    const customer1Id = customer1Res.rows[0].id;

    // Customer 2: Emily Zhao
    const customer2Res = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone, is_active)
       VALUES ($1, $2, 'CUSTOMER', $3, $4, $5, TRUE)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['customer.emily@gmail.com', passwordHashCustomer, 'Emily', 'Zhao', '+1 (415) 555-0822']
    );
    const customer2Id = customer2Res.rows[0].id;

    console.log('✅ Users and agent profiles seeded.');

    // Helper map of lookups
    const typeRes = await client.query('SELECT id, code FROM property_types');
    const typeMap = Object.fromEntries(typeRes.rows.map(r => [r.code, r.id]));

    const listingRes = await client.query('SELECT id, code FROM listing_types');
    const listingMap = Object.fromEntries(listingRes.rows.map(r => [r.code, r.id]));

    const statusRes = await client.query('SELECT id, code FROM property_statuses');
    const statusMap = Object.fromEntries(statusRes.rows.map(r => [r.code, r.id]));

    // 5. Seed Real Properties with PostGIS Geometry Points & High-Quality Unsplash Imagery
    const sampleProperties = [
      {
        agent_id: agent1Id,
        property_type_id: typeMap['VILLA'],
        listing_type_id: listingMap['FOR_SALE'],
        status_id: statusMap['ACTIVE'],
        title: 'The Glass Pavilion Waterfront Estate',
        slug: 'the-glass-pavilion-waterfront-estate-austin',
        description: 'Commanding panoramic water views over Lake Austin, this architectural masterpiece features floor-to-ceiling glass walls, private boat slip, infinity-edge pool, and smart home automation throughout.',
        price: 3850000.00,
        currency: 'USD',
        price_period: null,
        bedrooms: 5,
        bathrooms: 6.0,
        area_sqm: 620.00,
        lot_size_sqm: 2400.00,
        year_built: 2023,
        parking_spaces: 3,
        furnished_status: 'FURNISHED',
        features: JSON.stringify(['infinity_pool', 'waterfront', 'smart_home', 'private_dock', 'wine_cellar', 'spa', 'ev_charging']),
        country: 'United States',
        state_region: 'Texas',
        city: 'Austin',
        subcity_district: 'West Lake Hills',
        street_address: '4208 Westlake Dr',
        postal_code: '78746',
        latitude: 30.3128450,
        longitude: -97.7951230,
        images: [
          'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=80'
        ]
      },
      {
        agent_id: agent1Id,
        property_type_id: typeMap['CONDO'],
        listing_type_id: listingMap['FOR_RENT'],
        status_id: statusMap['ACTIVE'],
        title: 'Skyline View Penthouse at The Independent',
        slug: 'skyline-view-penthouse-independent-austin',
        description: 'Live atop the clouds in downtown Austin. Featuring 12-foot ceilings, chef kitchen with Miele appliances, quartz waterfall islands, and 24/7 concierge with resort rooftop amenities.',
        price: 7500.00,
        currency: 'USD',
        price_period: 'MONTHLY',
        bedrooms: 3,
        bathrooms: 3.5,
        area_sqm: 215.00,
        lot_size_sqm: 0.00,
        year_built: 2021,
        parking_spaces: 2,
        furnished_status: 'SEMI_FURNISHED',
        features: JSON.stringify(['concierge', 'gym', 'pool', 'balcony', 'skyline_view', 'valet_parking']),
        country: 'United States',
        state_region: 'Texas',
        city: 'Austin',
        subcity_district: 'Downtown',
        street_address: '301 West Ave #4402',
        postal_code: '78701',
        latitude: 30.2687120,
        longitude: -97.7503410,
        images: [
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80'
        ]
      },
      {
        agent_id: agent2Id,
        property_type_id: typeMap['HOUSE'],
        listing_type_id: listingMap['FOR_SALE'],
        status_id: statusMap['ACTIVE'],
        title: 'Mid-Century Modern Beverly Hills Architectural',
        slug: 'mid-century-modern-beverly-hills-architectural',
        description: 'Immaculately restored mid-century jewel surrounded by mature palms and Japanese gardens. Includes terrazzo floors, radiant heating, private screening room, and secluded guest house.',
        price: 5200000.00,
        currency: 'USD',
        price_period: null,
        bedrooms: 4,
        bathrooms: 5.0,
        area_sqm: 480.00,
        lot_size_sqm: 1650.00,
        year_built: 2020,
        parking_spaces: 4,
        furnished_status: 'UNFURNISHED',
        features: JSON.stringify(['swimming_pool', 'garden', 'fireplace', 'security_system', 'guest_house', 'home_theater']),
        country: 'United States',
        state_region: 'California',
        city: 'Beverly Hills',
        subcity_district: 'Trousdale Estates',
        street_address: '1120 Loma Vista Dr',
        postal_code: '90210',
        latitude: 34.0921440,
        longitude: -118.3962100,
        images: [
          'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1600&q=80'
        ]
      },
      {
        agent_id: agent2Id,
        property_type_id: typeMap['APARTMENT'],
        listing_type_id: listingMap['FOR_RENT'],
        status_id: statusMap['ACTIVE'],
        title: 'Oceanfront Designer Loft at Santa Monica Promenade',
        slug: 'oceanfront-designer-loft-santa-monica',
        description: 'Breathtaking Pacific ocean sunsets right from your private terrace. Direct beach access, soaring 18ft ceilings, polished concrete, and custom Italian cabinetry.',
        price: 6200.00,
        currency: 'USD',
        price_period: 'MONTHLY',
        bedrooms: 2,
        bathrooms: 2.0,
        area_sqm: 145.00,
        lot_size_sqm: 0.00,
        year_built: 2022,
        parking_spaces: 1,
        furnished_status: 'FURNISHED',
        features: JSON.stringify(['ocean_view', 'beach_access', 'balcony', 'high_ceilings', 'hardwood_floors', 'ac']),
        country: 'United States',
        state_region: 'California',
        city: 'Santa Monica',
        subcity_district: 'Ocean Park',
        street_address: '1620 Ocean Ave #3B',
        postal_code: '90401',
        latitude: 34.0118500,
        longitude: -118.4902100,
        images: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80'
        ]
      },
      {
        agent_id: agent1Id,
        property_type_id: typeMap['OFFICE'],
        listing_type_id: listingMap['FOR_RENT'],
        status_id: statusMap['ACTIVE'],
        title: 'Tech Campus Creative Office Floor',
        slug: 'tech-campus-creative-office-floor-austin',
        description: 'Plug-and-play creative tech headquarters in the East Austin Innovation corridor. Open plan layout, 8 conference suites, dedicated server room, and private barista lounge.',
        price: 18500.00,
        currency: 'USD',
        price_period: 'MONTHLY',
        bedrooms: 0,
        bathrooms: 4.0,
        area_sqm: 850.00,
        lot_size_sqm: 0.00,
        year_built: 2021,
        parking_spaces: 25,
        furnished_status: 'FURNISHED',
        features: JSON.stringify(['fiber_internet', 'conference_rooms', 'kitchen', 'parking_garage', 'bike_storage', 'keycard_access']),
        country: 'United States',
        state_region: 'Texas',
        city: 'Austin',
        subcity_district: 'East Austin',
        street_address: '1801 E 6th St',
        postal_code: '78702',
        latitude: 30.2625100,
        longitude: -97.7214000,
        images: [
          'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80'
        ]
      },
      {
        agent_id: agent2Id,
        property_type_id: typeMap['HOUSE'],
        listing_type_id: listingMap['FOR_SALE'],
        status_id: statusMap['PENDING_APPROVAL'],
        title: 'Modern Organic Hillside Villa',
        slug: 'modern-organic-hillside-villa-los-angeles',
        description: 'New construction organic modern villa nestled in the Hollywood Hills. Features limestone cladding, zero-edge pool, cantilevered master deck, and canyon views.',
        price: 4450000.00,
        currency: 'USD',
        price_period: null,
        bedrooms: 4,
        bathrooms: 4.5,
        area_sqm: 410.00,
        lot_size_sqm: 1100.00,
        year_built: 2024,
        parking_spaces: 2,
        furnished_status: 'UNFURNISHED',
        features: JSON.stringify(['infinity_pool', 'canyon_views', 'wine_room', 'solar_panels', 'smart_home']),
        country: 'United States',
        state_region: 'California',
        city: 'Los Angeles',
        subcity_district: 'Hollywood Hills',
        street_address: '7840 Mulholland Dr',
        postal_code: '90046',
        latitude: 34.1311000,
        longitude: -118.3612000,
        images: [
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
          'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=80'
        ]
      }
    ];

    for (const p of sampleProperties) {
      const propRes = await client.query(
        `INSERT INTO properties (
          agent_id, property_type_id, listing_type_id, status_id,
          title, slug, description, price, currency, price_period,
          bedrooms, bathrooms, area_sqm, lot_size_sqm, year_built,
          parking_spaces, furnished_status, features,
          country, state_region, city, subcity_district, street_address, postal_code,
          latitude, longitude, published_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18,
          $19, $20, $21, $22, $23, $24,
          $25, $26, NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, title = EXCLUDED.title
        RETURNING id`,
        [
          p.agent_id, p.property_type_id, p.listing_type_id, p.status_id,
          p.title, p.slug, p.description, p.price, p.currency, p.price_period,
          p.bedrooms, p.bathrooms, p.area_sqm, p.lot_size_sqm, p.year_built,
          p.parking_spaces, p.furnished_status, p.features,
          p.country, p.state_region, p.city, p.subcity_district, p.street_address, p.postal_code,
          p.latitude, p.longitude
        ]
      );

      const propertyId = propRes.rows[0].id;

      // Add Media
      let sort = 0;
      for (const imgUrl of p.images) {
        await client.query(
          `INSERT INTO property_media (property_id, media_type, url, thumbnail_url, file_key, sort_order, is_primary)
           VALUES ($1, 'IMAGE', $2, $3, $4, $5, $6)`,
          [propertyId, imgUrl, imgUrl, `seed_${propertyId}_${sort}`, sort, sort === 0]
        );
        sort++;
      }

      // Add a favorite for Alex Mercer
      if (p.slug.includes('glass-pavilion')) {
        await client.query(
          `INSERT INTO favorites (user_id, property_id) 
           VALUES ($1, $2) 
           ON CONFLICT DO NOTHING`,
          [customer1Id, propertyId]
        );

        // Add sample inquiry
        await client.query(
          `INSERT INTO inquiries (property_id, customer_id, agent_id, name, email, phone, message, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'NEW')`,
          [
            propertyId,
            customer1Id,
            p.agent_id,
            'Alex Mercer',
            'customer.alex@gmail.com',
            '+1 (512) 555-0211',
            'Hello Sarah, I am pre-approved and very interested in scheduling a private tour of the Lake Austin Glass Pavilion this weekend.'
          ]
        );

        // Add sample viewing appointment
        await client.query(
          `INSERT INTO viewing_appointments (property_id, customer_id, agent_id, requested_date, time_slot, status, notes)
           VALUES ($1, $2, $3, CURRENT_DATE + INTERVAL '2 days', '14:00 - 15:00', 'CONFIRMED', 'Interested in boat dock specs')`,
          [propertyId, customer1Id, p.agent_id]
        );
      }
    }

    console.log('✅ Properties, media, favorites, inquiries, and appointments seeded.');
    await client.query('COMMIT');
    console.log('🎉 Database seeding completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err);
    throw err;
  } finally {
    client.release();
    await db.pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
