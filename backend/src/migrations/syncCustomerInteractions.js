const db = require('../config/db');

async function syncCustomerInteractions() {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Update viewing_appointments status check constraint to include REJECTED
    console.log('🔄 Updating viewing_appointments status check constraint...');
    await client.query(`
      ALTER TABLE viewing_appointments DROP CONSTRAINT IF EXISTS viewing_appointments_status_check;
      ALTER TABLE viewing_appointments ADD CONSTRAINT viewing_appointments_status_check 
        CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'RESCHEDULED'));
    `);
    console.log('✅ viewing_appointments status constraint updated with REJECTED.');

    // 2. Ensure favorites unique constraint
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_property_favorite'
        ) THEN
          ALTER TABLE favorites ADD CONSTRAINT uq_user_property_favorite UNIQUE (user_id, property_id);
        END IF;
      END $$;
    `);
    console.log('✅ favorites unique constraint verified.');

    // 3. Ensure notifications indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
    `);
    console.log('✅ notifications indexes verified.');

    await client.query('COMMIT');
    console.log('🎉 Customer interaction database synchronization completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error syncing customer interaction database:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  syncCustomerInteractions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = syncCustomerInteractions;
