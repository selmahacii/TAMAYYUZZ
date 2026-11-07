import bcrypt from "bcryptjs";

const NEON_HOST = "ep-spring-mode-ba1olrfk.c-8.eu-central-1.aws.neon.tech";
const NEON_CONN = "postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function queryNeon(sql, params = []) {
  const res = await fetch(`https://${NEON_HOST}/sql`, {
    method: "POST",
    headers: {
      "Neon-Connection-String": NEON_CONN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, params }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Neon error (${res.status}): ${err}`);
  }
  const data = await res.json();
  return data.rows ?? [];
}

async function run() {
  console.log("=========================================================");
  console.log("🚀 CONFIGURATION DU PROFIL ÉTUDIANT : selmaahacii@gmail.com");
  console.log("=========================================================\n");

  const email = "selmaahacii@gmail.com";
  const newPassword = "Selma004";

  // 1. Password Hash (Bcrypt)
  console.log("1. Hachage sécurisé du mot de passe (Selma004)...");
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // 2. Mise à jour de l'utilisateur selmaahacii@gmail.com
  console.log("2. Mise à jour des informations du profil...");
  let users = await queryNeon("SELECT * FROM users WHERE email = $1 LIMIT 1;", [email]);
  let user;

  if (users.length === 0) {
    const inserted = await queryNeon(
      `INSERT INTO users (name, email, password_hash, role, is_approved, phone, bio, domain, interests, avatar_url, created_at)
       VALUES ('Selma Haci', $1, $2, 'student', true, '+213 550 12 34 56',
               'Passionnée de développement Fullstack, d''IA et de design UI/UX. Étudiante certifiée sur Tamayuz.',
               'Technology & Design', $3, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', NOW() - INTERVAL '20 days')
       RETURNING *;`,
      [email, passwordHash, JSON.stringify(["Technology", "Design", "Intelligence Artificielle", "Développement Web"])]
    );
    user = inserted[0];
  } else {
    user = users[0];
    const updated = await queryNeon(
      `UPDATE users
       SET name = 'Selma Haci',
           password_hash = $1,
           role = 'student',
           is_approved = true,
           phone = '+213 550 12 34 56',
           bio = 'Passionnée de développement Fullstack, d''IA et de design UI/UX. Étudiante certifiée sur Tamayuz.',
           domain = 'Technology & Design',
           interests = $2,
           avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'
       WHERE id = $3
       RETURNING *;`,
      [passwordHash, JSON.stringify(["Technology", "Design", "Intelligence Artificielle", "Développement Web"]), user.id]
    );
    user = updated[0];
  }
  console.log(`✔ Utilisateur configuré : ID=${user.id}, Nom=${user.name}, Email=${user.email}`);

  // 3. Nettoyage des anciennes données associées pour repartir sur une base 100% propre
  console.log("\n3. Nettoyage des données précédentes pour Selma...");
  await queryNeon("DELETE FROM certificates WHERE user_id = $1;", [user.id]);
  await queryNeon("DELETE FROM purchases WHERE user_id = $1;", [user.id]);
  await queryNeon("DELETE FROM invoices WHERE user_id = $1;", [user.id]);
  await queryNeon("DELETE FROM enrollments WHERE user_id = $1;", [user.id]);
  await queryNeon("DELETE FROM progress WHERE user_id = $1;", [user.id]);
  await queryNeon("DELETE FROM exam_attempts WHERE user_id = $1;", [user.id]);
  await queryNeon("DELETE FROM tickets WHERE user_id = $1;", [user.id]);
  console.log("✔ Anciennes données nettoyées.");

  // 4. Récupération des cours cibles
  const courses = await queryNeon("SELECT * FROM courses ORDER BY id;");
  const cWeb = courses.find((c) => c.title.includes("Fullstack")) || courses[0];
  const cAI = courses.find((c) => c.title.includes("Intelligence Artificielle")) || courses[1];
  const cUI = courses.find((c) => c.title.includes("UI/UX")) || courses[3];
  const cFree = courses.find((c) => c.is_free) || courses[courses.length - 1];

  console.log("\n4. Inscriptions aux formations :");
  console.log(`  - [100% Terminé] ${cWeb.title}`);
  console.log(`  - [60% En cours] ${cAI.title}`);
  console.log(`  - [25% En cours] ${cUI.title}`);
  console.log(`  - [100% Terminé] ${cFree.title}`);

  // Inscriptions (Enrollments)
  await queryNeon("INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES ($1, $2, NOW() - INTERVAL '15 days');", [user.id, cWeb.id]);
  await queryNeon("INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES ($1, $2, NOW() - INTERVAL '7 days');", [user.id, cAI.id]);
  await queryNeon("INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES ($1, $2, NOW() - INTERVAL '3 days');", [user.id, cUI.id]);
  await queryNeon("INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES ($1, $2, NOW() - INTERVAL '10 days');", [user.id, cFree.id]);
  console.log("✔ 4 inscriptions créées.");

  // 5. Progression détaillée leçon par leçon
  console.log("\n5. Génération de la progression dans les cours...");
  // Cours Web: TOUTES les leçons complétées (100%)
  const webLessons = await queryNeon("SELECT id FROM lessons WHERE course_id = $1 ORDER BY \"order\";", [cWeb.id]);
  for (const l of webLessons) {
    await queryNeon(
      "INSERT INTO progress (user_id, lesson_id, is_completed, last_position_seconds, updated_at) VALUES ($1, $2, true, 0, NOW() - INTERVAL '5 days') ON CONFLICT DO NOTHING;",
      [user.id, l.id]
    );
  }

  // Cours IA: 3 premières leçons complétées sur 5 (60%)
  const aiLessons = await queryNeon("SELECT id FROM lessons WHERE course_id = $1 ORDER BY \"order\";", [cAI.id]);
  for (let i = 0; i < Math.min(3, aiLessons.length); i++) {
    await queryNeon(
      "INSERT INTO progress (user_id, lesson_id, is_completed, last_position_seconds, updated_at) VALUES ($1, $2, true, 0, NOW() - INTERVAL '2 days') ON CONFLICT DO NOTHING;",
      [user.id, aiLessons[i].id]
    );
  }
  if (aiLessons.length > 3) {
    await queryNeon(
      "INSERT INTO progress (user_id, lesson_id, is_completed, last_position_seconds, updated_at) VALUES ($1, $2, false, 340, NOW() - INTERVAL '1 hour') ON CONFLICT DO NOTHING;",
      [user.id, aiLessons[3].id]
    );
  }

  // Cours UI/UX: 1 leçon complétée (20-25%)
  const uiLessons = await queryNeon("SELECT id FROM lessons WHERE course_id = $1 ORDER BY \"order\";", [cUI.id]);
  if (uiLessons.length > 0) {
    await queryNeon(
      "INSERT INTO progress (user_id, lesson_id, is_completed, last_position_seconds, updated_at) VALUES ($1, $2, true, 0, NOW() - INTERVAL '1 day') ON CONFLICT DO NOTHING;",
      [user.id, uiLessons[0].id]
    );
  }

  // Cours Freelancing: TOUTES les leçons complétées (100%)
  const freeLessons = await queryNeon("SELECT id FROM lessons WHERE course_id = $1 ORDER BY \"order\";", [cFree.id]);
  for (const l of freeLessons) {
    await queryNeon(
      "INSERT INTO progress (user_id, lesson_id, is_completed, last_position_seconds, updated_at) VALUES ($1, $2, true, 0, NOW() - INTERVAL '3 days') ON CONFLICT DO NOTHING;",
      [user.id, l.id]
    );
  }
  console.log("✔ Progressions enregistrées avec succès.");

  // 6. Examens réussis & Certificats d'Excellence
  console.log("\n6. Émission des certificats officiels et examens réussis...");
  const templates = await queryNeon("SELECT id FROM certificate_templates ORDER BY id;");
  const techTemplateId = templates.find((t) => t.id === 9)?.id || templates[0]?.id || 8;
  const bizTemplateId = templates.find((t) => t.id === 10)?.id || templates[0]?.id || 8;

  // Examen Web réussi à 98%
  await queryNeon("INSERT INTO exam_attempts (user_id, course_id, score, passed, attempted_at) VALUES ($1, $2, 98, true, NOW() - INTERVAL '4 days');", [user.id, cWeb.id]);
  const certCode1 = "ST-2026-WEB-SELMA";
  await queryNeon(
    `INSERT INTO certificates (user_id, course_id, certificate_code, issued_at, student_name, course_name, coach_name, exam_score, template_id)
     VALUES ($1, $2, $3, NOW() - INTERVAL '4 days', 'Selma Haci', $4, 'Dr. Sofiane Meziani', 98, $5);`,
    [user.id, cWeb.id, certCode1, cWeb.title, techTemplateId]
  );
  console.log(`✔ Certificat 1 émis : ${certCode1} (${cWeb.title} - 98%)`);

  // Examen Freelancing réussi à 95%
  await queryNeon("INSERT INTO exam_attempts (user_id, course_id, score, passed, attempted_at) VALUES ($1, $2, 95, true, NOW() - INTERVAL '2 days');", [user.id, cFree.id]);
  const certCode2 = "ST-2026-STARTUP-SELMA";
  await queryNeon(
    `INSERT INTO certificates (user_id, course_id, certificate_code, issued_at, student_name, course_name, coach_name, exam_score, template_id)
     VALUES ($1, $2, $3, NOW() - INTERVAL '2 days', 'Selma Haci', $4, 'Samira Hadj', 95, $5);`,
    [user.id, cFree.id, certCode2, cFree.title, bizTemplateId]
  );
  console.log(`✔ Certificat 2 émis : ${certCode2} (${cFree.title} - 95%)`);

  // 7. Historique d'achats, factures et paiements
  console.log("\n7. Création de l'historique d'achats avec factures acquittées...");
  // Achat 1 : Cours Web (9 600 DZD avec coupon TAMAYUZ2026)
  const [p1] = await queryNeon(
    `INSERT INTO purchases (user_id, course_id, amount, currency, status, coupon_code, discount_applied, payment_method, paid_at)
     VALUES ($1, $2, '9600.00', 'DZD', 'paid', 'TAMAYUZ2026', '2400.00', 'baridimob', NOW() - INTERVAL '15 days')
     RETURNING *;`,
    [user.id, cWeb.id]
  );
  await queryNeon(
    `INSERT INTO invoices (invoice_number, user_id, purchase_id, amount, currency, status, issued_at, paid_at, notes, created_at)
     VALUES ('INV-2026-SELMA-001', $1, $2, '9600.00', 'DZD', 'paid', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', 'Paiement BaridiMob acquitté avec succès.', NOW() - INTERVAL '15 days');`,
    [user.id, p1.id]
  );

  // Achat 2 : Cours IA (12 950 DZD avec coupon BIENVENUE30)
  const [p2] = await queryNeon(
    `INSERT INTO purchases (user_id, course_id, amount, currency, status, coupon_code, discount_applied, payment_method, paid_at)
     VALUES ($1, $2, '12950.00', 'DZD', 'paid', 'BIENVENUE30', '5550.00', 'card', NOW() - INTERVAL '7 days')
     RETURNING *;`,
    [user.id, cAI.id]
  );
  await queryNeon(
    `INSERT INTO invoices (invoice_number, user_id, purchase_id, amount, currency, status, issued_at, paid_at, notes, created_at)
     VALUES ('INV-2026-SELMA-002', $1, $2, '12950.00', 'DZD', 'paid', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', 'Paiement sécurisé par carte CIB/EDAHABIA.', NOW() - INTERVAL '7 days');`,
    [user.id, p2.id]
  );

  // Achat 3 : Cours UI/UX (8 910 DZD avec coupon EXCELLENCE10)
  const [p3] = await queryNeon(
    `INSERT INTO purchases (user_id, course_id, amount, currency, status, coupon_code, discount_applied, payment_method, paid_at)
     VALUES ($1, $2, '8910.00', 'DZD', 'paid', 'EXCELLENCE10', '990.00', 'ccp', NOW() - INTERVAL '3 days')
     RETURNING *;`,
    [user.id, cUI.id]
  );
  await queryNeon(
    `INSERT INTO invoices (invoice_number, user_id, purchase_id, amount, currency, status, issued_at, paid_at, notes, created_at)
     VALUES ('INV-2026-SELMA-003', $1, $2, '8910.00', 'DZD', 'paid', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'Virement CCP validé par la comptabilité.', NOW() - INTERVAL '3 days');`,
    [user.id, p3.id]
  );
  console.log("✔ 3 achats et factures détaillées enregistrés (Total payé : 31 460 DZD, Économisé : 8 940 DZD).");

  // 8. Tickets de support et avis étudiants
  console.log("\n8. Ajout d'un ticket de support résolu et d'un avis client...");
  await queryNeon(
    `INSERT INTO tickets (user_id, subject, description, category, priority, status, resolution, created_at, updated_at, resolved_at)
     VALUES ($1, 'Validation du projet d''agent IA', 'Bonjour, je souhaitais savoir si mon architecture pour le projet d''agent RAG est validée avant de passer l''examen.', 'course', 'medium', 'resolved',
             'Bonjour Selma, votre architecture a été revue et approuvée par le Dr. Leila Khelifi. Excellent travail sur le pipeline de retrieval !',
             NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days');`,
    [user.id]
  );

  await queryNeon(
    `INSERT INTO course_reviews (course_id, user_id, rating, comment, created_at, updated_at)
     VALUES ($1, $2, 5, 'Une formation exceptionnelle ! Les explications sur React 19 et Node.js m''ont permis de concevoir une application complète et de réussir l''examen final avec 98%. Je recommande à 100% !', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days')
     ON CONFLICT (course_id, user_id) DO NOTHING;`,
    [cWeb.id, user.id]
  );
  console.log("✔ Ticket de support et avis 5 étoiles ajoutés.");

  console.log("\n=========================================================");
  console.log("🎉 CONFIGURATION DU PROFIL DE SELMA TERMINÉE AVEC SUCCÈS !");
  console.log("=========================================================");
  console.log("Email : selmaahacii@gmail.com");
  console.log("Mot de passe : Selma004");
  console.log("Formations : 4 (2 terminées avec certificats, 2 en cours)");
  console.log("Certificats : ST-2026-WEB-SELMA et ST-2026-STARTUP-SELMA");
  console.log("Factures : INV-2026-SELMA-001, 002, 003");
  console.log("=========================================================");
}

run().catch((err) => {
  console.error("❌ ERREUR :", err);
  process.exit(1);
});
