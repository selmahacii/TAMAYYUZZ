const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  await pool.query(
    "UPDATE courses SET image_url = $1 WHERE id = 24",
    ["https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80"]
  );
  console.log("Course 24 image updated successfully");
  await pool.end();
}

main().catch(err => {
  console.error(err);
  pool.end();
});
