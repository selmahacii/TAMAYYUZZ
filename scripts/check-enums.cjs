const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const enums = await pool.query(`
    SELECT t.typname, e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname IN ('ticket_status', 'ticket_priority', 'ticket_category', 'user_role')
    ORDER BY t.typname, e.enumsortorder;
  `);
  console.log('Enums:', enums.rows);
  await pool.end();
}

main().catch(console.error);
