const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const users = await pool.query('SELECT id, name, email, role FROM users ORDER BY id ASC;');
  console.log(users.rows);
  await pool.end();
}

main().catch(console.error);
