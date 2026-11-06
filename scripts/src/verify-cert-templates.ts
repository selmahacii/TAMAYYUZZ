import { db } from "@workspace/db";
import { certificateTemplatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function verifyCertificateTemplates() {
  console.log("================================================");
  console.log("🔍 Verifying Certificate Templates & Packed Config");
  console.log("================================================");

  const token = await login("superadmin@tamayuz.com", "Admin@2026!");
  
  // 1. Create Certificate Template with packed JSON metadata
  console.log("\n[1] Testing POST certificate template with packed config...");
  const packedMetadata = JSON.stringify({
    descText: "Template professionnel de test",
    fontFamily: "serif",
    watermarkPattern: "grid",
    leftSignatureTitle: "Directeur Académique",
    rightSignatureTitle: "Lead Coach",
    customTitleText: "CERTIFICAT DE REUSSITE PROFESSIONNELLE"
  });

  const payload = {
    name: "Modèle Cert Test " + Date.now().toString().slice(-4),
    description: packedMetadata,
    primaryColor: "#000000",
    accentColor: "#ffd700",
    logoUrl: "https://tamayuz.com/logo.png",
    backgroundUrl: "layout:modern_minimalist",
    isDefault: false
  };

  const created = await request("/admin/certificate-templates", "POST", payload, token);
  console.log(`✔ Certificate template created successfully! ID: ${created.id}`);
  console.log(`✔ Name: "${created.name}"`);
  console.log(`✔ Layout: "${created.backgroundUrl}"`);

  // Unpack description to verify payload integrity
  const config = JSON.parse(created.description);
  console.log(`✔ Packed Title Text: "${config.customTitleText}"`);
  console.log(`✔ Packed Left Sign Title: "${config.leftSignatureTitle}"`);
  console.log(`✔ Packed Right Sign Title: "${config.rightSignatureTitle}"`);

  if (config.leftSignatureTitle !== "Directeur Académique") {
    throw new Error("Packed metadata mismatch");
  }

  // 2. Clean up from Database
  console.log("\n[2] Cleaning up test template from database...");
  await db.delete(certificateTemplatesTable).where(eq(certificateTemplatesTable.id, created.id));
  console.log(`✔ Template ID ${created.id} deleted successfully.`);

  console.log("\n================================================");
  console.log("🎉 CERTIFICATE TEMPLATE API & PACKED CONFIG OK!");
  console.log("================================================");
}

async function request(endpoint: string, method: string, body: any = null, token: string | null = null) {
  const headers: any = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  const options: any = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`http://localhost:3000/api${endpoint}`, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API Error [${method} ${endpoint}]: ${res.status} - ${txt}`);
  }
  return res.json();
}

async function login(email: string, password: string): Promise<string> {
  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  return data.token;
}

verifyCertificateTemplates().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
