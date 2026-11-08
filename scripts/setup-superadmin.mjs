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
  console.log("👑 CRÉATION DU COMPTE SUPERADMIN POUR LA PLATEFORME");
  console.log("=========================================================\n");

  const superadminEmail = "superadmin@tamayuz.dz";
  const superadminPassword = "SuperAdmin2026!";

  console.log(`1. Hachage sécurisé du mot de passe (${superadminPassword})...`);
  const passwordHash = await bcrypt.hash(superadminPassword, 10);

  console.log(`2. Création / mise à jour du Superadmin (${superadminEmail})...`);
  const existingDz = await queryNeon("SELECT * FROM users WHERE email = $1 LIMIT 1;", [superadminEmail]);

  let superadminUser;
  if (existingDz.length === 0) {
    const inserted = await queryNeon(
      `INSERT INTO users (name, email, password_hash, role, is_approved, phone, bio, domain, interests, avatar_url, created_at)
       VALUES ('Super Admin Tamayuz', $1, $2, 'admin', true, '+213 550 00 00 01',
               'Super Administrateur de la plateforme Tamayuz. Accès complet à la gouvernance globale, à la modération des formateurs, aux finances et à la traçabilité.',
               'Direction Générale', $3, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', NOW() - INTERVAL '30 days')
       RETURNING *;`,
      [superadminEmail, passwordHash, JSON.stringify(["Administration", "Gouvernance", "Analytics", "Audits"])]
    );
    superadminUser = inserted[0];
  } else {
    const updated = await queryNeon(
      `UPDATE users
       SET name = 'Super Admin Tamayuz',
           password_hash = $1,
           role = 'admin',
           is_approved = true,
           phone = '+213 550 00 00 01',
           bio = 'Super Administrateur de la plateforme Tamayuz. Accès complet à la gouvernance globale, à la modération des formateurs, aux finances et à la traçabilité.',
           domain = 'Direction Générale',
           interests = $2,
           avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80'
       WHERE email = $3
       RETURNING *;`,
      [passwordHash, JSON.stringify(["Administration", "Gouvernance", "Analytics", "Audits"]), superadminEmail]
    );
    superadminUser = updated[0];
  }
  console.log(`✔ Superadmin principal prêt : ID=${superadminUser.id}, Email=${superadminUser.email}`);

  // Mettre à jour également superadmin@tamayuz.com pour que les deux domaines (.dz et .com) fonctionnent
  console.log("\n3. Synchronisation du compte miroir (superadmin@tamayuz.com)...");
  await queryNeon(
    `UPDATE users
     SET password_hash = $1,
         role = 'admin',
         is_approved = true
     WHERE email = 'superadmin@tamayuz.com';`,
    [passwordHash]
  );
  console.log("✔ superadmin@tamayuz.com synchronisé avec le même mot de passe.");

  // Ajouter une entrée d'audit log
  console.log("\n4. Enregistrement dans les logs d'audit système...");
  await queryNeon(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address, created_at)
     VALUES ($1, 'SUPERADMIN_INITIALIZED', 'user', $2, $3, '127.0.0.1', NOW());`,
    [superadminUser.id, superadminUser.id, JSON.stringify({ email: superadminUser.email, role: "admin", access: "full_privileges" })]
  );
  console.log("✔ Entrée d'audit log créée.");

  console.log("\n=========================================================");
  console.log("🎉 COMPTE SUPERADMIN OPÉRATIONNEL AVEC SUCCÈS !");
  console.log("=========================================================");
  console.log("Email : superadmin@tamayuz.dz (ou superadmin@tamayuz.com)");
  console.log("Mot de passe : SuperAdmin2026!");
  console.log("Rôle : admin (Super Administrateur)");
  console.log("Permissions : Accès total à toutes les sections d'administration");
  console.log("=========================================================");
}

run().catch((err) => {
  console.error("❌ ERREUR :", err);
  process.exit(1);
});
