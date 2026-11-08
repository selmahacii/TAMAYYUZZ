const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  await pool.query(`
    INSERT INTO price_requests (coach_id, course_id, requested_price, current_price, currency, justification, status, created_at)
    VALUES 
    (75, 21, '28000', '25000', 'DZD', 'Mise à jour complète du programme 2026 avec les nouvelles stratégies TikTok Ads & BaridiMob.', 'pending', NOW() - INTERVAL '2 hours'),
    (75, 22, '24500', '22000', 'DZD', 'Ajout de 6 nouvelles études de cas réelles et sessions de coaching hebdomadaires.', 'pending', NOW() - INTERVAL '1 day');
  `);
  const res = await pool.query('SELECT * FROM price_requests;');
  console.log('Inserted price_requests count:', res.rows.length);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
