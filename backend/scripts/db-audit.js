const { pool } = require('../src/config/db');

async function runAudit() {
  try {
    console.log('--- RUNNING DATABASE AUDIT ---');
    
    // 1. Check for orphaned agent profiles
    const orphanedAgents = await pool.query(`
      SELECT ap.id FROM agent_profiles ap 
      LEFT JOIN users u ON ap.user_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned Agent Profiles: ${orphanedAgents.rowCount}`);

    // 2. Check for orphaned properties
    const orphanedProperties = await pool.query(`
      SELECT p.id FROM properties p 
      LEFT JOIN users u ON p.agent_id = u.id 
      WHERE u.id IS NULL
    `);
    console.log(`Orphaned Properties: ${orphanedProperties.rowCount}`);

    // 3. Check for properties without geography points
    const missingGeo = await pool.query(`
      SELECT id FROM properties WHERE location IS NULL
    `);
    console.log(`Properties missing PostGIS geography: ${missingGeo.rowCount}`);

    // 4. Verify unique favorites
    const dupFavorites = await pool.query(`
      SELECT user_id, property_id, COUNT(*) 
      FROM favorites 
      GROUP BY user_id, property_id 
      HAVING COUNT(*) > 1
    `);
    console.log(`Duplicate Favorites: ${dupFavorites.rowCount}`);

    console.log('--- DB AUDIT COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
}

runAudit();
