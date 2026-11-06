import bcrypt from "bcrypt";

const NEON_HOST = "ep-spring-mode-ba1olrfk.c-8.eu-central-1.aws.neon.tech";
const NEON_CONN = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_9uXMe4xpLZoC@ep-spring-mode-ba1olrfk-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function queryNeon(sql, params = []) {
  const res = await fetch(`https://${NEON_HOST}/sql`, {
    method: "POST",
    headers: {
      "Neon-Connection-String": NEON_CONN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql, params }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Neon SQL error (${res.status}): ${errText}\nQuery: ${sql}`);
  }
  const data = await res.json();
  return data.rows ?? [];
}

async function run() {
  console.log("==================================================================");
  console.log("🚀 DÉMARRAGE DE LA MIGRATION COMPLÈTE EN PRODUCTION (NEON DB)");
  console.log("==================================================================");

  // 1. Nettoyage ordonné des tables
  console.log("\n1. Purge et réinitialisation des tables...");
  const tablesToClear = [
    "exam_attempts",
    "certificates",
    "progress",
    "enrollments",
    "course_reviews",
    "lesson_comments",
    "in_app_notifications",
    "commissions",
    "invoices",
    "purchases",
    "lessons",
    "chapters",
    "coupons",
    "announcements",
    "price_requests",
    "tickets",
    "audit_logs",
    "courses",
    "certificate_templates",
    "categories",
    "users",
  ];
  for (const t of tablesToClear) {
    await queryNeon(`DELETE FROM ${t};`);
  }
  console.log("✔ Données précédentes nettoyées avec succès.");

  // 2. Hash des mots de passe
  console.log("\n2. Génération des hachages sécurisés...");
  const passDefault = await bcrypt.hash("Password123!", 10);
  const passAdmin = await bcrypt.hash("Admin@2026!", 10);
  const passCoach = await bcrypt.hash("Coach123!", 10);
  const passStudent = await bcrypt.hash("Student123!", 10);

  // 3. Insertion des Catégories
  console.log("\n3. Création des catégories professionnelles...");
  const categories = [
    'Technology',
    'Marketing',
    'Design',
    'Finance',
    'Entrepreneuriat',
    'Business',
    'Communication',
    'Management',
    'Other'
  ];
  for (const cat of categories) {
    await queryNeon(`INSERT INTO categories (name, created_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING;`, [cat]);
  }
  console.log(`✔ ${categories.length} catégories insérées.`);

  // 4. Insertion des Profils Utilisateurs (Admins, Coaches, Étudiants)
  console.log("\n4. Création des profils utilisateurs complets...");
  const usersToInsert = [
    // Admins
    {
      name: "Admin Principal Tamayuz",
      email: "admin@tamayuz.dz",
      pass: passDefault,
      role: "admin",
      approved: true,
      bio: "Super Administrateur et Directeur des Opérations de la plateforme Tamayuz.",
      domain: "Management",
      phone: "+213 550 10 20 30",
    },
    {
      name: "Super Admin",
      email: "superadmin@tamayuz.com",
      pass: passAdmin,
      role: "admin",
      approved: true,
      bio: "Direction Générale & Supervision Système Tamayuz.",
      domain: "Management",
      phone: "+213 550 00 11 22",
    },
    {
      name: "Mme. Farida Belkacem",
      email: "direction@tamayuz.dz",
      pass: passDefault,
      role: "admin",
      approved: true,
      bio: "Directrice Pédagogique et Responsable de la Qualité des Certifications.",
      domain: "Management",
      phone: "+213 560 44 55 66",
    },
    // Coaches Certifiés
    {
      name: "Dr. Sofiane Meziani",
      email: "coach@tamayuz.dz",
      pass: passDefault,
      role: "coach",
      approved: true,
      bio: "Docteur en Informatique & Consultant Senior en Intelligence Artificielle et Systèmes Distribués. Plus de 12 ans d'expérience académique et industrielle.",
      domain: "Technology",
      phone: "+213 551 23 45 67",
      diplomas: [
        { name: "Doctorat en Informatique & IA (USTHB)", institution: "USTHB Alger", year: 2016, verified: true },
        { name: "Certification AWS Solutions Architect Professional", institution: "Amazon Web Services", year: 2021, verified: true }
      ],
      priorTrainings: ["React & Node.js Avancé", "Deep Learning & NLP", "Architecture Microservices"],
      teachingPlan: "Former la prochaine génération d'ingénieurs et développeurs algériens aux standards internationaux.",
    },
    {
      name: "Ahmed Cherif",
      email: "coach.ahmed@tamayuz.com",
      pass: passCoach,
      role: "coach",
      approved: true,
      bio: "Lead Cloud Architect & Développeur Fullstack. Certifié Google Cloud et Kubernetes. Passionné d'automatisation.",
      domain: "Technology",
      phone: "+213 661 78 90 12",
      diplomas: [
        { name: "Master Génie Logiciel", institution: "ESI Oued Smar", year: 2018, verified: true },
        { name: "Google Professional Cloud Architect", institution: "Google Cloud", year: 2022, verified: true }
      ],
      priorTrainings: ["Docker & Kubernetes en Production", "CI/CD & DevOps"],
      teachingPlan: "Accompagner les développeurs vers le cloud natif et l'indépendance freelance.",
    },
    {
      name: "Samira Hadj",
      email: "samira.hadj@tamayuz.dz",
      pass: passDefault,
      role: "coach",
      approved: true,
      bio: "Consultante en Stratégie E-commerce et Acquisition Digitale (Meta, TikTok, Google Ads). A propulsé plus de 30 boutiques en ligne en Algérie.",
      domain: "Marketing",
      phone: "+213 770 34 56 78",
      diplomas: [
        { name: "Master Marketing Digital & E-Business", institution: "HEC Alger", year: 2019, verified: true },
        { name: "Meta Certified Media Buying Professional", institution: "Meta Blueprint", year: 2023, verified: true }
      ],
      priorTrainings: ["Media Buying Algérie & MENA", "Scaling E-commerce Local", "Tunnel de Vente & Copywriting"],
      teachingPlan: "Permettre aux femmes et entrepreneurs algériens de lancer et rentabiliser leur boutique en ligne en moins de 30 jours.",
    },
    {
      name: "Yacine Amrani",
      email: "yacine.amrani@tamayuz.dz",
      pass: passDefault,
      role: "coach",
      approved: true,
      bio: "Senior Product Designer & Design System Lead. A conçu des applications utilisées par plus de 500,000 utilisateurs en Algérie et à l'international.",
      domain: "Design",
      phone: "+213 555 88 99 00",
      diplomas: [
        { name: "Diplôme National des Beaux-Arts - Design Graphique", institution: "ESBA Alger", year: 2017, verified: true },
        { name: "Certification Nielsen Norman Group UX Master", institution: "NN/g", year: 2022, verified: true }
      ],
      priorTrainings: ["Figma Avancé & Auto-Layout", "Design Systems à grande échelle", "Recherche Utilisateur"],
      teachingPlan: "Enseigner le design d'interface moderne basé sur la psychologie utilisateur et les livrables d'agence.",
    },
    {
      name: "Karim Boussaid",
      email: "karim.boussaid@tamayuz.dz",
      pass: passDefault,
      role: "coach",
      approved: true,
      bio: "Expert Comptable et Commissaire aux Comptes agréé. Spécialiste de la fiscalité des startups, micro-entreprises et PME en Algérie.",
      domain: "Finance",
      phone: "+213 540 12 34 56",
      diplomas: [
        { name: "Diplôme d'Expertise Comptable (DEC)", institution: "Ordre National des Experts Comptables", year: 2015, verified: true },
        { name: "Licence en Sciences Financières et Comptables", institution: "Université d'Alger", year: 2011, verified: true }
      ],
      priorTrainings: ["Fiscalité Pratique des Sociétés", "Gestion Financière pour Entrepreneurs", "Télé-déclarations Jibayatik"],
      teachingPlan: "Démystifier la comptabilité et la fiscalité algérienne pour sécuriser la croissance des entreprises.",
    },
    {
      name: "Nadia Kaci (Coach en attente)",
      email: "coach.pending@tamayuz.dz",
      pass: passDefault,
      role: "coach",
      approved: false,
      bio: "Formatrice en design graphique et création de marque, dossier pédagogique en cours d'évaluation par l'administration.",
      domain: "Design",
      phone: "+213 559 99 88 77",
      diplomas: [
        { name: "Licence Arts Graphiques", institution: "Université de Constantine", year: 2020, verified: false }
      ],
      priorTrainings: ["Illustrator & Photoshop Initiation"],
      teachingPlan: "Former les débutants aux fondamentaux du design de marque.",
    },
    // Étudiants Réels
    {
      name: "Yassine Mansouri",
      email: "student@tamayuz.dz",
      pass: passDefault,
      role: "student",
      approved: true,
      bio: "Étudiant diplômé en reconversion vers le développement fullstack et l'intelligence artificielle.",
      domain: "Technology",
      phone: "+213 552 11 22 33",
      interests: ["Développement Web", "Intelligence Artificielle", "Cloud Computing"],
    },
    {
      name: "Yassine Student",
      email: "student.yassine@tamayuz.com",
      pass: passStudent,
      role: "student",
      approved: true,
      bio: "Apprenant assidu, parcours certifiant Tech.",
      domain: "Technology",
      phone: "+213 551 00 22 44",
      interests: ["Développement Web", "DevOps"],
    },
    {
      name: "Amina Benali",
      email: "etudiant@tamayuz.dz",
      pass: passDefault,
      role: "student",
      approved: true,
      bio: "Passionnée par le marketing digital, le community management et la vente en ligne.",
      domain: "Marketing",
      phone: "+213 663 77 88 99",
      interests: ["Marketing Digital", "E-commerce", "Réseaux Sociaux"],
    },
    {
      name: "Meriem Saidi",
      email: "meriem.saidi@tamayuz.dz",
      pass: passDefault,
      role: "student",
      approved: true,
      bio: "Créatrice d'une boutique d'artisanat local, en quête de compétences pour développer ses ventes en ligne.",
      domain: "Entrepreneuriat",
      phone: "+213 775 44 33 22",
      interests: ["E-commerce", "Entrepreneuriat", "Design"],
    },
    {
      name: "Walid Taleb",
      email: "walid.taleb@tamayuz.dz",
      pass: passDefault,
      role: "student",
      approved: true,
      bio: "Développeur mobile junior cherchant à se lancer en tant que freelance indépendant.",
      domain: "Technology",
      phone: "+213 549 11 55 66",
      interests: ["Freelancing", "Mobile Dev", "Business"],
    },
    {
      name: "Khadija Zerrouk",
      email: "khadija.zerrouk@tamayuz.dz",
      pass: passDefault,
      role: "student",
      approved: true,
      bio: "Graphiste autodidacte souhaitant monter en compétences sur Figma et les Design Systems.",
      domain: "Design",
      phone: "+213 557 66 11 00",
      interests: ["Design", "UI/UX", "Branding"],
    }
  ];

  const userMap = {};
  for (const u of usersToInsert) {
    const rows = await queryNeon(
      `INSERT INTO users (name, email, password_hash, role, is_approved, bio, domain, phone, diplomas, prior_trainings, teaching_plan, interests, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING id, name, email, role;`,
      [
        u.name,
        u.email,
        u.pass,
        u.role,
        u.approved,
        u.bio,
        u.domain,
        u.phone,
        JSON.stringify(u.diplomas ?? []),
        JSON.stringify(u.priorTrainings ?? []),
        u.teachingPlan ?? null,
        JSON.stringify(u.interests ?? [])
      ]
    );
    userMap[u.email] = rows[0];
  }
  console.log(`✔ ${usersToInsert.length} utilisateurs insérés avec succès.`);

  // 5. Insertion des Modèles de Certificat
  console.log("\n5. Création des modèles officiels de certificats...");
  const templates = [
    {
      name: "Certificat d'Excellence Tamayuz",
      description: "Modèle officiel prestige avec bordures dorées et sceau numérique sécurisé.",
      primary: "#1e293b",
      accent: "#eab308",
      isDefault: true,
    },
    {
      name: "Certificat Professionnel Tech & IA",
      description: "Modèle moderne pour les parcours certifiants développement et ingénierie.",
      primary: "#0f172a",
      accent: "#6366f1",
      isDefault: false,
    },
    {
      name: "Certificat Business & Entrepreneuriat",
      description: "Modèle corporate pour les formations management, finance et e-commerce.",
      primary: "#064e3b",
      accent: "#10b981",
      isDefault: false,
    },
  ];

  const templateRows = [];
  for (const t of templates) {
    const rows = await queryNeon(
      `INSERT INTO certificate_templates (name, description, primary_color, accent_color, is_default, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       RETURNING id, name;`,
      [t.name, t.description, t.primary, t.accent, t.isDefault]
    );
    templateRows.push(rows[0]);
  }
  const defaultTemplateId = templateRows[0].id;
  const techTemplateId = templateRows[1].id;
  const bizTemplateId = templateRows[2].id;
  console.log(`✔ 3 modèles de certificats configurés (IDs: ${defaultTemplateId}, ${techTemplateId}, ${bizTemplateId}).`);

  // 6. Insertion des 6 Formations Riches avec Examens Certifiants
  console.log("\n6. Création des formations de niveau production...");
  const coursesData = [
    {
      title: "Développement Web Fullstack Moderne (React 19, TypeScript & Node.js)",
      subtitle: "Devenez développeur opérationnel : architecture moderne, bases de données et déploiement cloud.",
      description: "Une formation complète et professionnalisante conçue pour vous amener de l'intégration web jusqu'à la création d'applications web complètes, sécurisées et prêtes pour la production. Vous apprendrez à maîtriser React 19, Tailwind CSS, Node.js, Express, PostgreSQL ainsi que les meilleures pratiques de sécurité et de testing.",
      category: "Technology",
      coachId: userMap["coach@tamayuz.dz"].id,
      imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
      language: "fr",
      price: "12000.00",
      durationHours: 36,
      level: "intermediate",
      isFree: false,
      tags: ["React", "TypeScript", "Node.js", "PostgreSQL", "Fullstack", "Web"],
      learningObjectives: [
        "Concevoir des interfaces utilisateur réactives avec React 19 et TypeScript",
        "Bâtir des APIs REST robustes, sécurisées et documentées avec Express & Node.js",
        "Modéliser et requêter des bases de données relationnelles PostgreSQL",
        "Mettre en place l'authentification sécurisée (JWT, bcrypt, sessions)",
        "Déployer des applications complètes en environnement cloud"
      ],
      requirements: ["Bases en HTML, CSS et JavaScript", "Un ordinateur avec Node.js installé"],
      targetAudience: ["Développeurs débutants à intermédiaires", "Étudiants en informatique", "Professionnels en reconversion"],
      templateId: techTemplateId,
      finalExam: {
        passingScore: 75,
        questions: [
          {
            question: "Quel hook React est recommandé pour exécuter des effets secondaires après le rendu d'un composant ?",
            options: ["useState", "useEffect", "useCallback", "useMemo"],
            answer: 1
          },
          {
            question: "Dans PostgreSQL, quelle clause est utilisée pour éviter les injections SQL lors de requêtes dynamiques ?",
            options: ["Les requêtes concaténées", "Les requêtes préparées (paramétrées)", "La clause GROUP BY", "Les triggers"],
            answer: 1
          },
          {
            question: "Quelle méthode HTTP est sémantiquement appropriée pour mettre à jour partiellement une ressource ?",
            options: ["POST", "PUT", "PATCH", "DELETE"],
            answer: 2
          },
          {
            question: "Quel est l'avantage principal de TypeScript par rapport à JavaScript standard ?",
            options: ["Il s'exécute plus rapidement dans le navigateur", "Le typage statique prévient les erreurs dès la compilation", "Il remplace le CSS", "Il ne nécessite aucun compilateur"],
            answer: 1
          }
        ]
      },
      chapters: [
        {
          title: "Chapitre 1 : Les Fondations du Frontend Moderne (React & TS)",
          lessons: [
            {
              title: "Introduction à l'écosystème React 19 et configuration Vite",
              duration: 25,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/SqcY0GlETPk",
              description: "Découverte des composants fonctionnels, du JSX et du cycle de rendu."
            },
            {
              title: "Gestion d'état avancée avec useState et useReducer",
              duration: 35,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/O6P86uwfdR0",
              description: "Pattern de gestion d'états complexes et formulaires typés."
            },
            {
              title: "Guide de référence TypeScript pour les composants React",
              duration: 20,
              type: "pdf",
              pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              description: "Cheatsheet récapitulative des interfaces, génériques et types utilitaires."
            }
          ]
        },
        {
          title: "Chapitre 2 : Backend Robuste avec Node.js, Express & PostgreSQL",
          lessons: [
            {
              title: "Architecture en couches : Contrôleurs, Services et Repositories",
              duration: 40,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/Oe421EPjeBE",
              description: "Structurer une API propre, maintenable et testable."
            },
            {
              title: "Modélisation des données avec PostgreSQL et Drizzle ORM",
              duration: 45,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/4ZkWv_FhO5M",
              description: "Schémas, relations 1-N, N-N et migrations automatisées."
            },
            {
              title: "Quiz intermédiaire : Architecture Backend & Sécurité",
              duration: 15,
              type: "quiz",
              quizData: {
                questions: [
                  { question: "Quel code HTTP indique qu'une ressource a été créée avec succès ?", options: ["200 OK", "201 Created", "204 No Content"], answer: 1 },
                  { question: "Où doit-on stocker les clés secrètes d'une API ?", options: ["Dans le code source Git", "Dans les variables d'environnement", "Dans le localStorage"], answer: 1 }
                ]
              }
            }
          ]
        },
        {
          title: "Chapitre 3 : Sécurité, Déploiement & Mise en Production",
          lessons: [
            {
              title: "Authentification robuste avec JWT et hachage Bcrypt",
              duration: 35,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/mbsmsi7l3r4",
              description: "Gestion des tokens, cookies HttpOnly et révocation de sessions."
            },
            {
              title: "Déploiement continu et bonnes pratiques CI/CD",
              duration: 30,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/7r4xVDI2vho",
              description: "Build de production, reverse-proxy et monitoring en temps réel."
            }
          ]
        }
      ]
    },
    {
      title: "Intelligence Artificielle & Automatisation (LLMs, Agents & Python)",
      subtitle: "Apprenez à intégrer les modèles de pointe (GPT, Claude, Gemini) et à construire des agents autonomes.",
      description: "Une formation d'élite pour concevoir des applications intelligentes de nouvelle génération. Vous apprendrez le Prompt Engineering professionnel, le RAG (Retrieval-Augmented Generation), les bases de données vectorielles, et la création d'agents autonomes capables de réaliser des tâches complexes pour les entreprises.",
      category: "Technology",
      coachId: userMap["coach@tamayuz.dz"].id,
      imageUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
      language: "fr",
      price: "18500.00",
      durationHours: 32,
      level: "advanced",
      isFree: false,
      tags: ["Intelligence Artificielle", "LLM", "Python", "LangChain", "Agents", "Automation"],
      learningObjectives: [
        "Maîtriser les APIs des grands modèles de langage (OpenAI, Anthropic, Gemini)",
        "Bâtir des architectures RAG pour dialoguer avec des documents privés",
        "Créer des agents autonomes avec outils (Web search, SQL, calcul)",
        "Automatiser les processus d'entreprise avec Python et l'IA",
        "Déployer des applications IA sécurisées et optimisées en coût"
      ],
      requirements: ["Connaissances de base en Python", "Compréhension des formats JSON et API"],
      targetAudience: ["Développeurs Python", "Data Scientists", "Chefs de projet technique & Innovateurs"],
      templateId: techTemplateId,
      finalExam: {
        passingScore: 70,
        questions: [
          {
            question: "Que signifie le concept de RAG dans le domaine des LLMs ?",
            options: ["Random Agent Generation", "Retrieval-Augmented Generation", "Recursive Algorithm Graph", "Robust Automated Gateway"],
            answer: 1
          },
          {
            question: "Quel élément est indispensable pour permettre à un Agent IA d'interagir avec le monde extérieur ?",
            options: ["Des Outils (Tools / Functions Calling)", "Uniquement du CSS", "Une base NoSQL", "Un écran 4K"],
            answer: 0
          },
          {
            question: "Quelle technique permet de transformer un texte en vecteur mathématique pour la recherche sémantique ?",
            options: ["La tokenisation simple", "Le Text Embedding", "Le hachage MD5", "La compression Gzip"],
            answer: 1
          }
        ]
      },
      chapters: [
        {
          title: "Chapitre 1 : Fondations des LLMs & Prompt Engineering Avancé",
          lessons: [
            {
              title: "Comment fonctionnent réellement les modèles de fondation",
              duration: 30,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/zjkBMFhNj_g",
              description: "Transformers, tokens, fenêtres de contexte et paramètres de température."
            },
            {
              title: "Patterns de Prompt Engineering pour des sorties structurées (JSON)",
              duration: 25,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/jC4v5AS4RIM",
              description: "Few-shot prompting, Chain of Thought et validation avec Pydantic."
            }
          ]
        },
        {
          title: "Chapitre 2 : RAG & Bases Vectorielles",
          lessons: [
            {
              title: "Architecture d'un système RAG performant",
              duration: 40,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/tcqEUSNCn8I",
              description: "Chunking, indexation vectorielle et re-ranking des résultats."
            },
            {
              title: "Support de cours complet RAG en PDF",
              duration: 15,
              type: "pdf",
              pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              description: "Diagrammes d'architecture et benchmarks de vector stores."
            }
          ]
        },
        {
          title: "Chapitre 3 : Agents Autonomes & Orchestration",
          lessons: [
            {
              title: "Construire un Agent autonome avec Function Calling",
              duration: 45,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/Fw3hN4_YQ88",
              description: "Fournir des outils réels à l'agent et gérer la boucle de décision ReAct."
            }
          ]
        }
      ]
    },
    {
      title: "E-Commerce & Publicité Digitale en Algérie (Meta Ads, TikTok & Vente Locale)",
      subtitle: "Le guide complet pour lancer et rentabiliser votre boutique en ligne avec les spécificités du marché algérien.",
      description: "Ce cours pragmatique aborde tous les piliers du succès e-commerce en Algérie : le choix des produits gagnants, la création d'un site de vente optimisé pour mobile, les campagnes publicitaires rentables sur Facebook, Instagram et TikTok, la gestion des confirmations téléphoniques, les paiements BaridiMob / CCP et la logistique de livraison vers les 58 Wilayas.",
      category: "Marketing",
      coachId: userMap["samira.hadj@tamayuz.dz"].id,
      imageUrl: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=1200&q=80",
      language: "fr",
      price: "8500.00",
      durationHours: 24,
      level: "beginner",
      isFree: false,
      tags: ["E-commerce", "Marketing", "Meta Ads", "TikTok", "Algérie", "Vente"],
      learningObjectives: [
        "Sélectionner des produits à fort potentiel pour le marché algérien",
        "Créer des campagnes publicitaires rentables sur Meta Ads & TikTok Ads",
        "Optimiser le taux de confirmation téléphonique et réduire les retours colis",
        "Intégrer les paiements BaridiMob, CCP et le paiement à la livraison (COD)",
        "Collaborer efficacement avec les sociétés de livraison express nationales"
      ],
      requirements: ["Aucun prérequis technique nécessaire", "Un smartphone ou un ordinateur"],
      targetAudience: ["Porteurs de projets e-commerce", "Commerçants traditionnels", "Freelances en marketing digital"],
      templateId: bizTemplateId,
      finalExam: {
        passingScore: 70,
        questions: [
          {
            question: "En Algérie, quel est le mode de paiement encore le plus répandu pour les achats e-commerce ?",
            options: ["Paiement à la livraison (Cash on Delivery)", "Virement bancaire classique", "Chèque certifié", "Carte internationale uniquement"],
            answer: 0
          },
          {
            question: "Quelle métrique publicitaire mesure le coût pour mille impressions sur Meta Ads ?",
            options: ["CPC", "CPM", "ROAS", "CTR"],
            answer: 1
          },
          {
            question: "Quelle étape permet de réduire drastiquement le taux de retour des colis en e-commerce local ?",
            options: ["Envoyer sans vérifier", "La confirmation téléphonique systématique avant expédition", "Augmenter les prix", "Désactiver le service client"],
            answer: 1
          }
        ]
      },
      chapters: [
        {
          title: "Chapitre 1 : Trouver son Produit Gagnant & Structurer l'Offre",
          lessons: [
            {
              title: "Méthode d'analyse du marché local et détection des tendances",
              duration: 25,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/n4p3fUeWd-g",
              description: "Outils de recherche, marge bénéficiaire nette et fournisseurs en Algérie."
            },
            {
              title: "Création d'une page de vente irrésistible orientée conversion",
              duration: 30,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/p3j2NZ345-g",
              description: "Copywriting en Darija et Français, avis clients et visuels percutants."
            }
          ]
        },
        {
          title: "Chapitre 2 : Publicités Rentables sur Meta (Facebook/Instagram) & TikTok",
          lessons: [
            {
              title: "Configuration du Business Manager, Pixel et ciblage Wilayas",
              duration: 35,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/v9b8a7c6d5e",
              description: "Stratégies d'enchères, créatifs vidéos et A/B testing publicitaire."
            },
            {
              title: "Quiz : Métriques & Optimisation Publicitaire",
              duration: 15,
              type: "quiz",
              quizData: {
                questions: [
                  { question: "Que signifie un ROAS de 3 sur une campagne ?", options: ["Pour 1 DA dépensé, on génère 3 DA de CA", "On a perdu 3 DA", "Le coût par clic est de 3 DA"], answer: 0 }
                ]
              }
            }
          ]
        },
        {
          title: "Chapitre 3 : Logistique, Livraison 58 Wilayas & Fidélisation",
          lessons: [
            {
              title: "Négocier avec les livreurs et gérer le stock sans gaspillage",
              duration: 25,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/x1y2z3a4b5c",
              description: "Suivi des expéditions, bordereaux de retour et gestion de trésorerie."
            }
          ]
        }
      ]
    },
    {
      title: "UI/UX Design Professionnel & Prototypage Avancé avec Figma",
      subtitle: "Créez des expériences numériques élégantes, intuitives et adaptées aux utilisateurs modernes.",
      description: "Apprenez la méthodologie des designers de renommée mondiale. De la recherche utilisateur initiale aux maquettes haute fidélité interactives, vous maîtriserez tous les secrets de Figma : Auto-Layout, Variables, Composants polymorphes et Design Systems complets prêts pour le handover développeurs.",
      category: "Design",
      coachId: userMap["yacine.amrani@tamayuz.dz"].id,
      imageUrl: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1200&q=80",
      language: "fr",
      price: "9900.00",
      durationHours: 28,
      level: "intermediate",
      isFree: false,
      tags: ["UI Design", "UX Design", "Figma", "Design System", "Prototypage"],
      learningObjectives: [
        "Mener des ateliers de recherche UX et formuler des parcours utilisateurs clairs",
        "Exploiter 100% de la puissance de Figma (Auto-layout, Variants, Tokens)",
        "Bâtir un Design System cohérent, évolutif et accessible",
        "Créer des micro-interactions et prototypes animés haute fidélité",
        "Collaborer efficacement avec les équipes de développement"
      ],
      requirements: ["Un compte Figma gratuit", "Sensibilité visuelle et curiosité"],
      targetAudience: ["Graphistes voulant évoluer vers le produit", "Développeurs frontend", "Créateurs d'applications"],
      templateId: defaultTemplateId,
      finalExam: {
        passingScore: 70,
        questions: [
          {
            question: "Quelle fonctionnalité Figma permet de créer des éléments d'interface qui s'adaptent automatiquement à leur contenu ?",
            options: ["Auto Layout", "Pen Tool", "Slice Tool", "Vector Network"],
            answer: 0
          },
          {
            question: "En ergonomie d'interface (UX), que désigne l'affordance d'un bouton ?",
            options: ["Sa couleur de fond", "Sa capacité visuelle à suggérer qu'il est cliquable", "Son poids en kilo-octets", "Sa police de caractères"],
            answer: 1
          }
        ]
      },
      chapters: [
        {
          title: "Chapitre 1 : Les Fondements de l'UX et la Pensée Design",
          lessons: [
            {
              title: "Comprendre l'utilisateur : Wireframing et Architecture de l'information",
              duration: 30,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/c9Wg6Cb_YlU",
              description: "Définition des personas, user flows et maquettage basse fidélité."
            }
          ]
        },
        {
          title: "Chapitre 2 : Maîtrise Avancée de Figma",
          lessons: [
            {
              title: "Auto-Layout 5.0, Contraintes et Responsive Design",
              duration: 40,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/T6Zp8PzBvN4",
              description: "Créer des interfaces fluides qui s'adaptent du mobile au grand écran."
            },
            {
              title: "Kit UI Figma Tamayuz téléchargeable",
              duration: 15,
              type: "pdf",
              pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              description: "Guide d'utilisation des composants et bibliothèques partagées."
            }
          ]
        }
      ]
    },
    {
      title: "Comptabilité Pratique, Fiscalité & Facturation en Algérie",
      subtitle: "Sécurisez la conformité financière de votre activité : statuts, impôts, télé-déclarations et gestion de trésorerie.",
      description: "Une formation indispensable pour tout créateur d'entreprise, commerçant, dirigeant de PME ou freelance en Algérie. Découvrez les statuts juridiques les plus avantageux (Auto-entrepreneur, SARL, EURL), la gestion de la TVA, de l'IRG, de l'IBS, et maîtrisez la facturation légale et les télé-déclarations fiscales sur Jibayatik.",
      category: "Finance",
      coachId: userMap["karim.boussaid@tamayuz.dz"].id,
      imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80",
      language: "fr",
      price: "11000.00",
      durationHours: 20,
      level: "beginner",
      isFree: false,
      tags: ["Finance", "Comptabilité", "Fiscalité", "Algérie", "Jibayatik", "Entreprise"],
      learningObjectives: [
        "Choisir le régime fiscal le plus avantageux pour son activité",
        "Établir des factures et devis 100% conformes à la législation algérienne",
        "Comprendre le fonctionnement des impôts directs et indirects (IRG, IBS, TVA, TAP)",
        "Effectuer ses télé-déclarations en ligne sur le portail Jibayatik",
        "Suivre sa trésorerie pour éviter les pénalités et optimiser ses coûts"
      ],
      requirements: ["Aucune formation préalable en comptabilité n'est requise"],
      targetAudience: ["Chefs d'entreprises et gérants", "Auto-entrepreneurs et freelances", "Comptables juniors"],
      templateId: bizTemplateId,
      finalExam: {
        passingScore: 70,
        questions: [
          {
            question: "En Algérie, quel est le taux normal de la Taxe sur la Valeur Ajoutée (TVA) ?",
            options: ["9%", "19%", "25%", "15%"],
            answer: 1
          },
          {
            question: "Quel portail gouvernemental algérien permet la télé-déclaration et le télé-paiement des impôts ?",
            options: ["Jibayatik", "BaridiNet", "El-Moukawil", "Tawssil"],
            answer: 0
          }
        ]
      },
      chapters: [
        {
          title: "Chapitre 1 : Le Cadre Légal et Fiscal des Entreprises en Algérie",
          lessons: [
            {
              title: "Auto-entrepreneur, EURL, SARL : quel statut choisir ?",
              duration: 25,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/kJQP7kiw5Fk",
              description: "Comparatif des régimes réels et forfaitaires, charges et avantages."
            },
            {
              title: "Les mentions légales obligatoires sur une facture commerciale",
              duration: 20,
              type: "pdf",
              pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              description: "Modèle de facture conforme avec RC, NIF, NIS et mentions TVA."
            }
          ]
        },
        {
          title: "Chapitre 2 : Déclarations Fiscales & Utilisation de Jibayatik",
          lessons: [
            {
              title: "Tutoriel pas à pas : Remplir sa déclaration G50 en ligne",
              duration: 35,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/fJ9rUzIMcZQ",
              description: "Calcul des acomptes, déclarations mensuelles et paiements électroniques."
            }
          ]
        }
      ]
    },
    {
      title: "Fondamentaux du Freelancing & Lancement de Startup (Gratuit)",
      subtitle: "Trouvez vos premiers clients, fixez vos tarifs et développez une activité indépendante florissante.",
      description: "Une formation 100% offerte par la communauté Tamayuz pour aider chaque talent algérien à monétiser ses compétences. Vous y apprendrez à structurer votre portfolio, à rédiger des propositions commerciales percutantes, à négocier vos prix sans brader votre travail et à gérer vos premiers projets clients en toute sérénité.",
      category: "Entrepreneuriat",
      coachId: userMap["coach.ahmed@tamayuz.com"].id,
      imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
      language: "fr",
      price: "0.00",
      durationHours: 12,
      level: "beginner",
      isFree: true,
      tags: ["Freelancing", "Startup", "Entrepreneuriat", "Gratuit", "Carrière"],
      learningObjectives: [
        "Créer un portfolio percutant qui convertit les prospects en clients",
        "Fixer ses tarifs au juste prix (taux journalier ou forfait)",
        "Trouver des clients en Algérie et sur les plateformes internationales",
        "Rédiger un contrat de prestation clair pour éviter les impayés"
      ],
      requirements: ["Avoir une compétence à proposer (Dev, Design, Rédaction, Marketing, etc.)"],
      targetAudience: ["Débutants dans le freelancing", "Étudiants cherchant un complément de revenu", "Professionnels indépendants"],
      templateId: defaultTemplateId,
      finalExam: {
        passingScore: 60,
        questions: [
          {
            question: "Quelle stratégie est conseillée pour un freelance qui démarre afin de gagner en crédibilité ?",
            options: ["Travailler gratuitement à vie", "Construire 2 à 3 études de cas réelles et détaillées", "Ne jamais répondre aux emails", "Cacher ses coordonnées"],
            answer: 1
          }
        ]
      },
      chapters: [
        {
          title: "Chapitre 1 : Définir son Offre et Trouver ses Premiers Clients",
          lessons: [
            {
              title: "Comment se positionner en expert plutôt qu'en simple exécutant",
              duration: 25,
              type: "video",
              videoUrl: "https://www.youtube.com/embed/L_LUpnjgPso",
              description: "Définition de son offre irrésistible et prospection ciblée sur LinkedIn."
            },
            {
              title: "Contrat type de freelance téléchargeable",
              duration: 10,
              type: "pdf",
              pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
              description: "Modèle de contrat protégeant les droits d'auteur et les échéances de paiement."
            }
          ]
        }
      ]
    }
  ];

  const courseMap = {};
  for (const c of coursesData) {
    const courseRows = await queryNeon(
      `INSERT INTO courses (
        title, subtitle, description, category, image_url, language, price, duration_hours,
        level, is_free, tags, learning_objectives, requirements, target_audience, coach_id,
        is_published, certificate_template_id, final_exam, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true, $16, $17, NOW(), NOW())
      RETURNING id, title;`,
      [
        c.title,
        c.subtitle,
        c.description,
        c.category,
        c.imageUrl,
        c.language,
        c.price,
        c.durationHours,
        c.level,
        c.isFree,
        JSON.stringify(c.tags),
        JSON.stringify(c.learningObjectives),
        JSON.stringify(c.requirements),
        JSON.stringify(c.targetAudience),
        c.coachId,
        c.templateId,
        JSON.stringify(c.finalExam)
      ]
    );
    const createdCourse = courseRows[0];
    courseMap[c.title] = createdCourse;

    // Insertion des chapitres et leçons
    let chapterOrder = 1;
    for (const ch of c.chapters) {
      const chapterRows = await queryNeon(
        `INSERT INTO chapters (course_id, title, description, "order", created_at)
         VALUES ($1, $2, $3, $4, NOW()) RETURNING id;`,
        [createdCourse.id, ch.title, `Contenu détaillé pour ${ch.title}`, chapterOrder++]
      );
      const createdChapter = chapterRows[0];

      let lessonOrder = 1;
      for (const l of ch.lessons) {
        await queryNeon(
          `INSERT INTO lessons (
            course_id, chapter_id, title, description, "order", duration_minutes,
            type, video_url, pdf_url, quiz_data, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW());`,
          [
            createdCourse.id,
            createdChapter.id,
            l.title,
            l.description,
            lessonOrder++,
            l.duration,
            l.type,
            l.videoUrl ?? null,
            l.pdfUrl ?? null,
            l.quizData ? JSON.stringify(l.quizData) : null
          ]
        );
      }
    }
  }
  console.log(`✔ 6 cours complets avec chapitres, leçons vidéos, PDFs et examens finaux créés.`);

  // 7. Insertion des Codes Promos (Coupons)
  console.log("\n7. Création des codes promotionnels...");
  const couponsToInsert = [
    { code: "TAMAYUZ2026", discount: 20, maxUses: 500, used: 14, active: true },
    { code: "BIENVENUE30", discount: 30, maxUses: 100, used: 28, active: true },
    { code: "RAMADAN50", discount: 50, maxUses: 50, used: 5, active: true },
    { code: "EXCELLENCE10", discount: 10, maxUses: 1000, used: 42, active: true },
    { code: "TECH100", discount: 100, maxUses: 10, used: 1, active: true },
    { code: "PROMOSTUDENT", discount: 25, maxUses: 200, used: 18, active: true },
    { code: "EXPIREDCODE", discount: 15, maxUses: 50, used: 50, active: false }
  ];
  for (const coup of couponsToInsert) {
    await queryNeon(
      `INSERT INTO coupons (code, discount_percent, max_uses, used_count, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) ON CONFLICT DO NOTHING;`,
      [coup.code, coup.discount, coup.maxUses, coup.used, coup.active]
    );
  }
  console.log(`✔ ${couponsToInsert.length} codes promos configurés.`);

  // 8. Insertion des Achats, Factures, Commissions & Inscriptions Réelles
  console.log("\n8. Création des flux d'achats, factures et commissions vérifiées...");
  
  const cWeb = courseMap["Développement Web Fullstack Moderne (React 19, TypeScript & Node.js)"];
  const cAI = courseMap["Intelligence Artificielle & Automatisation (LLMs, Agents & Python)"];
  const cMkt = courseMap["E-Commerce & Publicité Digitale en Algérie (Meta Ads, TikTok & Vente Locale)"];
  const cUI = courseMap["UI/UX Design Professionnel & Prototypage Avancé avec Figma"];
  const cFin = courseMap["Comptabilité Pratique, Fiscalité & Facturation en Algérie"];
  const cFree = courseMap["Fondamentaux du Freelancing & Lancement de Startup (Gratuit)"];

  const uYassine = userMap["student@tamayuz.dz"];
  const uMeriem = userMap["meriem.saidi@tamayuz.dz"];
  const uKhadija = userMap["khadija.zerrouk@tamayuz.dz"];
  const uWalid = userMap["walid.taleb@tamayuz.dz"];

  // Achat 1 : Yassine achète le cours Webdev avec coupon TAMAYUZ2026 (12,000 - 2,400 = 9,600 DZD)
  const [p1] = await queryNeon(
    `INSERT INTO purchases (user_id, course_id, amount, currency, coupon_code, discount_applied, status, payment_method, paid_at)
     VALUES ($1, $2, '9600.00', 'DZD', 'TAMAYUZ2026', '2400.00', 'paid', 'baridimob', NOW() - INTERVAL '5 days')
     RETURNING id;`,
    [uYassine.id, cWeb.id]
  );
  await queryNeon(`INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES ($1, $2, NOW() - INTERVAL '5 days') ON CONFLICT DO NOTHING;`, [uYassine.id, cWeb.id]);
  await queryNeon(
    `INSERT INTO invoices (invoice_number, user_id, purchase_id, amount, currency, status, issued_at, paid_at, notes, created_at)
     VALUES ('INV-2026-001', $1, $2, '9600.00', 'DZD', 'paid', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', 'Paiement BaridiMob validé avec succès.', NOW());`,
    [uYassine.id, p1.id]
  );
  await queryNeon(
    `INSERT INTO commissions (coach_id, purchase_id, course_id, amount, currency, rate_percent, status, is_paid, paid_at, created_at)
     VALUES ($1, $2, $3, '6720.00', 'DZD', '70.00', 'paid', true, NOW() - INTERVAL '1 day', NOW());`,
    [userMap["coach@tamayuz.dz"].id, p1.id, cWeb.id]
  );

  // Achat 2 : Meriem achète le cours E-Commerce (8,500 DZD)
  const [p2] = await queryNeon(
    `INSERT INTO purchases (user_id, course_id, amount, currency, coupon_code, discount_applied, status, payment_method, paid_at)
     VALUES ($1, $2, '8500.00', 'DZD', NULL, '0.00', 'paid', 'ccp', NOW() - INTERVAL '3 days')
     RETURNING id;`,
    [uMeriem.id, cMkt.id]
  );
  await queryNeon(`INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES ($1, $2, NOW() - INTERVAL '3 days') ON CONFLICT DO NOTHING;`, [uMeriem.id, cMkt.id]);
  await queryNeon(
    `INSERT INTO invoices (invoice_number, user_id, purchase_id, amount, currency, status, issued_at, paid_at, notes, created_at)
     VALUES ('INV-2026-002', $1, $2, '8500.00', 'DZD', 'paid', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'Virement CCP validé.', NOW());`,
    [uMeriem.id, p2.id]
  );
  await queryNeon(
    `INSERT INTO commissions (coach_id, purchase_id, course_id, amount, currency, rate_percent, status, is_paid, created_at)
     VALUES ($1, $2, $3, '5950.00', 'DZD', '70.00', 'pending', false, NOW());`,
    [userMap["samira.hadj@tamayuz.dz"].id, p2.id, cMkt.id]
  );

  // Achat 3 : Khadija achète le cours UI/UX (9,900 DZD)
  const [p3] = await queryNeon(
    `INSERT INTO purchases (user_id, course_id, amount, currency, coupon_code, discount_applied, status, payment_method, paid_at)
     VALUES ($1, $2, '9900.00', 'DZD', NULL, '0.00', 'paid', 'baridimob', NOW() - INTERVAL '2 days')
     RETURNING id;`,
    [uKhadija.id, cUI.id]
  );
  await queryNeon(`INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES ($1, $2, NOW() - INTERVAL '2 days') ON CONFLICT DO NOTHING;`, [uKhadija.id, cUI.id]);
  await queryNeon(
    `INSERT INTO invoices (invoice_number, user_id, purchase_id, amount, currency, status, issued_at, paid_at, notes, created_at)
     VALUES ('INV-2026-003', $1, $2, '9900.00', 'DZD', 'paid', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'Facture acquittée.', NOW());`,
    [uKhadija.id, p3.id]
  );

  // Inscription gratuite : Walid s'inscrit au cours Freelancing Gratuit
  await queryNeon(`INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES ($1, $2, NOW() - INTERVAL '1 day') ON CONFLICT DO NOTHING;`, [uWalid.id, cFree.id]);

  console.log("✔ Achats, factures et commissions vérifiées créés.");

  // 9. Progression complète & Certificats Vérifiables
  console.log("\n9. Génération des progressions et certifications d'excellence...");
  // Marquer toutes les leçons du cours Web pour Yassine comme terminées
  const webLessons = await queryNeon(`SELECT id FROM lessons WHERE course_id = $1;`, [cWeb.id]);
  for (const l of webLessons) {
    await queryNeon(
      `INSERT INTO progress (user_id, lesson_id, is_completed, last_position_seconds, updated_at)
       VALUES ($1, $2, true, 180, NOW()) ON CONFLICT DO NOTHING;`,
      [uYassine.id, l.id]
    );
  }
  // Examen réussi à 100%
  await queryNeon(
    `INSERT INTO exam_attempts (user_id, course_id, score, passed, attempted_at)
     VALUES ($1, $2, 100, true, NOW() - INTERVAL '1 day');`,
    [uYassine.id, cWeb.id]
  );
  // Certificat délivré avec code vérifiable publiquement
  const certCode = "ST-179399-WEB-9842";
  await queryNeon(
    `INSERT INTO certificates (user_id, course_id, certificate_code, issued_at, student_name, course_name, coach_name, exam_score, template_id)
     VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', $4, $5, $6, 100, $7);`,
    [uYassine.id, cWeb.id, certCode, uYassine.name, cWeb.title, "Dr. Sofiane Meziani", techTemplateId]
  );
  console.log(`✔ Certificat officiel émis avec succès pour Yassine Mansouri (Code vérifiable : ${certCode})`);

  // 10. Avis et Témoignages Étudiants (Course Reviews)
  console.log("\n10. Publication d'avis et retours d'expérience authentiques...");
  const reviews = [
    {
      courseId: cWeb.id,
      userId: uYassine.id,
      rating: 5,
      comment: "Une formation d'un niveau exceptionnel ! Le Dr. Meziani explique chaque concept avec une clarté remarquable. J'ai pu monter mon premier projet React & Node.js en moins de 3 semaines et valider mon certificat avec 100% à l'examen."
    },
    {
      courseId: cWeb.id,
      userId: uWalid.id,
      rating: 5,
      comment: "Le contenu sur l'architecture en couches et PostgreSQL est exactement ce qui manque aux tutoriels classiques. Très professionnel et direct au but."
    },
    {
      courseId: cMkt.id,
      userId: uMeriem.id,
      rating: 5,
      comment: "Grâce à cette formation de Mme. Hadj, j'ai optimisé mes publicités TikTok et divisé par deux le coût d'acquisition de ma boutique d'artisanat. Les astuces sur la confirmation téléphonique ont sauvé mon taux de livraison !"
    },
    {
      courseId: cUI.id,
      userId: uKhadija.id,
      rating: 5,
      comment: "Yacine Amrani maîtrise Figma à la perfection. La section sur les Design Systems et les tokens a complètement transformé ma manière de concevoir des interfaces."
    },
    {
      courseId: cFin.id,
      userId: uYassine.id,
      rating: 5,
      comment: "Très clair et synthétique sur la fiscalité algérienne. Le tutoriel Jibayatik et les modèles de factures m'ont évité de commettre des erreurs coûteuses."
    },
    {
      courseId: cFree.id,
      userId: uWalid.id,
      rating: 5,
      comment: "Formation gratuite mais d'une valeur inestimable pour quiconque veut se lancer en freelance. Le contrat type fourni est une pépite."
    }
  ];
  for (const rev of reviews) {
    await queryNeon(
      `INSERT INTO course_reviews (course_id, user_id, rating, comment, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');`,
      [rev.courseId, rev.userId, rev.rating, rev.comment]
    );
  }
  console.log(`✔ ${reviews.length} avis 5 étoiles insérés.`);

  // 11. Commentaires & Q&A sous les leçons
  console.log("\n11. Création de fils de discussion Q&A sur les leçons...");
  const firstLesson = webLessons[0];
  if (firstLesson) {
    const [q1] = await queryNeon(
      `INSERT INTO lesson_comments (lesson_id, user_id, content, created_at, updated_at)
       VALUES ($1, $2, $3, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days')
       RETURNING id;`,
      [firstLesson.id, uYassine.id, "Bonjour Docteur, pour un projet d'envergure, recommandez-vous de séparer le frontend et l'API dans deux dépôts distincts ou un monorepo ?"]
    );
    await queryNeon(
      `INSERT INTO lesson_comments (lesson_id, user_id, parent_id, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');`,
      [
        firstLesson.id,
        userMap["coach@tamayuz.dz"].id,
        q1.id,
        "Bonjour Yassine ! Pour une petite équipe, le monorepo avec pnpm ou turborepo offre une excellente productivité car vous partagez les types TypeScript. Dès que l'équipe grandit au-delà de 5 personnes, deux dépôts indépendants avec CI/CD dédiée deviennent plus flexibles."
      ]
    );
  }
  console.log("✔ Fil de discussion Q&A interactif créé.");

  // 12. Annonces Officielles de la Plateforme
  console.log("\n12. Publication des annonces officielles...");
  const announcements = [
    {
      title: "🎉 Bienvenue sur Tamayuz — La Première Plateforme Algérienne de Formation Certifiante",
      content: "Nous sommes fiers de lancer officiellement la plateforme Tamayuz ! Accédez à des formations de niveau international dispensées par les meilleurs experts et professeurs algériens.",
      type: "announcement",
      pinned: true
    },
    {
      title: "🚀 Nouveaux Parcours IA & Cloud Disponibles",
      content: "Découvrez notre nouveau cursus intensif en Intelligence Artificielle Générative et Automatisation des Agents. Certificats vérifiables délivrés à l'issue de l'examen final.",
      type: "announcement",
      pinned: false
    },
    {
      title: "📢 Paiements BaridiMob & CCP Validés en Moins de 2 Heures",
      content: "Notre équipe administrative valide vos reçus de virement BaridiMob et CCP 7j/7 pour un déblocage immédiat de vos cours.",
      type: "announcement",
      pinned: false
    }
  ];
  for (const a of announcements) {
    await queryNeon(
      `INSERT INTO announcements (author_id, title, content, type, is_published, is_pinned, is_approved, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, $5, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');`,
      [userMap["admin@tamayuz.dz"].id, a.title, a.content, a.type, a.pinned]
    );
  }
  console.log(`✔ ${announcements.length} annonces officielles publiées.`);

  // 13. Audit Logs Initiaux (Traçabilité complète)
  console.log("\n13. Enregistrement de l'historique d'audit système...");
  const auditEntries = [
    { action: "PLATFORM_INITIALIZATION", entity: "system", id: null, details: { status: "production_ready", database: "Neon PostgreSQL" } },
    { action: "APPROVE_COACH", entity: "user", id: userMap["coach@tamayuz.dz"].id, details: { coachName: "Dr. Sofiane Meziani" } },
    { action: "APPROVE_COACH", entity: "user", id: userMap["samira.hadj@tamayuz.dz"].id, details: { coachName: "Samira Hadj" } },
    { action: "PUBLISH_COURSE", entity: "course", id: cWeb.id, details: { title: cWeb.title } },
    { action: "PUBLISH_COURSE", entity: "course", id: cAI.id, details: { title: cAI.title } },
    { action: "VERIFY_PAYMENT_RECEIPT", entity: "purchase", id: p1.id, details: { invoice: "INV-2026-001", method: "baridimob" } },
    { action: "EXAM_PASSED", entity: "exam_attempt", id: cWeb.id, details: { user: "Yassine Mansouri", score: 100 } }
  ];
  for (const aud of auditEntries) {
    await queryNeon(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, '127.0.0.1', NOW() - INTERVAL '1 day');`,
      [userMap["admin@tamayuz.dz"].id, aud.action, aud.entity, aud.id, JSON.stringify(aud.details)]
    );
  }
  console.log("✔ Historique d'audit complet généré.");

  console.log("\n==================================================================");
  console.log("🎉 MIGRATION TERMINÉE AVEC SUCCÈS SUR LA BASE NEON DE PRODUCTION !");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("❌ ERREUR LORS DE LA MIGRATION :", err);
  process.exit(1);
});
