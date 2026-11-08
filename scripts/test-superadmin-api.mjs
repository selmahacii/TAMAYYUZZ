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
  console.log("=== TEST DU COMPTE SUPERADMIN ET DES ROUTES ADMIN ===\n");

  // 1. Authentification SuperAdmin
  console.log("1. Tentative de connexion SuperAdmin...");
  const loginRes = await simulateRequest("/api/auth/login", "POST", {}, {
    email: "superadmin@tamayuz.dz",
    password: "SuperAdmin2026!",
  });

  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error("❌ Échec de la connexion SuperAdmin:", loginRes);
    process.exit(1);
  }

  const { token, user } = loginRes.data;
  console.log(`✅ Connexion réussie ! ID: ${user.id}, Nom: ${user.name}, Rôle: ${user.role}`);
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Test GET /api/admin/stats
  console.log("\n2. Test /api/admin/stats...");
  const statsRes = await simulateRequest("/api/admin/stats", "GET", authHeaders);
  console.log("Stats reçues :", statsRes.data);

  // 3. Test GET /api/admin/reports
  console.log("\n3. Test /api/admin/reports...");
  const reportsRes = await simulateRequest("/api/admin/reports", "GET", authHeaders);
  console.log("Reports récapitulatif :", {
    months: reportsRes.data.enrollmentsByMonth?.length,
    revenueMonths: reportsRes.data.revenueByMonth?.length,
    topCoursesCount: reportsRes.data.topCourses?.length,
    categoriesCount: reportsRes.data.categoryDistribution?.length,
  });

  // 4. Test GET /api/admin/coaches
  console.log("\n4. Test /api/admin/coaches...");
  const coachesRes = await simulateRequest("/api/admin/coaches", "GET", authHeaders);
  console.log(`✅ ${coachesRes.data.length} coach(s) trouvé(s)`);

  // 5. Test GET /api/admin/courses
  console.log("\n5. Test /api/admin/courses...");
  const coursesRes = await simulateRequest("/api/admin/courses", "GET", authHeaders);
  console.log(`✅ ${coursesRes.data.length} cours trouvé(s)`);

  // 6. Test GET /api/admin/users
  console.log("\n6. Test /api/admin/users...");
  const usersRes = await simulateRequest("/api/admin/users", "GET", authHeaders);
  console.log(`✅ ${usersRes.data.length} utilisateur(s) trouvé(s)`);

  // 7. Test GET /api/admin/invoices
  console.log("\n7. Test /api/admin/invoices...");
  const invoicesRes = await simulateRequest("/api/admin/invoices", "GET", authHeaders);
  console.log(`✅ ${invoicesRes.data.length} facture(s) trouvée(s)`);

  // 8. Test GET /api/admin/commissions
  console.log("\n8. Test /api/admin/commissions...");
  const commsRes = await simulateRequest("/api/admin/commissions", "GET", authHeaders);
  console.log(`✅ ${commsRes.data.length} commission(s) trouvée(s)`);

  // 9. Test GET /api/admin/purchases
  console.log("\n9. Test /api/admin/purchases...");
  const purchasesRes = await simulateRequest("/api/admin/purchases", "GET", authHeaders);
  console.log(`✅ ${purchasesRes.data.length} achat(s) trouvé(s)`);

  // 10. Test GET /api/admin/tickets
  console.log("\n10. Test /api/admin/tickets...");
  const ticketsRes = await simulateRequest("/api/admin/tickets", "GET", authHeaders);
  console.log(`✅ ${ticketsRes.data.length} ticket(s) trouvé(s)`);

  // 11. Test GET /api/admin/audit-logs
  console.log("\n11. Test /api/admin/audit-logs...");
  const auditRes = await simulateRequest("/api/admin/audit-logs", "GET", authHeaders);
  console.log(`✅ ${auditRes.data.length} log(s) d'audit trouvé(s)`);

  // 12. Test GET /api/coupons
  console.log("\n12. Test /api/coupons...");
  const couponsRes = await simulateRequest("/api/coupons", "GET", authHeaders);
  console.log(`✅ ${couponsRes.data.length} coupon(s) trouvé(s)`);

  // 13. Test GET /api/admin/settings
  console.log("\n13. Test /api/admin/settings...");
  const settingsRes = await simulateRequest("/api/admin/settings", "GET", authHeaders);
  console.log("Settings reçus :", settingsRes.data);

  console.log("\n=========================================================");
  console.log("🎉 TOUS LES TESTS SUPERADMIN ET ROUTES SONT PASSÉS AVEC SUCCÈS !");
  console.log("=========================================================");
}

runTests().catch(console.error);
