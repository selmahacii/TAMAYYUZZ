const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  console.log('Altering courses table...');
  await pool.query(`
    ALTER TABLE courses 
    ADD COLUMN IF NOT EXISTS faq json DEFAULT '[]'::json,
    ADD COLUMN IF NOT EXISTS promo_video_url text;
  `);
  console.log('Columns added successfully.');
  
  // Verify
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name IN ('faq', 'promo_video_url');
  `);
  console.log('Verified columns:', res.rows);
  await pool.end();
}

main().catch(console.error);
