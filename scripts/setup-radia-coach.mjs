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
  console.log("🚀 CONFIGURATION COMPLETE DU PROFIL COACH : RADIA RENANE");
  console.log("=========================================================\n");

  const email = "renaneradia@gmail.com";
  const password = "Radia2026!";
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Mettre à jour le profil de Radia Renane (ID 75)
  console.log("1. Mise à jour du profil coach dans 'users'...");
  const diplomas = [
    {
      name: "Master en Marketing Stratégique et Communication Digitale",
      school: "HEC Alger / Université d'Alger 3",
      year: "2018",
      verified: true,
    },
    {
      name: "Certification Meta Certified Media Buying Professional",
      school: "Meta Blueprint",
      year: "2021",
      verified: true,
    },
    {
      name: "Expertise E-commerce & Logistique Dernier Kilomètre en Algérie",
      school: "Chambre Algérienne de Commerce et d'Industrie (CACI)",
      year: "2022",
      verified: true,
    },
  ];

  const priorTrainings = [
    "Formatrice de plus de 500 apprenantes chez Tamayuz",
    "Mentore certifiée au programme national Startup Dz",
    "Consultante stratégique E-commerce pour 15+ marques algériennes",
  ];

  const teachingPlan = "Pédagogie 100% pratique orientée ROI direct sur le marché algérien : lancement de vraies campagnes Ads, optimisation des coûts d'acquisition client (CAC/ROAS) et intégration des livreurs locaux (Yalidine, Procolis, KaziTour) et paiements (BaridiMob, CCP).";
  const interests = ["Marketing Digital", "E-commerce Algérie", "Meta Ads", "TikTok Ads", "Growth Hacking", "Copywriting"];
  const bio = "Consultante senior et formatrice agréée en Marketing Digital et E-Commerce en Algérie. Plus de 8 ans d'expérience dans l'accélération des ventes en ligne et la création de marques locales profitables.";
  const avatarUrl = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80";

  await queryNeon(`
    UPDATE users 
    SET name = 'Radia Renane',
        role = 'coach',
        is_approved = true,
        password_hash = $1,
        phone = '+213 780 12 57 00',
        domain = 'Marketing Digital & E-Commerce',
        bio = $2,
        avatar_url = $3,
        diplomas = $4::jsonb,
        prior_trainings = $5::jsonb,
        teaching_plan = $6,
        interests = $7::jsonb
    WHERE email = $8;
  `, [
    passwordHash,
    bio,
    avatarUrl,
    JSON.stringify(diplomas),
    JSON.stringify(priorTrainings),
    teachingPlan,
    JSON.stringify(interests),
    email,
  ]);

  const [coachUser] = await queryNeon("SELECT * FROM users WHERE email = $1 LIMIT 1;", [email]);
  const coachId = coachUser.id;
  console.log(`✅ Coach mis à jour avec succès : ID ${coachId}, Nom: ${coachUser.name}, Rôle: ${coachUser.role}, Approuvé: ${coachUser.is_approved}`);

  // 2. Affecter Course 17 à Radia
  console.log("\n2. Attribution de la formation Course 17 à Radia Renane...");
  await queryNeon("UPDATE courses SET coach_id = $1 WHERE id = 17;", [coachId]);

  // 3. Créer 2 autres formations phares créées par Radia si elles n'existent pas
  console.log("\n3. Création des formations phares de Radia Renane...");
  const existingRadiaCourses = await queryNeon("SELECT id, title FROM courses WHERE coach_id = $1;", [coachId]);
  let courseA_Id = null;
  let courseB_Id = null;

  for (const c of existingRadiaCourses) {
    if (c.title.includes("Facebook & Instagram Ads")) courseA_Id = c.id;
    if (c.title.includes("E-Commerce Local en Algérie")) courseB_Id = c.id;
  }

  if (!courseA_Id) {
    const insertedA = await queryNeon(`
      INSERT INTO courses (
        title, subtitle, description, category, level, price, is_free, currency,
        image_url, duration_hours, tags, learning_objectives, requirements, target_audience,
        coach_id, is_published, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'Marketing', 'intermediate', '14500.00', false, 'DZD',
        $4, 28, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb,
        $9, true, NOW() - INTERVAL '45 days', NOW()
      ) RETURNING id;
    `, [
      "Masterclass Facebook & Instagram Ads : Dominer le Marché Algérien en 2026",
      "Devenez un expert du ciblage wilaya par wilaya et multipliez vos ventes en ligne",
      "Formation complète et intensive conçue spécialement pour les entrepreneurs et marketeurs en Algérie. Vous apprendrez à configurer le Meta Pixel, créer des tunnels de vente étanches, maîtriser les audiences Lookalike locales et scaler des campagnes à plus de 500 commandes/jour avec un ROAS supérieur à 4.",
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop&q=80",
      JSON.stringify(["Facebook Ads", "Instagram", "Meta Pixel", "Algérie", "E-commerce"]),
      JSON.stringify([
        "Maîtriser le Business Manager et la gestion des comptes publicitaires",
        "Créer des visuels et vidéos publicitaires adaptés à la culture locale",
        "Optimiser le budget publicitaire (CBO/ABO) et analyser les métriques clés",
        "Gérer les blocages de compte et protéger ses actifs digitaux"
      ]),
      JSON.stringify(["Avoir un compte Facebook/Instagram", "Avoir un produit ou service à commercialiser"]),
      JSON.stringify(["E-commerçants", "Media buyers", "Responsables marketing", "Entrepreneurs"]),
      coachId,
    ]);
    courseA_Id = insertedA[0].id;
    console.log(`✅ Nouvelle formation créée : ID ${courseA_Id} ("Masterclass Facebook & Instagram Ads")`);
  }

  if (!courseB_Id) {
    const insertedB = await queryNeon(`
      INSERT INTO courses (
        title, subtitle, description, category, level, price, is_free, currency,
        image_url, duration_hours, tags, learning_objectives, requirements, target_audience,
        coach_id, is_published, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'Entrepreneuriat', 'advanced', '18000.00', false, 'DZD',
        $4, 35, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb,
        $9, true, NOW() - INTERVAL '60 days', NOW()
      ) RETURNING id;
    `, [
      "E-Commerce Local en Algérie : De l'Idée au 1er Million DZD de Chiffre d'Affaires",
      "Le guide pas à pas pour sourcer, vendre et livrer dans les 58 Wilayas sans capital colossal",
      "Un programme d'élite décortiquant la réalité du marché algérien : trouver des produits gagnants chez les grossistes (El Hamiz, Semmar, Ain Fakroun), négocier les tarifs de livraison avec Yalidine et KaziTour, réduire le taux de retour sous les 12% et encaisser sereinement avec BaridiMob et le paiement à la livraison (COD).",
      "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80",
      JSON.stringify(["E-commerce", "Sourcing Algérie", "Logistique Yalidine", "BaridiMob", "Vente"]),
      JSON.stringify([
        "Sourcer les meilleurs produits locaux et calculer sa marge nette réelle",
        "Créer une boutique haute conversion sur Shopify ou YouCan",
        "Établir un partenariat solide avec les sociétés de livraison de colis",
        "Mettre en place un service de confirmation téléphonique persuasif pour limiter les retours"
      ]),
      JSON.stringify(["Motivation et volonté d'entreprendre", "Un smartphone ou un ordinateur"]),
      JSON.stringify(["Porteurs de projets", "Commerçants traditionnels", "Étudiants en quête d'indépendance"]),
      coachId,
    ]);
    courseB_Id = insertedB[0].id;
    console.log(`✅ Nouvelle formation créée : ID ${courseB_Id} ("E-Commerce Local en Algérie")`);
  }

  const radiaCourseIds = [17, courseA_Id, courseB_Id].filter(Boolean);
  console.log(`Formations actives sous la responsabilité de Radia : [${radiaCourseIds.join(", ")}]`);

  // 4. Ajouter des chapitres et leçons pour les cours de Radia
  console.log("\n4. Vérification et création des chapitres et leçons...");
  for (const cId of [courseA_Id, courseB_Id]) {
    const chs = await queryNeon("SELECT id FROM chapters WHERE course_id = $1;", [cId]);
    if (chs.length === 0) {
      const ch1 = await queryNeon("INSERT INTO chapters (course_id, title, description, \"order\") VALUES ($1, 'Fondations & Stratégie', 'Prérequis et fondamentaux du marché algérien', 1) RETURNING id;", [cId]);
      const ch2 = await queryNeon("INSERT INTO chapters (course_id, title, description, \"order\") VALUES ($1, 'Passage à l''Action & Pratique', 'Mise en place pas à pas et cas concrets', 2) RETURNING id;", [cId]);
      const ch3 = await queryNeon("INSERT INTO chapters (course_id, title, description, \"order\") VALUES ($1, 'Optimisation & Scaling', 'Multipliez vos résultats et vos profits', 3) RETURNING id;", [cId]);

      await queryNeon("INSERT INTO lessons (course_id, chapter_id, title, description, \"order\", duration_minutes, type) VALUES ($1, $2, 'Introduction & État des lieux du marché en Algérie', 'Comprendre la dynamique actuelle', 1, 35, 'video');", [cId, ch1[0].id]);
      await queryNeon("INSERT INTO lessons (course_id, chapter_id, title, description, \"order\", duration_minutes, type) VALUES ($1, $2, 'Analyse des personas et comportement d''achat local', 'Comment cibler les wilayas rentables', 2, 45, 'video');", [cId, ch1[0].id]);
      await queryNeon("INSERT INTO lessons (course_id, chapter_id, title, description, \"order\", duration_minutes, type) VALUES ($1, $2, 'Atelier pratique : Configuration pas à pas en direct', 'Démonstration écran partagé', 1, 60, 'video');", [cId, ch2[0].id]);
      await queryNeon("INSERT INTO lessons (course_id, chapter_id, title, description, \"order\", duration_minutes, type) VALUES ($1, $2, 'Guide PDF : Modèles et fiches réflexes opérationnelles', 'Document à télécharger', 2, 20, 'pdf');", [cId, ch2[0].id]);
      await queryNeon("INSERT INTO lessons (course_id, chapter_id, title, description, \"order\", duration_minutes, type) VALUES ($1, $2, 'Scaling et gestion du service client haute fidélisation', 'Fidéliser et maximiser la LTV', 1, 50, 'video');", [cId, ch3[0].id]);
    }
  }

  // 5. Inscription des élèves aux cours de Radia (Selma Haci + autres étudiants)
  console.log("\n5. Inscription des étudiants aux formations de Radia...");
  const studentIds = [74, 68, 70, 71, 72, 73, 69]; // Selma, Yassine, Amina, Meriem, Walid, Khadija, Yassine Student

  for (const cId of radiaCourseIds) {
    for (const sId of studentIds) {
      await queryNeon(`
        INSERT INTO enrollments (user_id, course_id, enrolled_at)
        VALUES ($1, $2, NOW() - INTERVAL '15 days' + (random() * INTERVAL '10 days'))
        ON CONFLICT DO NOTHING;
      `, [sId, cId]);
    }
  }

  const [enrollmentCountRow] = await queryNeon(`
    SELECT count(*)::int as count 
    FROM enrollments e 
    JOIN courses c ON e.course_id = c.id 
    WHERE c.coach_id = $1;
  `, [coachId]);
  console.log(`✅ Total des étudiantes inscrites aux cours de Radia : ${enrollmentCountRow.count}`);

  // 6. Création des achats (purchases) et factures (invoices)
  console.log("\n6. Génération de l'historique des achats payés et factures...");
  const buyers = [
    { userId: 74, courseId: 17, amount: "8500.00", method: "BaridiMob", code: "BMOB-RADIA-74-01" },
    { userId: 74, courseId: courseA_Id, amount: "14500.00", method: "CCP", code: "CCP-RADIA-74-02" },
    { userId: 70, courseId: courseA_Id, amount: "14500.00", method: "BaridiMob", code: "BMOB-RADIA-70-01" },
    { userId: 71, courseId: courseB_Id, amount: "18000.00", method: "CIB", code: "CIB-RADIA-71-01" },
    { userId: 72, courseId: 17, amount: "8500.00", method: "BaridiMob", code: "BMOB-RADIA-72-01" },
    { userId: 73, courseId: courseB_Id, amount: "18000.00", method: "CCP", code: "CCP-RADIA-73-01" },
    { userId: 68, courseId: courseA_Id, amount: "14500.00", method: "BaridiMob", code: "BMOB-RADIA-68-01" },
    { userId: 69, courseId: courseB_Id, amount: "18000.00", method: "BaridiMob", code: "BMOB-RADIA-69-01" },
  ];

  let totalSales = 0;
  for (const b of buyers) {
    totalSales += parseFloat(b.amount);
    const existingP = await queryNeon("SELECT id FROM purchases WHERE user_id = $1 AND course_id = $2 LIMIT 1;", [b.userId, b.courseId]);
    let purchaseId;
    if (existingP.length === 0) {
      const p = await queryNeon(`
        INSERT INTO purchases (user_id, course_id, amount, currency, status, payment_method, paid_at, receipt_url)
        VALUES ($1, $2, $3, 'DZD', 'paid', $4, NOW() - INTERVAL '20 days' + (random() * INTERVAL '15 days'), 'https://tamayuz.dz/receipts/proof-sample.pdf')
        RETURNING id;
      `, [b.userId, b.courseId, b.amount, b.method]);
      purchaseId = p[0].id;
    } else {
      purchaseId = existingP[0].id;
    }

    // Invoice
    const existingInv = await queryNeon("SELECT id FROM invoices WHERE purchase_id = $1 LIMIT 1;", [purchaseId]);
    if (existingInv.length === 0) {
      await queryNeon(`
        INSERT INTO invoices (invoice_number, user_id, purchase_id, amount, currency, status, notes, issued_at, paid_at, created_at)
        VALUES ($1, $2, $3, $4, 'DZD', 'paid', 'Achat formation certifiante dispensée par Coach Radia Renane', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW());
      `, [`INV-RADIA-${purchaseId}`, b.userId, purchaseId, b.amount]);
    }

    // Commission 70%
    const commAmount = (parseFloat(b.amount) * 0.70).toFixed(2);
    const existingComm = await queryNeon("SELECT id FROM commissions WHERE purchase_id = $1 LIMIT 1;", [purchaseId]);
    if (existingComm.length === 0) {
      await queryNeon(`
        INSERT INTO commissions (coach_id, purchase_id, course_id, amount, currency, rate_percent, status, is_paid, created_at)
        VALUES ($1, $2, $3, $4, 'DZD', '70.00', 'pending', false, NOW() - INTERVAL '15 days');
      `, [coachId, purchaseId, b.courseId, commAmount]);
    }
  }

  console.log(`✅ Total des ventes enregistrées sur les cours de Radia : ${totalSales.toLocaleString("fr-DZ")} DZD`);

  // 7. Payouts : 1 virement déjà exécuté + 1 demande en attente
  console.log("\n7. Configuration des reversements (Payouts) de Radia Renane...");
  // Marquer une partie des commissions comme payées liées à un premier payout de 50 000 DZD
  const existingPayouts = await queryNeon("SELECT id FROM payouts WHERE coach_id = $1;", [coachId]);
  if (existingPayouts.length === 0) {
    const p1 = await queryNeon(`
      INSERT INTO payouts (
        coach_id, amount, currency, status, payment_method, reference_number, notes, processed_at, created_at, updated_at
      ) VALUES (
        $1, '50000.00', 'DZD', 'processed', 'bank_transfer', 'CCP-ALG-2026-98124', 'Virement d''honoraires pédagogiques exécuté vers compte CCP Radia Renane', NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'
      ) RETURNING id;
    `, [coachId]);

    // Lier les 4 premières commissions de Radia à ce payout
    const commsToSettle = await queryNeon("SELECT id FROM commissions WHERE coach_id = $1 AND is_paid = false LIMIT 4;", [coachId]);
    for (const c of commsToSettle) {
      await queryNeon("UPDATE commissions SET is_paid = true, status = 'paid', paid_at = NOW() - INTERVAL '10 days', payout_id = $1 WHERE id = $2;", [p1[0].id, c.id]);
    }

    // Insérer une demande en cours de 35 000 DZD
    await queryNeon(`
      INSERT INTO payouts (
        coach_id, amount, currency, status, payment_method, reference_number, notes, created_at, updated_at
      ) VALUES (
        $1, '35000.00', 'DZD', 'pending', 'baridimob', 'RIP: 00799999002138765432', 'Demande de retrait mensuel BaridiMob', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
      );
    `, [coachId]);
    console.log("✅ Payout historique (50 000 DZD traité) et demande en cours (35 000 DZD) créés avec succès !");
  }

  // 8. Calcul des totaux de commissions
  const [commSummary] = await queryNeon(`
    SELECT 
      COALESCE(SUM(amount), 0)::text as total,
      COALESCE(SUM(CASE WHEN is_paid = true THEN amount ELSE 0 END), 0)::text as paid,
      COALESCE(SUM(CASE WHEN is_paid = false THEN amount ELSE 0 END), 0)::text as pending
    FROM commissions 
    WHERE coach_id = $1;
  `, [coachId]);

  console.log(`💰 Synthèse financière Radia Renane :
     - Total commissions gagnées (70%) : ${parseFloat(commSummary.total).toLocaleString("fr-DZ")} DZD
     - Commissions déjà versées        : ${parseFloat(commSummary.paid).toLocaleString("fr-DZ")} DZD
     - Solde disponible en attente     : ${parseFloat(commSummary.pending).toLocaleString("fr-DZ")} DZD`);

  // 9. Avis élogieux des étudiantes
  console.log("\n8. Ajout des avis et notes des élèves (course_reviews)...");
  for (const cId of radiaCourseIds) {
    const existingRev = await queryNeon("SELECT id FROM course_reviews WHERE course_id = $1 AND user_id = 74 LIMIT 1;", [cId]);
    if (existingRev.length === 0) {
      await queryNeon(`
        INSERT INTO course_reviews (course_id, user_id, rating, comment, created_at)
        VALUES ($1, 74, 5, 'Excellente formation de Madame Radia Renane ! Les exemples sont 100% adaptés à l''Algérie, les explications sur Yalidine et BaridiMob m''ont permis de lancer ma boutique sans aucune erreur.', NOW() - INTERVAL '8 days');
      `, [cId]);
    }
  }

  // 10. Annonce de Radia
  console.log("\n9. Création d'une annonce officielle de la formatrice...");
  const existingAd = await queryNeon("SELECT id FROM announcements WHERE author_id = $1 LIMIT 1;", [coachId]);
  if (existingAd.length === 0) {
    await queryNeon(`
      INSERT INTO announcements (author_id, title, content, type, is_published, is_pinned, is_approved, created_at, updated_at)
      VALUES ($1, 'Session Live Spéciale : Analyse de vos campagnes Ads avec Radia', 'Chères apprenantes, ce jeudi à 20h00, nous organisons un webinaire interactif pour analyser vos boutiques et campagnes publicitaires en direct. Préparez vos liens et vos questions !', 'announcement', true, true, true, NOW() - INTERVAL '3 days', NOW());
    `, [coachId]);
    console.log("✅ Annonce publiée et épinglée");
  }

  // 11. Audit log
  await queryNeon(`
    INSERT INTO audit_logs (user_id, action, entity, entity_id, details, created_at)
    VALUES ($1, 'COACH_PORTFOLIO_INITIALIZED', 'user', $1, '{"message": "Affectation complète des formations, étudiantes, revenus et commissions pour Coach Radia Renane"}', NOW());
  `, [coachId]);

  console.log("\n=========================================================");
  console.log("🎉 CONFIGURATION RADIA RENANE TERMINÉE AVEC SUCCÈS !");
  console.log("=========================================================");
}

run().catch(console.error);
