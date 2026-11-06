import { db } from "@workspace/db";
import {
  usersTable,
  coursesTable,
  chaptersTable,
  lessonsTable,
  enrollmentsTable,
  progressTable,
  couponsTable,
  announcementsTable,
  knowledgeBaseTable,
  certificateTemplatesTable,
} from "@workspace/db";
import bcrypt from "bcrypt";

async function main() {
  console.log("Seeding started...");

  // Set default environment database URL in case it's not set
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/tamayuz";
  }

  // Clear existing data in reverse dependency order
  console.log("Cleaning old database records...");
  await db.delete(progressTable);
  await db.delete(enrollmentsTable);
  await db.delete(lessonsTable);
  await db.delete(chaptersTable);
  await db.delete(couponsTable);
  await db.delete(announcementsTable);
  await db.delete(knowledgeBaseTable);
  await db.delete(certificateTemplatesTable);
  await db.delete(coursesTable);
  await db.delete(usersTable);

  console.log("Creating users...");
  const hashedPassword1 = await bcrypt.hash("Admin@2026!", 10);
  const hashedPassword2 = await bcrypt.hash("Coach123!", 10);
  const hashedPassword3 = await bcrypt.hash("Student123!", 10);

  // 1. Super Admin
  const [admin] = await db.insert(usersTable).values({
    name: "Super Admin",
    email: "superadmin@tamayuz.com",
    passwordHash: hashedPassword1,
    role: "admin",
    isApproved: true,
  }).returning();

  // 2. Approved Coach
  const [coachAhmed] = await db.insert(usersTable).values({
    name: "Ahmed (Coach Approved)",
    email: "coach.ahmed@tamayuz.com",
    passwordHash: hashedPassword2,
    role: "coach",
    isApproved: true,
  }).returning();

  // 3. Pending Coach
  const [coachPending] = await db.insert(usersTable).values({
    name: "Mohamed (Coach Pending)",
    email: "coach.pending@tamayuz.com",
    passwordHash: hashedPassword2,
    role: "coach",
    isApproved: false,
  }).returning();

  // 4. Enrolled Student
  const [studentYassine] = await db.insert(usersTable).values({
    name: "Yassine (Enrolled Student)",
    email: "student.yassine@tamayuz.com",
    passwordHash: hashedPassword3,
    role: "student",
    isApproved: true,
  }).returning();

  // 5. New Non-Enrolled Student
  const [studentNew] = await db.insert(usersTable).values({
    name: "Kamel (New Student)",
    email: "student.new@tamayuz.com",
    passwordHash: hashedPassword3,
    role: "student",
    isApproved: true,
  }).returning();

  console.log("Users inserted.");

  // Create course for Ahmed
  console.log("Creating courses...");
  const [courseFullstack] = await db.insert(coursesTable).values({
    title: "Introduction au Développement Web Fullstack",
    description: "Apprenez HTML, CSS, JavaScript, React et Node.js étape par étape pour devenir développeur web fullstack professionnel.",
    category: "Informatique",
    coachId: coachAhmed.id,
    isPublished: true,
    durationHours: 42,
    level: "beginner",
    isFree: false,
    price: "15000.00",
    currency: "DZD",
  }).returning();

  const [courseAI] = await db.insert(coursesTable).values({
    title: "Intelligence Artificielle & Prompt Engineering",
    description: "Apprenez à maximiser l'usage des modèles LLMs, créer vos propres agents intelligents et maîtriser le prompting.",
    category: "Intelligence Artificielle",
    coachId: coachAhmed.id,
    isPublished: true,
    durationHours: 15,
    level: "intermediate",
    isFree: true,
    price: "0.00",
    currency: "DZD",
  }).returning();

  console.log("Courses inserted.");

  // Create Chapters
  console.log("Creating chapters...");
  const [chapter1] = await db.insert(chaptersTable).values({
    courseId: courseFullstack.id,
    title: "Module 1: Bases du Web (HTML & CSS)",
    description: "Comprendre le fonctionnement du web et styliser des pages statiques avec CSS moderne.",
    order: 1,
  }).returning();

  const [chapter2] = await db.insert(chaptersTable).values({
    courseId: courseFullstack.id,
    title: "Module 2: JavaScript Moderne (ES6+)",
    description: "Manipuler le DOM, comprendre l'asynchronisme et écrire du code dynamique.",
    order: 2,
  }).returning();

  console.log("Chapters inserted.");

  // Create Lessons
  console.log("Creating lessons...");
  const [lessonHTML] = await db.insert(lessonsTable).values({
    courseId: courseFullstack.id,
    chapterId: chapter1.id,
    title: "1. Structure HTML5 de base",
    description: "Dans cette leçon, nous allons découvrir la structure d'une page HTML moderne et les balises sémantiques.",
    order: 1,
    durationMinutes: 20,
    type: "text",
  }).returning();

  const [lessonCSS] = await db.insert(lessonsTable).values({
    courseId: courseFullstack.id,
    chapterId: chapter1.id,
    title: "2. Sélecteurs CSS & Flexbox",
    description: "Apprenez à positionner vos éléments à l'aide de CSS Flexbox de manière réactive.",
    order: 2,
    durationMinutes: 30,
    type: "video",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  }).returning();

  const [lessonJS] = await db.insert(lessonsTable).values({
    courseId: courseFullstack.id,
    chapterId: chapter2.id,
    title: "3. Variables, Functions & Arrays",
    description: "Introduction à la syntaxe JavaScript et les structures de données essentielles.",
    order: 1,
    durationMinutes: 45,
    type: "text",
  }).returning();

  // Create one lesson in AI Course
  const [lessonAI] = await db.insert(lessonsTable).values({
    courseId: courseAI.id,
    title: "Prompting Essentials",
    description: "Les bases indispensables pour communiquer avec un LLM.",
    order: 1,
    durationMinutes: 15,
    type: "text",
  }).returning();

  console.log("Lessons inserted.");

  // Enroll Student Yassine to Ahmed's Fullstack Course
  console.log("Creating enrollments...");
  await db.insert(enrollmentsTable).values({
    userId: studentYassine.id,
    courseId: courseFullstack.id,
  });

  // Add partial progress for Yassine (completed 1st lesson)
  console.log("Adding progress...");
  await db.insert(progressTable).values({
    userId: studentYassine.id,
    lessonId: lessonHTML.id,
  });

  console.log("Progress added.");

  // Create Coupon
  console.log("Creating coupons...");
  await db.insert(couponsTable).values({
    code: "WELCOME50",
    discountPercent: 50,
    maxUses: 100,
    courseId: courseFullstack.id,
    isActive: true,
  });

  // Create announcements
  console.log("Creating announcements...");
  await db.insert(announcementsTable).values({
    authorId: admin.id,
    title: "Bienvenue sur Tamayyuz !",
    content: "Nous sommes fiers de vous présenter notre nouvelle plateforme e-learning innovante.",
    type: "announcement",
    isPublished: true,
    isApproved: true,
    isPinned: true,
  });

  await db.insert(announcementsTable).values({
    authorId: coachAhmed.id,
    title: "Promotion Web Fullstack en cours",
    content: "Profitez de 50% de réduction sur la formation fullstack avec le code WELCOME50.",
    type: "ad",
    isPublished: true,
    isApproved: true,
  });

  // Create Knowledge Base
  console.log("Creating knowledge base...");
  await db.insert(knowledgeBaseTable).values({
    authorId: admin.id,
    title: "Comment devenir formateur sur Tamayyuz",
    content: "Pour devenir formateur (coach), créez simplement un compte 'coach'. Un administrateur passera en revue votre profil pour approbation.",
    category: "coaches",
    isPublished: true,
  });

  await db.insert(knowledgeBaseTable).values({
    authorId: admin.id,
    title: "Politique de remboursement",
    content: "Tout achat de cours sur la plateforme est définitif sauf cas exceptionnel validé par l'administration dans les 48h.",
    category: "billing",
    isPublished: true,
  });

  // Create Default Certificate Template
  console.log("Creating certificate templates...");
  await db.insert(certificateTemplatesTable).values({
    name: "Modèle Classique Noir & Or",
    description: "Modèle par défaut utilisé pour toutes les certifications.",
    primaryColor: "#111827",
    accentColor: "#d97706",
    isDefault: true,
    isActive: true,
  });

  console.log("Seeding completed successfully!");
}

main().catch((err) => {
  console.error("Seeding failed: ", err);
  process.exit(1);
});
