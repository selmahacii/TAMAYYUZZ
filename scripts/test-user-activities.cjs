const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const p = await pool.query('SELECT DISTINCT user_id FROM purchases;');
  const e = await pool.query('SELECT DISTINCT user_id FROM enrollments;');
  const t = await pool.query('SELECT DISTINCT user_id FROM tickets;');
  console.log('Users with purchases:', p.rows.map(r => r.user_id));
  console.log('Users with enrollments:', e.rows.map(r => r.user_id));
  console.log('Users with tickets:', t.rows.map(r => r.user_id));
  await pool.end();
}
run().catch(console.error);
