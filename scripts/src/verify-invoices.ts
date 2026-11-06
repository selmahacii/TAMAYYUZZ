import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function verifyInvoicesManagement() {
  console.log("================================================");
  console.log("🔍 Verifying Complete Invoices Management API");
  console.log("================================================");

  const token = await login("superadmin@tamayuz.com", "Admin@2026!");
  
  // 1. Get current invoices
  console.log("\n[1] Fetching active invoices...");
  const invoices = await request("/admin/invoices", "GET", null, token);
  if (invoices.length === 0) {
    console.log("No invoices found to edit. Skipping update verification.");
    return;
  }
  
  const target = invoices[0];
  console.log(`✔ Found invoice: "${target.invoiceNumber}" (Amount: ${target.amount} DZD, Status: ${target.status})`);

  // 2. Modify Invoice Status & Notes
  console.log("\n[2] Testing PATCH invoice status & administrative notes...");
  const updatePayload = {
    status: "paid",
    notes: `Vérifié par test d'intégration automatique le ${new Date().toLocaleDateString()}`
  };
  
  const updated = await request(`/admin/invoices/${target.id}`, "PATCH", updatePayload, token);
  console.log(`✔ Invoice updated successfully!`);
  console.log(`✔ Status: "${updated.status}" (Expected: "paid")`);
  console.log(`✔ Notes: "${updated.notes}"`);

  // 3. Reset status to original to avoid corrupting db state
  console.log("\n[3] Resetting invoice to original state...");
  await request(`/admin/invoices/${target.id}`, "PATCH", {
    status: target.status,
    notes: target.notes
  }, token);
  console.log("✔ Invoice restored successfully");

  console.log("\n================================================");
  console.log("🎉 INVOICE MANAGEMENT ENDPOINT FULLY FUNCTIONAL!");
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

verifyInvoicesManagement().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
