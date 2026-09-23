const { Pool } = require('pg');
const config = require('./env');

const isCloudOrSsl = 
  config.DATABASE_URL.includes('sslmode=') || 
  config.DATABASE_URL.includes('supabase') || 
  config.DATABASE_URL.includes('neon.tech') ||
  config.DATABASE_URL.includes('render.com') ||
  config.DATABASE_URL.includes('pooler.supabase.com');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  ...(isCloudOrSsl && { ssl: { rejectUnauthorized: false } })
});

pool.on('error', (err) => {
  // Prevent unhandled idle connection errors from crashing the Node process
  console.warn('PostgreSQL idle client connection notice (non-fatal):', err.message);
});

async function query(text, params, maxRetries = 2) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      attempt++;
      const isRetryable = 
        err.code === 'ETIMEDOUT' ||
        err.code === 'ECONNRESET' ||
        err.code === 'ECONNREFUSED' ||
        err.code === 'EAI_AGAIN' ||
        err.code === 'ENOTFOUND' ||
        err.code === '57P01' ||
        err.message?.includes('ETIMEDOUT') ||
        err.message?.includes('Connection terminated') ||
        err.message?.includes('getaddrinfo') ||
        err.message?.includes('timeout');

      if (isRetryable && attempt < maxRetries) {
        console.warn(`[DB RETRY] Query failed with ${err.message}. Retrying attempt ${attempt}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 800 * attempt));
        continue;
      }
      throw err;
    }
  }
}

module.exports = {
  pool,
  query,
  getClient: () => pool.connect(),
  end: () => pool.end()
};
