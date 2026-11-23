const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const catCols = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'categories' ORDER BY ordinal_position"
  );
  console.log("Categories columns:", catCols.rows);

  const cats = await pool.query("SELECT * FROM categories ORDER BY id ASC");
  console.log("Categories rows:", cats.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
