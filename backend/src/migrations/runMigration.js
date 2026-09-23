const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function run() {
  const safeUrl = process.env.DATABASE_URL 
    ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')
    : 'Default URL';
  console.log(`🔄 Running database schema migration on: ${safeUrl}`);

  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await db.query(schemaSql);
    console.log('✅ Database schema migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

run();
