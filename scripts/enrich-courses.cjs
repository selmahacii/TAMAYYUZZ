const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const courses = await pool.query('SELECT id, title, category, faq, promo_video_url FROM courses ORDER BY id DESC LIMIT 5;');
  console.log('Courses:', JSON.stringify(courses.rows, null, 2));

  // If a course exists without FAQ, let's enrich it with realistic, professional French FAQ items
  for (const c of courses.rows) {
    if (!c.faq || c.faq.length === 0) {
      const defaultFaq = [
        {
          question: "Combien de temps ai-je accès aux ressources de cette formation ?",
          answer: "Dès validation de votre inscription, vous bénéficiez d'un accès illimité et permanent 24h/24 et 7j/7 aux modules vidéos, supports téléchargeables et futures révisions."
        },
        {
          question: "Comment se déroule la délivrance du certificat officiel ?",
          answer: "Après avoir complété l'ensemble des modules pédagogiques et validé l'évaluation finale avec le seuil requis, un certificat officiel nominatif muni d'un identifiant unique de vérification est généré automatiquement."
        },
        {
          question: "Puis-je poser des questions au formateur pendant mon apprentissage ?",
          answer: "Oui, un espace d'échange dédié est intégré sous chaque leçon pour soumettre vos questions techniques et interagir avec la communauté d'apprenantes."
        }
      ];
      await pool.query('UPDATE courses SET faq = $1::jsonb WHERE id = $2;', [JSON.stringify(defaultFaq), c.id]);
      console.log(`Updated course ${c.id} with institutional FAQ.`);
    }
  }

  await pool.end();
}

main().catch(console.error);
