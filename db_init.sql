CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    area VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    email_subject VARCHAR(255),
    date DATE NOT NULL,
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
    raw_text TEXT,
    style VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
