const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const existing = await pool.query('SELECT * FROM tickets;');
  console.log('Existing tickets count:', existing.rows.length);
  console.log('Existing tickets:', existing.rows);

  const users = await pool.query('SELECT id, name, email, role FROM users LIMIT 10;');
  console.log('Available users for tickets:', users.rows);

  await pool.end();
}

main().catch(console.error);
