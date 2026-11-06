import { db } from "@workspace/db";
import {
  usersTable,
  coursesTable,
  centersTable,
  payoutsTable,
  commissionsTable,
  invoicesTable,
  purchasesTable,
  enrollmentsTable,
  priceRequestsTable,
  couponsTable
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

async function runVerification() {
  console.log("=================================================");
  console.log("🔍 tamayuz Platform - End-to-End System Verification");
  console.log("=================================================");

  // Set default database URL
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/tamayuz";
  }

  // 1. Authenticate / Login endpoints
  console.log("\n[1] Testing Authentication & Logins...");
  const adminCredentials = { email: "superadmin@tamayuz.com", password: "Admin@2026!" };
  const coachCredentials = { email: "coach.ahmed@tamayuz.com", password: "Coach123!" };
  const studentCredentials = { email: "student.yassine@tamayuz.com", password: "Student123!" };

  const adminToken = await login(adminCredentials.email, adminCredentials.password);
  const coachToken = await login(coachCredentials.email, coachCredentials.password);
  const studentToken = await login(studentCredentials.email, studentCredentials.password);

  console.log("✔ Admin logged in successfully");
  console.log("✔ Coach logged in successfully");
  console.log("✔ Student logged in successfully");

  // 2. Training Center CRUD (Centres de formation)
  console.log("\n[2] Testing Training Center CRUD...");
  // Create Center
  const centerPayload = {
    name: "Centre de Formation Oran Excellence",
    description: "Centre spécialisé en technologies de l'information et IA.",
    address: "Oran, Algérie",
    phone: "+213 41 00 00 00",
    email: "oran.excel@tamayuz.com",
    isActive: true
  };
  const center = await request("/centers", "POST", centerPayload, adminToken);
  console.log(`✔ Center Created: "${center.name}" (ID: ${center.id}, Active: ${center.isActive})`);

  // Get Center
  const centers = await request("/centers", "GET", null, adminToken);
  const foundCenter = centers.find((c: any) => c.id === center.id);
  if (foundCenter) {
    console.log("✔ Center retrieved successfully from list");
  } else {
    throw new Error("Created center not found in list");
  }

  // Update Center
  const updatePayload = { name: "Centre Oran Excellence Modifié", isActive: false };
  const updatedCenter = await request(`/centers/${center.id}`, "PUT", updatePayload, adminToken);
  console.log(`✔ Center Updated Name: "${updatedCenter.name}" (Active: ${updatedCenter.isActive})`);

  // 3. Formations (Courses) & Price Request Flow
  console.log("\n[3] Testing Course Creation & Price Request Flow...");
  // Create free course first
  const coursePayload = {
    title: "Docker & Kubernetes pour Développeurs",
    description: "Maîtrisez la conteneurisation et l'orchestration moderne.",
    category: "DevOps",
    isPublished: true,
    durationHours: 12,
    level: "intermediate",
    isFree: true,
    price: "0.00",
    currency: "DZD"
  };
  const course = await request("/courses", "POST", coursePayload, coachToken);
  console.log(`✔ Course Created: "${course.title}" (ID: ${course.id}, Price: ${course.price} ${course.currency})`);

  // Coach requests price change to 8000 DZD
  const priceRequestPayload = {
    courseId: course.id,
    requestedPrice: 8000,
    justification: "Nouveau contenu premium ajouté au module DevOps."
  };
  const priceRequest = await request("/coach/price-requests", "POST", priceRequestPayload, coachToken);
  console.log(`✔ Price Request Created by Coach (ID: ${priceRequest.id}, Status: ${priceRequest.status})`);

  // Admin approves the price request
  const approvePayload = {
    status: "approved",
    adminResponse: "Prix validé par l'administration."
  };
  const resolvedRequest = await request(`/admin/price-requests/${priceRequest.id}`, "PATCH", approvePayload, adminToken);
  console.log(`✔ Price Request Resolved by Admin (Status: ${resolvedRequest.status})`);

  // Verify course price in DB has updated to 8000 DZD (Interconnection verification)
  const [dbCourse] = await db.select().from(coursesTable).where(eq(coursesTable.id, course.id));
  if (parseFloat(dbCourse.price) === 8000 && !dbCourse.isFree) {
    console.log(`✔ Interconnection Verified: Course price successfully updated to ${dbCourse.price} DZD (isFree: ${dbCourse.isFree})`);
  } else {
    throw new Error(`Price update failed. Current price: ${dbCourse.price}`);
  }

  // 4. Coupons & Financial Transaction Cascade
  console.log("\n[4] Testing Coupons & Financial Transaction Cascade...");
  const uniqueCode = "MINI" + Math.floor(Math.random() * 100000);
  // Create Coupon for 50% discount
  const couponPayload = {
    code: uniqueCode,
    discountPercent: 50,
    maxUses: 10,
    courseId: course.id,
    isActive: true
  };
  const coupon = await request("/coupons", "POST", couponPayload, adminToken);
  console.log(`✔ Coupon Created: "${coupon.code}" (${coupon.discountPercent}% off)`);

  // Validate Coupon
  const validationPayload = { code: uniqueCode, courseId: course.id };
  const validation = await request("/coupons/validate", "POST", validationPayload, studentToken);
  console.log(`✔ Coupon validated: "${validation.message}" (Discounted Price: ${validation.discountedPrice} DZD)`);

  // Purchase Course using Coupon
  const purchasePayload = { courseId: course.id, couponCode: uniqueCode };
  const purchase = await request("/purchases", "POST", purchasePayload, studentToken);
  console.log(`✔ Purchase Successful (ID: ${purchase.id}, Paid: ${purchase.amount} DZD)`);

  // Verify Invoice generation
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.purchaseId, purchase.id));
  if (invoice && parseFloat(invoice.amount) === 4000) {
    console.log(`✔ Invoice Interconnection Verified: Invoice #${invoice.invoiceNumber} created for ${invoice.amount} DZD`);
  } else {
    throw new Error("Invoice verification failed");
  }

  // Verify Coach Commission generation (70% of 4000 DZD = 2800 DZD)
  const [commission] = await db.select().from(commissionsTable).where(eq(commissionsTable.purchaseId, purchase.id));
  if (commission && parseFloat(commission.amount) === 2800 && commission.status === "pending") {
    console.log(`✔ Commission Interconnection Verified: Pending commission of ${commission.amount} DZD generated for Coach Ahmed`);
  } else {
    throw new Error(`Commission verification failed. Status: ${commission?.status}, Amount: ${commission?.amount}`);
  }

  // 5. Versements (Payouts)
  console.log("\n[5] Testing Coach Payout (Versement) & Status Transitions...");
  const payoutPayload = {
    coachId: coachCredentials.email === "coach.ahmed@tamayuz.com" ? 6 : 0, // Fallback check if ID changed
    amount: 2800,
    paymentMethod: "ccp",
    referenceNumber: "CCP-TX-9988221",
    notes: "Paiement de la commission du cours Docker."
  };

  // Find exact coach ID if not 6
  const [dbCoach] = await db.select().from(usersTable).where(eq(usersTable.email, coachCredentials.email));
  payoutPayload.coachId = dbCoach.id;

  const payout = await request("/admin/payouts", "POST", payoutPayload, adminToken);
  console.log(`✔ Payout Registered (ID: ${payout.id}, Method: ${payout.paymentMethod}, Ref: ${payout.referenceNumber})`);

  // Verify that the coach's commission status has automatically updated to "paid"
  const [updatedCommission] = await db.select().from(commissionsTable).where(eq(commissionsTable.id, commission.id));
  if (updatedCommission.isPaid && updatedCommission.status === "paid") {
    console.log("✔ Commission Status Interconnection Verified: Commission marked as PAID automatically upon Payout generation!");
  } else {
    throw new Error(`Commission update failed. Status: ${updatedCommission.status}, isPaid: ${updatedCommission.isPaid}`);
  }

  // 6. Cleanup training center to finish CRUD test
  console.log("\n[6] Cleaning up test resources...");
  await request(`/centers/${center.id}`, "DELETE", null, adminToken);
  console.log("✔ Center deleted successfully");

  console.log("\n=================================================");
  console.log("🎉 ALL MODULES FUNCTIONAL AND INTERCONNECTED!");
  console.log("=================================================");
}

// Helper fetch client
async function request(endpoint: string, method: string, body: any = null, token: string | null = null): Promise<any> {
  const headers: any = {
    "Content-Type": "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options: any = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`http://localhost:3000/api${endpoint}`, options);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error [${method} ${endpoint}]: ${res.status} - ${errorText}`);
  }
  return res.json();
}

// Login helper
async function login(email: string, password: string): Promise<string> {
  const res = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}`);
  }
  const data: any = await res.json();
  return data.token;
}

runVerification().catch(err => {
  console.error("\n❌ Verification Failed:", err);
  process.exit(1);
});
