const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        area VARCHAR(50) NOT NULL,
        role VARCHAR(50) DEFAULT 'USER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        date VARCHAR(255) NOT NULL,
        participants TEXT,
        area VARCHAR(255),
        business_unit VARCHAR(255),
        client VARCHAR(255),
        objective TEXT,
        summary TEXT,
        topics JSONB,
        agreements JSONB,
        decisions JSONB,
        risks JSONB,
        custom_notes TEXT,
        raw_text TEXT,
        file_url VARCHAR(1000),
        style VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    DO $$ 
    BEGIN 
        BEGIN
            ALTER TABLE meetings ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        EXCEPTION
            WHEN duplicate_column THEN null;
        END;
        BEGIN
            ALTER TABLE meetings ADD COLUMN email_subject VARCHAR(255);
        EXCEPTION
            WHEN duplicate_column THEN null;
        END;
        BEGIN
            ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'USER';
        EXCEPTION
            WHEN duplicate_column THEN null;
        END;
        BEGIN
            ALTER TABLE meetings ADD COLUMN custom_notes TEXT;
        EXCEPTION
            WHEN duplicate_column THEN null;
        END;
        BEGIN
            ALTER TABLE meetings ADD COLUMN file_url VARCHAR(1000);
        EXCEPTION
            WHEN duplicate_column THEN null;
        END;
    END $$;

    CREATE TABLE IF NOT EXISTS action_items (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        owner VARCHAR(255),
        due_date VARCHAR(255),
        priority VARCHAR(50),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(queryText);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing DB:', err);
  }
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDB,
};
