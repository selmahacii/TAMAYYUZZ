const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  console.log("Adding country column to courses table...");
  await pool.query(`
    ALTER TABLE courses 
    ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'dz';
  `);

  console.log("Enriching categories table with missing categories...");
  const categoriesToEnsure = [
    { name: 'Personal Development', desc: 'تطوير الذات، مهارات التواصل، القيادة وبناء العلاقات الإنسانية المتوازنة.' },
    { name: 'Design', desc: 'تصميم واجهات المستخدم UI/UX، الهوية البصرية، والإنتاج الإبداعي.' },
    { name: 'Academic Research', desc: 'منهجية إعداد مذكرات التخرج، رسائل الماجستير والدكتوراه، والنشر العلمي الدولي.' },
    { name: 'Management', desc: 'إدارة المشاريع، التخطيط الاستراتيجي، وقيادة فرق العمل.' },
  ];

  for (const cat of categoriesToEnsure) {
    await pool.query(`
      INSERT INTO categories (name, description, created_at)
      SELECT $1, $2, NOW()
      WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = $1);
    `, [cat.name, cat.desc]);
  }

  console.log("Updating target country for courses...");
  // Set the 4 reference courses (IDs 24, 25, 26, 27)
  await pool.query("UPDATE courses SET country = 'dz' WHERE id IN (24, 25, 26);");
  await pool.query("UPDATE courses SET country = 'all' WHERE id = 27;"); // منهجية البحث العلمي - لجميع الجامعات

  // Check some courses
  const res = await pool.query("SELECT id, title, category, country FROM courses ORDER BY id ASC LIMIT 10;");
  console.log("Sample courses:", res.rows);

  const allCats = await pool.query("SELECT id, name FROM categories ORDER BY id ASC;");
  console.log("All categories:", allCats.rows.map(c => c.name));

  await pool.end();
  console.log("Migration completed successfully!");
}

main().catch(err => {
  console.error("Migration error:", err);
  pool.end();
});
