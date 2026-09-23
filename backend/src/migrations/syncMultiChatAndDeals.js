const db = require('../config/db');

async function syncMultiChatAndDeals() {
  console.log('--- SYNCING MULTI-CHAT & DEALS TABLES ---');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Chat Conversations
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
        title VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Chat Participants
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_participants (
        conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (conversation_id, user_id)
      );
    `);

    // 3. Chat Messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Indexes for high-speed chat retrieval
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
    `);

    // 4. Property Deals (Buy Offers & Rental Applications)
    await client.query(`
      CREATE TABLE IF NOT EXISTS property_deals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deal_type VARCHAR(30) NOT NULL CHECK (deal_type IN ('BUY_OFFER', 'RENT_APPLICATION')),
        amount NUMERIC(14,2) NOT NULL,
        status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'ACCEPTED', 'COUNTERED', 'REJECTED', 'CANCELLED')) DEFAULT 'PENDING',
        counter_amount NUMERIC(14,2),
        terms JSONB NOT NULL DEFAULT '{}'::jsonb,
        agent_notes TEXT,
        customer_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Indexes for deals
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_property_deals_prop ON property_deals(property_id);
      CREATE INDEX IF NOT EXISTS idx_property_deals_customer ON property_deals(customer_id);
      CREATE INDEX IF NOT EXISTS idx_property_deals_agent ON property_deals(agent_id);
      CREATE INDEX IF NOT EXISTS idx_property_deals_type_status ON property_deals(deal_type, status);
    `);

    await client.query('COMMIT');
    console.log('Multi-chat and Deals database tables successfully created and indexed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error migrating multi-chat & deals schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  syncMultiChatAndDeals()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = syncMultiChatAndDeals;
