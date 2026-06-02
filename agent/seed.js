require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./db');

async function seed() {
  await db.initDB();
  
  try {
    const password = 'Ndf010399';
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, password, area, role) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (username) DO NOTHING`,
      ['master', hashedPassword, 'IT', 'ADMIN']
    );
    console.log('Master user seeded.');
  } catch (error) {
    console.error('Error seeding master user:', error);
  }
  process.exit(0);
}

seed();
