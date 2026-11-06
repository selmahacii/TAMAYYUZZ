import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pg = require("../lib/db/node_modules/pg");
const bcrypt = require("../artifacts/api-server/node_modules/bcrypt");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
});

async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

console.log("Connected to Neon DB via Pool. Starting complete production seed...");

const passwordHash = await bcrypt.hash("Password123!", 10);

// 1. Clear existing data
await query(`
  DELETE FROM exam_attempts;
  DELETE FROM certificates;
  DELETE FROM progress;
  DELETE FROM enrollments;
  DELETE FROM course_reviews;
  DELETE FROM lesson_comments;
  DELETE FROM in_app_notifications;
  DELETE FROM commissions;
  DELETE FROM invoices;
  DELETE FROM purchases;
  DELETE FROM lessons;
  DELETE FROM chapters;
  DELETE FROM coupons;
  DELETE FROM announcements;
  DELETE FROM courses;
  DELETE FROM certificate_templates;
  DELETE FROM categories;
  DELETE FROM users;
`);
console.log("✔ Old data wiped cleanly.");

// 2. Insert Users
const userValues = [
  ['Admin Tamayuz', 'admin@tamayuz.dz', passwordHash, 'admin', true, 'Administrateur Principal de la Plateforme Tamayuz.', 'Management'],
  ['Dr. Sofiane Meziani', 'coach@tamayuz.dz', passwordHash, 'coach', true, "Expert en Ingénierie Logicielle & Intelligence Artificielle avec plus de 10 ans d'expérience.", 'Technology'],
  ['Yassine Mansouri', 'student@tamayuz.dz', passwordHash, 'student', true, "Étudiant passionné par le développement web et l'IA.", 'Technology'],
  ['Amina Benali', 'etudiant@tamayuz.dz', passwordHash, 'student', true, 'Débutante motivée en reconversion professionnelle.', 'Marketing'],
  ['Nadia Kaci (Coach en attente)', 'coach.pending@tamayuz.dz', passwordHash, 'coach', false, 'Formatrice en design graphique en cours de validation pédagogique.', 'Design']
];

const users = {};
for (const [name, email, pass, role, approved, bio, domain] of userValues) {
  const res = await query(
    `INSERT INTO users (name, email, password_hash, role, is_approved, bio, domain, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id, name, email, role;`,
    [name, email, pass, role, approved, bio, domain]
  );
  users[email] = res.rows[0];
}
console.log("✔ Users inserted: admin@tamayuz.dz, coach@tamayuz.dz, student@tamayuz.dz, etudiant@tamayuz.dz");

// 3. Insert Categories
const categories = ['Technology', 'Business', 'Marketing', 'Design', 'Finance', 'Communication', 'Entrepreneuriat', 'Management', 'Other'];
for (const cat of categories) {
  await query(`INSERT INTO categories (name, created_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING;`, [cat]);
}
console.log("✔ Categories populated.");

// 4. Insert Certificate Template
const certTplRes = await query(
  `INSERT INTO certificate_templates (name, description, primary_color, accent_color, is_default, is_active, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
   RETURNING id;`,
  ["Certificat d'Excellence Tamayuz (Or & Noir)", "Certificat officiel délivré après la réussite de l'examen final.", '#111827', '#d97706', true, true]
);
const templateId = certTplRes.rows[0].id;
console.log(`✔ Certificate Template created (ID: ${templateId}).`);

// 5. Final Exam Data
const fullstackExam = {
  passingScore: 75,
  questions: [
    {
      question: "Quelle méthode HTTP est recommandée pour mettre à jour une ressource existante partiellement ?",
      options: ["GET", "POST", "PATCH", "DELETE"],
      answer: 2
    },
    {
      question: "Dans React, quel hook est utilisé pour gérer un effet de bord asynchrone ou une souscription ?",
      options: ["useState", "useEffect", "useMemo", "useCallback"],
      answer: 1
    },
    {
      question: "Quel protocole permet à PostgreSQL de communiquer avec Node.js via PgBouncer Pooler ?",
      options: ["HTTP/2", "TCP PostgreSQL Wire Protocol", "FTP", "WebRTC"],
      answer: 1
    },
    {
      question: "Pourquoi est-il crucial de hasher les mots de passe avec bcrypt plutôt que sha256 ?",
      options: [
        "Car sha256 est payant",
        "Car bcrypt intègre un sel (salt) et un facteur de coût résistant aux attaques par force brute",
        "Car bcrypt compresse la base de données",
        "Car les navigateurs ne supportent pas sha256"
      ],
      answer: 1
    }
  ]
};

const aiExam = {
  passingScore: 70,
  questions: [
    {
      question: "Qu'est-ce que la technique du Few-Shot Prompting ?",
      options: [
        "Poser une question en moins de 10 mots",
        "Fournir au modèle quelques exemples de paires entrée/sortie dans le prompt avant la question finale",
        "Utiliser plusieurs modèles en parallèle",
        "Générer une seule réponse par jour"
      ],
      answer: 1
    },
    {
      question: "Dans une architecture RAG (Retrieval-Augmented Generation), quel composant stocke les embeddings ?",
      options: ["Une base de données vectorielle (Vector DB)", "Le cache DNS", "Le localStorage du navigateur", "Un fichier CSV"],
      answer: 0
    },
    {
      question: "Que contrôle la température (temperature) dans un modèle de langage comme GPT ou Gemini ?",
      options: [
        "La vitesse du ventilateur du serveur",
        "Le degré d'aléa et de créativité des réponses générées",
        "Le nombre de tokens par minute",
        "La langue de sortie"
      ],
      answer: 1
    }
  ]
};

// 6. Insert Courses
const courseWebRes = await query(
  `INSERT INTO courses (
    title, subtitle, description, category, image_url, language, tags, 
    learning_objectives, requirements, target_audience, coach_id, 
    is_published, duration_hours, level, is_free, price, currency, 
    certificate_template_id, final_exam, created_at, updated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
  RETURNING id, title;`,
  [
    'Développement Web Fullstack Moderne (React & Node.js)',
    "Maîtrisez le développement d'applications web complètes de A à Z avec certification",
    "Cette formation professionnelle vous guide étape par étape dans la maîtrise de React 19, TypeScript, Node.js, Express, PostgreSQL et Drizzle ORM. À l'issue de cette formation et de la réussite de l'examen final, vous recevrez votre certificat officiel vérifiable en ligne.",
    'Technology',
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=1000&auto=format&fit=crop',
    'fr',
    JSON.stringify(["React", "Node.js", "TypeScript", "PostgreSQL", "Fullstack"]),
    JSON.stringify([
      "Créer des interfaces modernes et responsives avec React et Tailwind CSS",
      "Concevoir des APIs REST sécurisées avec JWT et RBAC",
      "Modéliser et requêter une base de données PostgreSQL",
      "Réussir l'examen final et obtenir sa certification professionnelle"
    ]),
    JSON.stringify(["Bases en programmation ou logique informatique", "Un ordinateur avec Node.js installé"]),
    JSON.stringify([
      "Étudiantes souhaitant se lancer dans le dev web",
      "Développeurs débutants voulant passer au niveau supérieur",
      "Entrepreneurs voulant coder leur propre MVP"
    ]),
    users['coach@tamayuz.dz'].id,
    true,
    38,
    'beginner',
    false,
    '14500.00',
    'DZD',
    templateId,
    JSON.stringify(fullstackExam)
  ]
);
const courseWeb = courseWebRes.rows[0];

const courseAIRes = await query(
  `INSERT INTO courses (
    title, subtitle, description, category, image_url, language, tags, 
    learning_objectives, requirements, target_audience, coach_id, 
    is_published, duration_hours, level, is_free, price, currency, 
    certificate_template_id, final_exam, created_at, updated_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
  RETURNING id, title;`,
  [
    'Intelligence Artificielle & Automatisation (LLMs & Agents)',
    "Créez des agents autonomes et intégrez l'IA générative dans vos projets",
    "Découvrez comment concevoir des solutions basées sur les modèles d'IA générative les plus avancés. Maîtrisez le Prompt Engineering, l'architecture RAG, et le déploiement d'agents intelligents.",
    'Technology',
    'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1000&auto=format&fit=crop',
    'fr',
    JSON.stringify(["IA", "LLM", "Prompt Engineering", "Agents", "Python"]),
    JSON.stringify([
      "Maîtriser les techniques avancées de Prompt Engineering",
      "Comprendre les bases des Embeddings et du RAG",
      "Construire son premier agent IA avec examen final certifié"
    ]),
    JSON.stringify(["Aucun prérequis technique complexe requis"]),
    JSON.stringify(["Toute personne souhaitant tirer parti de l'IA dans sa carrière"]),
    users['coach@tamayuz.dz'].id,
    true,
    18,
    'intermediate',
    true,
    '0.00',
    'DZD',
    templateId,
    JSON.stringify(aiExam)
  ]
);
const courseAI = courseAIRes.rows[0];
console.log(`✔ Courses inserted: ID ${courseWeb.id} ("${courseWeb.title}") and ID ${courseAI.id} ("${courseAI.title}")`);

// 7. Insert Chapters
const chap1Res = await query(
  `INSERT INTO chapters (course_id, title, description, "order", created_at)
   VALUES ($1, $2, $3, $4, NOW()) RETURNING id;`,
  [courseWeb.id, 'Module 1 : Fondations React & Architecture Frontend', 'Comprendre les composants, les états et les hooks', 1]
);
const chap2Res = await query(
  `INSERT INTO chapters (course_id, title, description, "order", created_at)
   VALUES ($1, $2, $3, $4, NOW()) RETURNING id;`,
  [courseWeb.id, 'Module 2 : Backend REST & Sécurité des Données', 'Construire une API robuste avec authentification JWT et RBAC', 2]
);
const chapAIRes = await query(
  `INSERT INTO chapters (course_id, title, description, "order", created_at)
   VALUES ($1, $2, $3, $4, NOW()) RETURNING id;`,
  [courseAI.id, 'Module 1 : Prompt Engineering & RAG', 'Principes fondamentaux des LLMs', 1]
);
const chapWeb1 = chap1Res.rows[0].id;
const chapWeb2 = chap2Res.rows[0].id;
const chapAI1 = chapAIRes.rows[0].id;
console.log("✔ Chapters inserted.");

// 8. Insert Lessons with Rich Video & Quiz
const quizLesson1 = {
  questions: [
    {
      question: "Quel hook permet de mémoriser une valeur calculée coûteuse ?",
      options: ["useEffect", "useMemo", "useRef", "useId"],
      answer: 1
    },
    {
      question: "Quelle commande crée un nouveau projet React avec Vite ?",
      options: ["npm start react", "pnpm create vite", "git clone react", "npm install react-app"],
      answer: 1
    }
  ]
};

const lessonsWeb = [];
const l1Res = await query(
  `INSERT INTO lessons (course_id, chapter_id, title, description, "order", duration_minutes, type, video_url, quiz_data, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id, title;`,
  [
    courseWeb.id, chapWeb1,
    '1. Introduction & Démarrage du Projet React',
    "Découvrez l'architecture de l'application et comment structurer vos composants React avec Vite.",
    1, 25, 'video',
    'https://www.youtube.com/watch?v=bMknfKXIFA8',
    null
  ]
);
lessonsWeb.push(l1Res.rows[0]);

const l2Res = await query(
  `INSERT INTO lessons (course_id, chapter_id, title, description, "order", duration_minutes, type, video_url, quiz_data, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id, title;`,
  [
    courseWeb.id, chapWeb1,
    '2. Quiz : Validation des Hooks React',
    "Testez vos connaissances sur useState, useEffect et la gestion d'état avant de passer au backend.",
    2, 15, 'quiz',
    null,
    JSON.stringify(quizLesson1)
  ]
);
lessonsWeb.push(l2Res.rows[0]);

const l3Res = await query(
  `INSERT INTO lessons (course_id, chapter_id, title, description, "order", duration_minutes, type, video_url, quiz_data, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id, title;`,
  [
    courseWeb.id, chapWeb2,
    "3. Conception d'une API REST avec Express & Drizzle ORM",
    "Apprenez à connecter Node.js à PostgreSQL sur Neon en toute sécurité avec pooling de connexions.",
    1, 35, 'video',
    'https://www.youtube.com/watch?v=SccSCuHhOw0',
    null
  ]
);
lessonsWeb.push(l3Res.rows[0]);

await query(
  `INSERT INTO lessons (course_id, chapter_id, title, description, "order", duration_minutes, type, video_url, quiz_data, created_at)
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW());`,
  [
    courseAI.id, chapAI1,
    '1. Fondements du Prompt Engineering pour Développeurs',
    "Structurez des prompts efficaces pour automatiser le code et analyser la data.",
    1, 20, 'video',
    'https://www.youtube.com/watch?v=jC4v5AS4RIM',
    null
  ]
);
console.log(`✔ Lessons inserted with video and quiz.`);

// 9. Enroll Student Yassine to Course 1 and Course 2
await query(
  `INSERT INTO enrollments (user_id, course_id, enrolled_at)
   VALUES ($1, $2, NOW()), ($1, $3, NOW());`,
  [users['student@tamayuz.dz'].id, courseWeb.id, courseAI.id]
);
console.log("✔ Student Yassine enrolled in courses.");

// 10. Mark ALL lessons of Course 1 as COMPLETED for Student Yassine
for (const lesson of lessonsWeb) {
  await query(
    `INSERT INTO progress (user_id, lesson_id, is_completed, last_position_seconds, updated_at)
     VALUES ($1, $2, true, 120, NOW())
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET is_completed = true;`,
    [users['student@tamayuz.dz'].id, lesson.id]
  );
}
console.log(`✔ All ${lessonsWeb.length} lessons marked COMPLETED for Yassine -> Examination immediately unlocked at /student/exam/${courseWeb.id} !`);

// 11. Insert Real Reviews
await query(
  `INSERT INTO course_reviews (course_id, user_id, rating, comment, created_at, updated_at)
   VALUES
     ($1, $2, 5, 'Formation exceptionnelle ! Le formateur explique avec clarté et pédagogie. J''ai validé toutes les leçons et passé l''examen final avec succès !', NOW() - INTERVAL '2 days', NOW()),
     ($1, $3, 5, 'Excellente plateforme algérienne, très fluide. Le paiement par BaridiMob s''est fait sans aucun accroc.', NOW() - INTERVAL '1 day', NOW());`,
  [courseWeb.id, users['student@tamayuz.dz'].id, users['etudiant@tamayuz.dz'].id]
);
console.log("✔ Course reviews added.");

// 12. Insert Q&A Comments
const commentRes = await query(
  `INSERT INTO lesson_comments (lesson_id, user_id, content, created_at, updated_at)
   VALUES ($1, $2, $3, NOW() - INTERVAL '3 hours', NOW()) RETURNING id;`,
  [
    lessonsWeb[0].id,
    users['student@tamayuz.dz'].id,
    "Bonjour Dr. Sofiane, dans la vidéo vous mentionnez les hooks personnalisés. Est-ce qu'on verra comment gérer le cache avec TanStack Query ?"
  ]
);
const parentCommentId = commentRes.rows[0].id;

await query(
  `INSERT INTO lesson_comments (lesson_id, user_id, parent_id, content, created_at, updated_at)
   VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 hour', NOW());`,
  [
    lessonsWeb[0].id,
    users['coach@tamayuz.dz'].id,
    parentCommentId,
    "Absolument Yassine ! TanStack Query est abordé en détail dans le Module 2 avec les requêtes optimistes et l'invalidation de cache."
  ]
);
console.log("✔ Q&A Discussion thread created on Lesson 1.");

// 13. Insert Announcements
await query(
  `INSERT INTO announcements (author_id, title, content, type, is_published, is_approved, is_pinned, created_at, updated_at)
   VALUES
     ($1, 'Bienvenue sur la plateforme Tamayuz ! 🇩🇿', 'La première plateforme e-learning algérienne dédiée à la formation professionnelle certifiante et à l''accompagnement des talents.', 'announcement', true, true, true, NOW(), NOW()),
     ($2, 'Examen Final disponible sur la formation Web Fullstack', 'Tous les étudiants ayant validé les 3 leçons peuvent désormais passer leur examen final pour décrocher leur certificat d''excellence.', 'ad', true, true, false, NOW(), NOW());`,
  [users['admin@tamayuz.dz'].id, users['coach@tamayuz.dz'].id]
);
console.log("✔ Platform announcements created.");

await pool.end();
console.log("\n=======================================================");
console.log("🎉 SEEDING COMPLETED SUCCESSFULLY ON NEON POSTGRESQL !");
console.log("=======================================================\n");
