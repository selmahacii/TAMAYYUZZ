import worker from "../worker.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName} - Details: ${details}`);
    failedTests++;
  }
}

async function runE2ETests() {
  console.log("================================================================");
  console.log("SUITE DE TESTS E2E : CATEGORIES DYNAMIQUES & CIBLAGE PAR PAYS");
  console.log("Plateforme Tamayuz - Production Cloudflare Worker & Neon DB");
  console.log("================================================================\n");

  // ----------------------------------------------------------------
  // TEST 1 : Categories Dynamiques Publiques
  // ----------------------------------------------------------------
  console.log("--- ETAPE 1 : Verification des categories dynamiques ---");
  const catRes = await simulateRequest("/api/courses/categories", "GET");
  assert(catRes.status === 200, "GET /api/courses/categories retourne le statut HTTP 200");
  assert(Array.isArray(catRes.data), "La reponse des categories est bien une liste", JSON.stringify(catRes.data));
  assert(catRes.data.length >= 6, "Au moins 6 categories fondamentales sont declarees", `Trouve ${catRes.data.length}`);
  assert(catRes.data.includes("Finance"), "La categorie Finance est disponible dans la liste");
  assert(catRes.data.includes("Technology"), "La categorie Technology est disponible dans la liste");
  assert(catRes.data.includes("Marketing"), "La categorie Marketing est disponible dans la liste");
  console.log(`[INFO] Categories detectees : ${catRes.data.join(", ")}\n`);

  // ----------------------------------------------------------------
  // TEST 2 : Filtrage Pédagogique par Pays (Marketplace / Catalogue)
  // ----------------------------------------------------------------
  console.log("--- ETAPE 2 : Filtrage par pays cible sur le catalogue public ---");
  
  // 2.a : Filtre Algerie (dz)
  const dzRes = await simulateRequest("/api/courses?country=dz", "GET");
  assert(dzRes.status === 200, "GET /api/courses?country=dz retourne HTTP 200");
  assert(Array.isArray(dzRes.data), "Les cours filtres pour l'Algerie forment un tableau valide");
  const allDzMatch = dzRes.data.every((c) => {
    const cCountry = (c.country || "dz").toLowerCase();
    return cCountry === "dz" || cCountry === "all";
  });
  assert(allDzMatch, "Tous les cours renvoyes pour dz sont strictement cibles 'dz' ou 'all'");
  console.log(`[INFO] Nombre de cours accessibles pour l'Algerie (dz) : ${dzRes.data.length}`);

  // 2.b : Filtre Arabie Saoudite (sa)
  const saRes = await simulateRequest("/api/courses?country=sa", "GET");
  assert(saRes.status === 200, "GET /api/courses?country=sa retourne HTTP 200");
  const allSaMatch = saRes.data.every((c) => {
    const cCountry = (c.country || "dz").toLowerCase();
    return cCountry === "sa" || cCountry === "all";
  });
  assert(allSaMatch, "Tous les cours renvoyes pour sa sont strictement cibles 'sa' ou 'all'");
  console.log(`[INFO] Nombre de cours accessibles pour l'Arabie Saoudite (sa) : ${saRes.data.length}`);

  // 2.c : Filtre Global (all)
  const allRes = await simulateRequest("/api/courses?country=all", "GET");
  assert(allRes.status === 200, "GET /api/courses?country=all retourne HTTP 200");
  assert(allRes.data.length >= dzRes.data.length, "Le catalogue global 'all' contient au moins autant de cours que le filtre specifique 'dz'");
  console.log(`[INFO] Nombre total de cours dans le catalogue global : ${allRes.data.length}\n`);

  // ----------------------------------------------------------------
  // TEST 3 : Authentification Coach & Creation avec Pays et Categorie Personnalisee
  // ----------------------------------------------------------------
  console.log("--- ETAPE 3 : Cycle de vie Formateur (Creation avec pays et categorie dynamique) ---");
  
  const coachLogin = await simulateRequest("/api/auth/login", "POST", {}, {
    email: "renaneradia@gmail.com",
    password: "Radia2026!",
  });
  assert(coachLogin.status === 200 && !!coachLogin.data.token, "Authentification reussie du compte Formateur (Coach Radia Renane)");
  const coachToken = coachLogin.data.token;
  const coachHeaders = { Authorization: `Bearer ${coachToken}` };

  // Creation du cours E2E
  const customCategoryName = "Intelligence Artificielle E2E";
  const newCoursePayload = {
    title: "Formation Avancee en Neuro-IA et Data",
    subtitle: "Cycle certifiant specialise pour chercheurs et praticiens",
    description: "Programme rigoureux destine a approfondir les methodologies contemporaines.",
    category: customCategoryName,
    country: "sa", // Cible Arabie Saoudite
    level: "advanced",
    durationHours: 24,
    price: "7500",
    currency: "DZD",
    isFree: false,
    isPublished: false,
    tags: ["E2E", "IA", "Recherche"],
  };

  const createCourseRes = await simulateRequest("/api/courses", "POST", coachHeaders, newCoursePayload);
  assert(createCourseRes.status === 201, "POST /api/courses cree la formation avec HTTP 201", JSON.stringify(createCourseRes.data));
  const createdCourse = createCourseRes.data;
  const courseId = createdCourse.id;
  assert(typeof courseId === "number", "L'identifiant du cours genere est un nombre valide");
  assert(createdCourse.country === "sa", "Le pays cible enregistre est bien 'sa'", `Recu : ${createdCourse.country}`);
  assert(createdCourse.category === customCategoryName, "La categorie enregistree est bien celle personnalisee", createdCourse.category);

  // Verifier consultation unitaire
  const getDetailRes = await simulateRequest(`/api/courses/${courseId}`, "GET");
  assert(getDetailRes.status === 200, `GET /api/courses/${courseId} retourne HTTP 200`);
  assert(getDetailRes.data.country === "sa", "La consultation unitaire du cours renvoie le pays cible 'sa'");

  // Verifier que la categorie apparait dynamiquement dans /api/courses/categories
  // Noter : le cours n'est pas encore publie, publions-le pour verifier la propagation
  console.log("\n--- ETAPE 4 : Mise a jour du ciblage pays et publication ---");
  const updatePayload = {
    ...newCoursePayload,
    isPublished: true,
    country: "all", // Modification vers international
  };

  const updateRes = await simulateRequest(`/api/courses/${courseId}`, "PUT", coachHeaders, updatePayload);
  console.log("[DEBUG] updateRes status:", updateRes.status, "data:", JSON.stringify(updateRes.data));
  assert(updateRes.status === 200, `PUT /api/courses/${courseId} met a jour le cours avec HTTP 200`, JSON.stringify(updateRes.data));
  assert(updateRes.data.country === "all", "Le pays cible est desormais mis a jour a 'all'");
  assert(updateRes.data.isPublished === true, "Le statut du cours est desormais publie");

  // Re-verification des categories apres publication
  const catAfterPub = await simulateRequest("/api/courses/categories", "GET");
  assert(catAfterPub.data.includes(customCategoryName), `La categorie personnalisee '${customCategoryName}' est decouverte dynamiquement`);

  // Verification que le cours apparait dans le filtre dz car il cible 'all'
  const dzWithAllRes = await simulateRequest("/api/courses?country=dz", "GET");
  const foundInDz = dzWithAllRes.data.some((c) => c.id === courseId);
  assert(foundInDz, "Le cours ciblant 'all' est bien visible dans le catalogue filtre pour 'dz'");

  // ----------------------------------------------------------------
  // ETAPE 5 : Nettoyage du cours de test
  // ----------------------------------------------------------------
  console.log("\n--- ETAPE 5 : Nettoyage du cours de test ---");
  const deleteRes = await simulateRequest(`/api/courses/${courseId}`, "DELETE", coachHeaders);
  assert(deleteRes.status === 200, `DELETE /api/courses/${courseId} supprime le cours de test avec succes`);

  // ----------------------------------------------------------------
  // ETAPE 6 : Controle d'Integrite des Fichiers et Assets Frontend
  // ----------------------------------------------------------------
  console.log("\n--- ETAPE 6 : Verification de l'integrite du bundle frontend ---");
  const distDir = path.resolve(__dirname, "../artifacts/smart-training/dist/public");
  const indexPath = path.join(distDir, "index.html");
  assert(fs.existsSync(indexPath), "Le fichier dist/public/index.html existe bien");
  const indexHtml = fs.readFileSync(indexPath, "utf-8");
  assert(indexHtml.includes("<!DOCTYPE html>"), "index.html possede une structure HTML5 valide");
  assert(indexHtml.includes("/assets/index-"), "index.html reference les bundles d'actifs compiles");

  const assetsDir = path.join(distDir, "assets");
  assert(fs.existsSync(assetsDir), "Le repertoire dist/public/assets existe bien");
  const assetFiles = fs.readdirSync(assetsDir);
  const hasJsBundle = assetFiles.some((f) => f.startsWith("index-") && f.endsWith(".js"));
  const hasCssBundle = assetFiles.some((f) => f.startsWith("index-") && f.endsWith(".css"));
  assert(hasJsBundle, "Le bundle JavaScript de production est present", assetFiles.join(", "));
  assert(hasCssBundle, "Le bundle CSS de production est present", assetFiles.join(", "));

  // ----------------------------------------------------------------
  // BILAN DES TESTS
  // ----------------------------------------------------------------
  console.log("\n================================================================");
  console.log(`BILAN DES TESTS E2E : ${passedTests} SUCCES / ${failedTests} ECHECS`);
  console.log("================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error("Erreur inattendue durant les tests E2E :", err);
  process.exit(1);
});
