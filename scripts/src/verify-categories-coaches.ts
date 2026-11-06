import { db } from "@workspace/db";
import { usersTable, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function verifyCoachesAndCategories() {
  console.log("=================================================");
  console.log("🔍 Verifying Direct Coach & Category Creation API");
  console.log("=================================================");

  const token = await login("superadmin@tamayuz.com", "Admin@2026!");
  
  // 1. Create Coach Account
  console.log("\n[1] Testing direct Coach creation by Admin...");
  const coachEmail = `coach.test.${Date.now()}@tamayuz.com`;
  const coachPayload = {
    name: "Amina DirectCoach",
    email: coachEmail,
    password: "Password123!",
    bio: "Professeur de technologie web."
  };
  
  const createdCoach = await request("/admin/coaches", "POST", coachPayload, token);
  console.log(`✔ Coach account created: "${createdCoach.name}" (Email: ${createdCoach.email}, Approved: ${createdCoach.isApproved})`);
  console.log(`✔ Stats initialized - Courses: ${createdCoach.totalCourses}, Students: ${createdCoach.totalStudents}, Gains: ${createdCoach.totalCommissions} DZD`);

  // 2. Create Course Category
  console.log("\n[2] Testing direct Category creation by Admin...");
  const categoryName = `Data Science ${Date.now()}`;
  const categoryPayload = {
    name: categoryName,
    description: "Modélisation statistique et Machine Learning."
  };
  
  const createdCat = await request("/categories", "POST", categoryPayload, token);
  console.log(`✔ Category created: "${createdCat.name}" (ID: ${createdCat.id})`);

  // 3. Get Categories list
  console.log("\n[3] Verifying category is present in list...");
  const categories = await request("/categories", "GET", null, token);
  const found = categories.find((c: any) => c.name === categoryName);
  if (found) {
    console.log("✔ Category found in categories list!");
  } else {
    throw new Error("Created category not found in list");
  }

  // 4. Cleanup
  console.log("\n[4] Cleaning up test data...");
  await request(`/categories/${createdCat.id}`, "DELETE", null, token);
  await db.delete(usersTable).where(eq(usersTable.email, coachEmail));
  console.log("✔ Test data cleaned up successfully");

  console.log("\n=================================================");
  console.log("🎉 ALL NEW ENDPOINTS FUNCTIONAL AND CORRECT!");
  console.log("=================================================");
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

verifyCoachesAndCategories().catch(err => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
