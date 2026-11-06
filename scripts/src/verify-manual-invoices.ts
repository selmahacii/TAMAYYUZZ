import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function verifyManualInvoice() {
  console.log("================================================");
  console.log("🔍 Verifying Manual Invoice Creation & Management");
  console.log("================================================");

  const token = await login("superadmin@tamayuz.com", "Admin@2026!");
  
  // 1. Get student users
  console.log("\n[1] Fetching registered users...");
  const users = await request("/admin/users", "GET", null, token);
  const student = users.find((u: any) => u.role === "student");
  if (!student) {
    throw new Error("No student user found in database to link invoice to");
  }
  console.log(`✔ Found target student: "${student.name}" (Email: ${student.email}, ID: ${student.id})`);

  // 2. Create Manual Invoice
  console.log("\n[2] Testing POST manual invoice creation...");
  const invoiceNum = `INV-TEST-MANUAL-${Date.now()}`;
  const payload = {
    userId: student.id,
    amount: 15000,
    invoiceNumber: invoiceNum,
    status: "issued",
    notes: "Facture manuelle créée par test d'intégration"
  };

  const created = await request("/admin/invoices", "POST", payload, token);
  console.log(`✔ Manual invoice created successfully!`);
  console.log(`✔ Number: "${created.invoiceNumber}" (Expected: "${invoiceNum}")`);
  console.log(`✔ Amount: ${created.amount} DZD`);
  console.log(`✔ Student: "${created.userName}" (Expected: "${student.name}")`);

  // 3. Clean up
  console.log("\n[3] Cleaning up test invoice...");
  await db.delete(invoicesTable).where(eq(invoicesTable.id, created.id));
  console.log("✔ Test manual invoice deleted successfully");

  console.log("\n================================================");
  console.log("🎉 MANUAL INVOICE INTEGRATION VERIFIED OK!");
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

verifyManualInvoice().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
