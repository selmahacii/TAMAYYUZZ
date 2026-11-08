const NEON_HOST = "ep-spring-mode-ba1olrfk.c-8.eu-central-1.aws.neon.tech";
const NEON_CONN = "postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function queryNeon(sql, params = [], retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
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
    } catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
}

async function run() {
  console.log("=========================================================");
  console.log("🏷️ CONFIGURATION DES VRAIES CATÉGORIES EN PRODUCTION");
  console.log("=========================================================\n");

  // Vider les anciennes catégories vides
  console.log("1. Nettoyage des anciennes catégories sans description...");
  await queryNeon("DELETE FROM categories;");

  // Insérer les vraies catégories professionnelles avec descriptions riches
  console.log("2. Insertion des vraies catégories avec descriptions...");
  const realCategories = [
    {
      name: "Marketing",
      description: "Stratégie publicitaire Meta & TikTok Ads, acquisition client ciblée dans les 58 Wilayas et growth marketing.",
    },
    {
      name: "Technology",
      description: "Développement web fullstack moderne (React, TypeScript, Node.js), architecture logicielle et programmation.",
    },
    {
      name: "Entrepreneuriat",
      description: "Création et gestion d'entreprise, sourcing produits locaux (El Hamiz, Semmar), logistique Yalidine et encaissement BaridiMob.",
    },
    {
      name: "Design",
      description: "UI/UX Design professionnel, maquettage et prototypage interactif sur Figma, design system et ergonomie produit.",
    },
    {
      name: "Finance",
      description: "Comptabilité pratique, fiscalité algérienne (G50, bilan comptable), facturation conforme et gestion de trésorerie.",
    },
    {
      name: "Business",
      description: "Leadership, négociation commerciale, prospection B2B, management stratégique et développement d'affaires.",
    },
    {
      name: "Communication",
      description: "Prise de parole en public, relations presse, communication de crise et personal branding sur les réseaux professionnels.",
    },
  ];

  for (const cat of realCategories) {
    const inserted = await queryNeon(
      `INSERT INTO categories (name, description, created_at) VALUES ($1, $2, NOW()) RETURNING id, name;`,
      [cat.name, cat.description]
    );
    console.log(`✅ Catégorie ajoutée : [ID ${inserted[0].id}] ${inserted[0].name}`);
  }

  // 3. Harmonisation des catégories des cours
  console.log("\n3. Harmonisation des catégories des formations existantes...");
  await queryNeon("UPDATE courses SET category = 'Technology' WHERE id IN (15, 16);");
  await queryNeon("UPDATE courses SET category = 'Marketing' WHERE id IN (17, 21);");
  await queryNeon("UPDATE courses SET category = 'Design' WHERE id = 18;");
  await queryNeon("UPDATE courses SET category = 'Finance' WHERE id = 19;");
  await queryNeon("UPDATE courses SET category = 'Entrepreneuriat' WHERE id IN (20, 22);");

  // 4. Vérification de la distribution par catégorie
  const distribution = await queryNeon(`
    SELECT category, count(*)::int as count 
    FROM courses 
    WHERE is_published = true 
    GROUP BY category 
    ORDER BY count DESC;
  `);

  console.log("\n📊 Distribution réelle des cours par catégorie :");
  for (const d of distribution) {
    console.log(`   - ${d.category} : ${d.count} formation(s) publiée(s)`);
  }

  console.log("\n=========================================================");
  console.log("🎉 CONFIGURATION DES CATÉGORIES RÉELLES TERMINÉE !");
  console.log("=========================================================");
}

run().catch(console.error);
