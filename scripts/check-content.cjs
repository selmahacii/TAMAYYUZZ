const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const ch = await pool.query('SELECT count(*) FROM chapters;');
  const ls = await pool.query('SELECT count(*) FROM lessons;');
  console.log('Chapters count:', ch.rows[0].count);
  console.log('Lessons count:', ls.rows[0].count);

  const sampleLessons = await pool.query('SELECT id, course_id, chapter_id, title, type, duration_minutes FROM lessons LIMIT 5;');
  console.log('Sample lessons:', sampleLessons.rows);
  await pool.end();
}

main().catch(console.error);
