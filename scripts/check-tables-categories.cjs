const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("Tables:", tables.rows.map(r => r.table_name));

  const courseCols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'courses' ORDER BY ordinal_position"
  );
  console.log("Course columns:", courseCols.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
