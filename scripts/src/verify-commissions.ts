import { db } from "@workspace/db";
import { commissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function verifyManualCommission() {
  console.log("================================================");
  console.log("🔍 Verifying Manual Commission Creation & Deletion");
  console.log("================================================");

  const token = await login("superadmin@tamayuz.com", "Admin@2026!");
  
  // 1. Get coach users
  console.log("\n[1] Fetching registered users...");
  const users = await request("/admin/users", "GET", null, token);
  const coach = users.find((u: any) => u.role === "coach");
  if (!coach) {
    throw new Error("No coach user found in database to link commission to");
  }
  console.log(`✔ Found target coach: "${coach.name}" (Email: ${coach.email}, ID: ${coach.id})`);

  // 2. Create Manual Commission
  console.log("\n[2] Testing POST manual commission creation...");
  const payload = {
    coachId: coach.id,
    amount: 7500,
    ratePercent: 75,
    isPaid: false,
    notes: "Commission manuelle de test"
  };

  const created = await request("/admin/commissions", "POST", payload, token);
  console.log(`✔ Manual commission created successfully!`);
  console.log(`✔ Amount: ${created.amount} DZD (Rate: ${created.ratePercent}%)`);
  console.log(`✔ Coach: "${created.coachName}" (Expected: "${coach.name}")`);

  // 3. Delete Manual Commission
  console.log("\n[3] Testing DELETE manual commission removal...");
  const deleteResult = await request(`/admin/commissions/${created.id}`, "DELETE", null, token);
  console.log(`✔ Delete response message: "${deleteResult.message}"`);

  // Double check deletion in DB
  const [dbRecord] = await db.select().from(commissionsTable).where(eq(commissionsTable.id, created.id));
  if (!dbRecord) {
    console.log("✔ Commission verified deleted from database!");
  } else {
    throw new Error("Commission was not deleted from database");
  }

  console.log("\n================================================");
  console.log("🎉 MANUAL COMMISSIONS API AND ACTIONS VERIFIED OK!");
  console.log("================================================");
}

async function request(endpoint: string, method: string, body: any = null, token: string | null = null): Promise<any> {
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
  const data: any = await res.json();
  return data.token;
}

verifyManualCommission().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
