const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const targetId = 74;
  const userRows = await pool.query(`
    SELECT u.*, c.name as center_name, c.address as center_address
    FROM users u
    LEFT JOIN centers c ON u.center_id = c.id
    WHERE u.id = $1;
  `, [targetId]);

  console.log('User found:', userRows.rows[0]?.name, userRows.rows[0]?.email);

  const purchases = await pool.query(`
    SELECT p.*, c.title as course_title, c.price as course_official_price
    FROM purchases p
    LEFT JOIN courses c ON p.course_id = c.id
    WHERE p.user_id = $1
    ORDER BY p.paid_at DESC NULLS LAST, p.id DESC;
  `, [targetId]);
  console.log('Purchases count:', purchases.rows.length);

  const enrollments = await pool.query(`
    SELECT e.*, c.title as course_title, c.category, c.level, c.image_url,
           count(DISTINCT l.id)::int as total_lessons,
           count(DISTINCT pr.id) FILTER (WHERE pr.is_completed = true)::int as completed_lessons
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    LEFT JOIN lessons l ON c.id = l.course_id
    LEFT JOIN progress pr ON l.id = pr.lesson_id AND pr.user_id = e.user_id
    WHERE e.user_id = $1
    GROUP BY e.id, c.id
    ORDER BY e.enrolled_at DESC;
  `, [targetId]);
  console.log('Enrollments count:', enrollments.rows.length);

  const tickets = await pool.query('SELECT * FROM tickets WHERE user_id = $1;', [targetId]);
  console.log('Tickets count:', tickets.rows.length);

  await pool.end();
}

main().catch(console.error);
