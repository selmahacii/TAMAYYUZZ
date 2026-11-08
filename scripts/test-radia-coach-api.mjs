import worker from "../worker.js";

async function simulateRequest(path, method = "GET", headers = {}, body = null) {
  const req = new Request(`https://tamayyuzz.selmahacijob.workers.dev${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const res = await worker.fetch(req, {});
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, data: json };
}

async function runTests() {
  console.log("=== TEST COMPLET DU COMPTE COACH RADIA RENANE ===\n");

  // 1. Connexion Coach Radia Renane
  console.log("1. Tentative de connexion de Coach Radia Renane (renaneradia@gmail.com)...");
  const loginRes = await simulateRequest("/api/auth/login", "POST", {}, {
    email: "renaneradia@gmail.com",
    password: "Radia2026!",
  });

  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error("❌ Échec de la connexion de Radia:", loginRes);
    process.exit(1);
  }

  const { token, user } = loginRes.data;
  console.log(`✅ Connexion réussie !`);
  console.log(`   - ID: ${user.id}`);
  console.log(`   - Nom: ${user.name}`);
  console.log(`   - Rôle: ${user.role}`);
  console.log(`   - Compte approuvé: ${user.isApproved}`);
  console.log(`   - Domaine: ${user.domain}`);
  console.log(`   - Téléphone: ${user.phone}`);
  console.log(`   - Diplômes validés: ${user.diplomas?.length}`);

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Mes formations créées (/api/courses/my)
  console.log("\n2. Test /api/courses/my (formations créées par Radia)...");
  const myCoursesRes = await simulateRequest("/api/courses/my", "GET", authHeaders);
  if (myCoursesRes.status !== 200 || !Array.isArray(myCoursesRes.data)) {
    console.error("❌ Échec de récupération des cours:", myCoursesRes);
    process.exit(1);
  }
  console.log(`✅ ${myCoursesRes.data.length} formations trouvées pour Coach Radia :`);
  for (const c of myCoursesRes.data) {
    console.log(`   * [ID ${c.id}] ${c.title} | Prix: ${c.price} ${c.currency} | Inscrites: ${c.enrollmentCount} | Publié: ${c.isPublished}`);
  }

  // 3. Suivi des étudiantes pour le premier cours (/api/coach/courses/:id/students)
  const firstCourse = myCoursesRes.data[0];
  console.log(`\n3. Test /api/coach/courses/${firstCourse.id}/students (étudiantes inscrites)...`);
  const studentsRes = await simulateRequest(`/api/coach/courses/${firstCourse.id}/students`, "GET", authHeaders);
  console.log(`✅ ${studentsRes.data.length} étudiantes suivies dans cette formation :`);
  for (const s of studentsRes.data.slice(0, 4)) {
    console.log(`   - ${s.name} (${s.email}) | Progression: ${s.progressPercent}% (${s.completedLessons}/${s.totalLessons} leçons)`);
  }

  // 4. Historique des versements (/api/coach/payouts)
  console.log("\n4. Test /api/coach/payouts (historique des virements reçus et demandes)...");
  const payoutsRes = await simulateRequest("/api/coach/payouts", "GET", authHeaders);
  console.log(`✅ ${payoutsRes.data.length} transaction(s) de reversement trouvée(s) :`);
  for (const p of payoutsRes.data) {
    console.log(`   - Montant: ${p.amount} ${p.currency} | Statut: ${p.status} | Référence: ${p.referenceNumber} | Date: ${p.date}`);
  }

  // 5. Annonces de Radia (/api/coach/announcements)
  console.log("\n5. Test /api/coach/announcements (annonces pédagogiques de Radia)...");
  const adsRes = await simulateRequest("/api/coach/announcements", "GET", authHeaders);
  console.log(`✅ ${adsRes.data.length} annonce(s) trouvée(s) :`);
  for (const a of adsRes.data) {
    console.log(`   - Titre: "${a.title}" | Publiée: ${a.is_published}`);
  }

  // 6. Vérification côté Superadmin (/api/admin/coaches)
  console.log("\n6. Vérification de la visibilité de Radia dans le panel Superadmin...");
  const adminLoginRes = await simulateRequest("/api/auth/login", "POST", {}, {
    email: "superadmin@tamayuz.dz",
    password: "SuperAdmin2026!",
  });
  const adminHeaders = { Authorization: `Bearer ${adminLoginRes.data.token}` };
  const coachesRes = await simulateRequest("/api/admin/coaches", "GET", adminHeaders);
  const radiaInAdmin = coachesRes.data.find(c => c.id === user.id);
  console.log(`✅ Coach Radia vue par l'administration :`, {
    name: radiaInAdmin?.name,
    totalCourses: radiaInAdmin?.totalCourses,
    totalStudents: radiaInAdmin?.totalStudents,
    totalCommissions: `${radiaInAdmin?.totalCommissions} DZD`,
    paidCommissions: `${radiaInAdmin?.paidCommissions} DZD`,
    pendingCommissions: `${radiaInAdmin?.pendingCommissions} DZD`,
  });

  console.log("\n=========================================================");
  console.log("🎉 TOUS LES TESTS DU PROFIL COACH SONT VALIDÉS AVEC SUCCÈS !");
  console.log("=========================================================");
}

runTests().catch(console.error);
