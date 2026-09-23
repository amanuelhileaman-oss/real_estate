const db = require('../config/db');

async function up() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Make password_hash nullable
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN password_hash DROP NOT NULL;
    `);

    // Add google_id and auth_provider
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'LOCAL';
    `);

    await client.query('COMMIT');
    console.log('✅ addGoogleAuthColumns migration applied successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error in addGoogleAuthColumns migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS google_id,
      DROP COLUMN IF EXISTS auth_provider;
    `);

    // Revert password_hash to NOT NULL
    // Note: This might fail if there are users with NULL password_hash.
    // In a real production scenario, we'd assign a default password or delete them.
    await client.query(`
      ALTER TABLE users
      ALTER COLUMN password_hash SET NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ addGoogleAuthColumns migration reverted successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error reverting addGoogleAuthColumns migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Support running directly or via migration runner
if (require.main === module) {
  up()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { up, down };
