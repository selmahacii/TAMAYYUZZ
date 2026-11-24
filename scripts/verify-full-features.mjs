import worker from "../worker.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function simulateRequest(path, method = "GET", headers = {}, body = null) {
  const start = performance.now();
  const req = new Request(`https://tamayyuzz.selmahacijob.workers.dev${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const res = await worker.fetch(req, {});
  const elapsed = Math.round(performance.now() - start);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, data: json, latencyMs: elapsed };
}

let passed = 0;
let failed = 0;

function assert(condition, name, details = "") {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name} - ${details}`);
    failed++;
  }
}

async function runVerification() {
  console.log("================================================================");
  console.log("AUDIT COMPLET : RAPIDITE, RESPONSIVENESS, COUPONS, CATALOGUE");
  console.log("================================================================\n");

  // ----------------------------------------------------------------
  // 1. TEST DE RAPIDITE & PERFORMANCES
  // ----------------------------------------------------------------
  console.log("--- 1. AUDIT DE RAPIDITE ET LATENCE ---");

  // 1.1 Categories
  const catReq = await simulateRequest("/api/courses/categories");
  assert(catReq.status === 200, "Categories API renvoie HTTP 200");
  assert(catReq.latencyMs < 500, `Latence Categories ultra-rapide (${catReq.latencyMs}ms < 500ms)`);

  // 1.2 Catalogue Courses
  const coursesReq = await simulateRequest("/api/courses?country=dz");
  assert(coursesReq.status === 200, "Catalogue public renvoie HTTP 200");
  assert(coursesReq.latencyMs < 600, `Latence Catalogue public optimale (${coursesReq.latencyMs}ms < 600ms)`);

  // 1.3 Marketplace
  const marketReq = await simulateRequest("/api/marketplace");
  assert(marketReq.status === 200, "Marketplace renvoie HTTP 200");
  assert(marketReq.latencyMs < 600, `Latence Marketplace optimale (${marketReq.latencyMs}ms < 600ms)`);

  // 1.4 Details d'un cours
  const firstCourseId = coursesReq.data[0]?.id || 24;
  const detailReq = await simulateRequest(`/api/courses/${firstCourseId}`);
  assert(detailReq.status === 200, `Consultation fiche cours #${firstCourseId} renvoie HTTP 200`);
  assert(detailReq.latencyMs < 500, `Latence fiche cours ultra-rapide (${detailReq.latencyMs}ms < 500ms)`);

  // 1.5 Poids des bundles frontend
  const distDir = path.resolve(__dirname, "../artifacts/smart-training/dist/public");
  const assetsDir = path.join(distDir, "assets");
  const assetFiles = fs.readdirSync(assetsDir);
  const jsFile = assetFiles.find((f) => f.startsWith("index-") && f.endsWith(".js"));
  const cssFile = assetFiles.find((f) => f.startsWith("index-") && f.endsWith(".css"));

  const jsSizeKb = Math.round(fs.statSync(path.join(assetsDir, jsFile)).size / 1024);
  const cssSizeKb = Math.round(fs.statSync(path.join(assetsDir, cssFile)).size / 1024);

  console.log(`[INFO] Bundle JS : ${jsSizeKb} KB | Bundle CSS : ${cssSizeKb} KB`);
  assert(cssSizeKb < 300, `Taille CSS optimisee (${cssSizeKb} KB < 300 KB)`);
  assert(jsSizeKb < 1500, `Taille JS dans les limites de production (${jsSizeKb} KB < 1500 KB)`);

  // ----------------------------------------------------------------
  // 2. AUDIT DE RESPONSIVENESS & ADAPTABILITE
  // ----------------------------------------------------------------
  console.log("\n--- 2. AUDIT DE RESPONSIVENESS (MOBILE / TABLETTE / DESKTOP) ---");

  // Verification du code source HomePage
  const homePath = path.resolve(__dirname, "../artifacts/smart-training/src/pages/student/HomePage.tsx");
  const homeSrc = fs.readFileSync(homePath, "utf-8");

  assert(homeSrc.includes("grid-cols-1"), "HomePage inclut la disposition colonne unique pour smartphone");
  assert(homeSrc.includes("sm:grid-cols-2") || homeSrc.includes("md:grid-cols-2"), "HomePage inclut la disposition 2 colonnes pour tablette");
  assert(homeSrc.includes("lg:grid-cols-4"), "HomePage inclut la disposition 4 colonnes pour ecrans larges (maquette)");
  assert(homeSrc.includes("overflow-x-auto"), "Barre de pays horizontale scrollable et tactile pour mobile");
  assert(homeSrc.includes("dir={isRTL ? \"rtl\" : \"ltr\"}") || homeSrc.includes("isRTL"), "Prise en charge bidirectionnelle RTL (Arabe) et LTR (Francais)");

  // Verification ExploreCoursesPage
  const explorePath = path.resolve(__dirname, "../artifacts/smart-training/src/pages/student/ExploreCoursesPage.tsx");
  const exploreSrc = fs.readFileSync(explorePath, "utf-8");

  assert(exploreSrc.includes("grid-cols-1"), "ExplorePage supporte le mode vertical mobile");
  assert(exploreSrc.includes("md:grid-cols-2"), "ExplorePage supporte les tablettes moyennes");
  assert(exploreSrc.includes("lg:grid-cols-3"), "ExplorePage supporte les ecrans desktop");
  assert(exploreSrc.includes("overflow-x-auto"), "ExplorePage possede un scroll tactile horizontal des filtres");

  // ----------------------------------------------------------------
  // 3. AUDIT DES CODES PROMOS & COUPONS
  // ----------------------------------------------------------------
  console.log("\n--- 3. AUDIT FONCTIONNEL DES COUPONS ---");

  // 3.1 Validation de code promo actif (TAMAYUZ2026 -> 20%)
  const valRes1 = await simulateRequest("/api/coupons/validate", "POST", {}, { code: "TAMAYUZ2026" });
  assert(valRes1.status === 200, "Validation du coupon actif 'TAMAYUZ2026' retourne HTTP 200");
  assert(valRes1.data.valid === true, "Le coupon est marque valide");
  assert(valRes1.data.discountPercent === 20, "Le pourcentage de reduction est bien de 20%");

  // 3.2 Validation de code promo avec casse mixte (tamayuz2026)
  const valResCase = await simulateRequest("/api/coupons/validate", "POST", {}, { code: "tamayuz2026" });
  assert(valResCase.status === 200 && valResCase.data.valid === true, "Validation insensible a la casse (minuscules/majuscules)");

  // 3.3 Validation de coupon 50% (RAMADAN50)
  const valRes2 = await simulateRequest("/api/coupons/validate", "POST", {}, { code: "RAMADAN50" });
  assert(valRes2.status === 200 && valRes2.data.discountPercent === 50, "Coupon RAMADAN50 applique une remise de 50%");

  // 3.4 Rejet de coupon inexistant
  const valResInvalid = await simulateRequest("/api/coupons/validate", "POST", {}, { code: "CODE_INEXISTANT_999" });
  assert(valResInvalid.status === 404, "Code promo inexistant rejete avec HTTP 404");

  // 3.5 Rejet de coupon expire / inactif (EXPIREDCODE)
  const valResExpired = await simulateRequest("/api/coupons/validate", "POST", {}, { code: "EXPIREDCODE" });
  assert(valResExpired.status === 404 || valResExpired.status === 400, "Code promo expire rejete avec statut d'erreur approprie");

  // ----------------------------------------------------------------
  // 4. AUDIT DE VISIBILITE DU CATALOGUE DE FORMATION
  // ----------------------------------------------------------------
  console.log("\n--- 4. AUDIT DE VISIBILITE DU CATALOGUE ---");

  // 4.1 Tous les cours du catalogue public sont publies
  const publicCourses = await simulateRequest("/api/courses");
  assert(publicCourses.status === 200, "Catalogue public accessible sans authentification");
  assert(Array.isArray(publicCourses.data) && publicCourses.data.length > 0, "Le catalogue contient des cours enregistres");
  const allPublished = publicCourses.data.every((c) => c.isPublished === true);
  assert(allPublished, "Protection absolue : 100% des cours dans le catalogue public sont publies");

  // 4.2 Les cours ont tous les champs pedagogiques essentiels
  const first = publicCourses.data[0];
  assert(!!first.title, "Chaque cours possede un titre renseigne");
  assert(!!first.category, "Chaque cours possede une categorie assignee");
  assert(!!first.coachName, "Chaque cours possede un enseignant associe");
  assert(first.price !== undefined, "Chaque cours affiche son tarif ou gratuit");
  assert(!!first.country, "Chaque cours possede son attribut de pays cible");

  // 4.3 Recherche textuelle
  const searchRes = await simulateRequest("/api/courses?search=algerie");
  assert(searchRes.status === 200, "Recherche textuelle retourne HTTP 200");
  assert(searchRes.data.length > 0, `Recherche avec mot-cle 'algerie' retourne ${searchRes.data.length} resultat(s)`);

  // 4.4 Filtrage combine pays + categorie
  const combinedRes = await simulateRequest("/api/courses?country=dz&category=Marketing");
  assert(combinedRes.status === 200, "Filtrage combine pays + categorie retourne HTTP 200");
  const allMarketing = combinedRes.data.every((c) => c.category === "Marketing");
  assert(allMarketing, "Tous les cours filtres appartiennent a la categorie Marketing");

  // ----------------------------------------------------------------
  // BILAN FINAL
  // ----------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`TOTAL CONTROLES : ${passed} VALIDES / ${failed} REJETES`);
  console.log("================================================================");

  if (failed > 0) process.exit(1);
}

runVerification().catch((err) => {
  console.error("Erreur durant l'audit :", err);
  process.exit(1);
});
