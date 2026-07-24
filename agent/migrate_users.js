require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting users table migration...');
    
    // Add columns one by one, ignoring errors if they already exist
    const queries = [
      'ALTER TABLE users ADD COLUMN full_name VARCHAR(255);',
      'ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(1000);',
      'ALTER TABLE users ADD COLUMN password_changed BOOLEAN DEFAULT FALSE;',
      'ALTER TABLE users ADD COLUMN pwd_issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;'
    ];

    for (const query of queries) {
      try {
        await client.query(query);
        console.log(`Executed: ${query}`);
      } catch (err) {
        if (err.code === '42701') {
          console.log(`Column already exists, skipping: ${query}`);
        } else {
          console.error(`Error executing ${query}:`, err.message);
        }
      }
    }

    // Set existing users' pwd_issued_at to their created_at if null
    console.log('Updating existing records...');
    await client.query(`
      UPDATE users 
      SET pwd_issued_at = created_at 
      WHERE pwd_issued_at IS NULL
    `);

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
