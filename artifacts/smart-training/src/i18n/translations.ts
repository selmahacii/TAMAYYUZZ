export type Lang = "ar" | "fr" | "en";

export const translations = {
  // NAV
  "nav.marketplace": { ar: "المتجر", fr: "Marché", en: "Marketplace" },
  "nav.dashboard": { ar: "لوحة القيادة", fr: "Tableau de bord", en: "Dashboard" },
  "nav.my_courses": { ar: "دوراتي", fr: "Mes formations", en: "My Courses" },
  "nav.certificates": { ar: "شهاداتي", fr: "Certificats", en: "Certificates" },
  "nav.profile": { ar: "الملف الشخصي", fr: "Profil", en: "Profile" },
  "nav.logout": { ar: "خروج", fr: "Déconnexion", en: "Logout" },
  "nav.login": { ar: "دخول", fr: "Connexion", en: "Login" },
  "nav.register": { ar: "تسجيل", fr: "S'inscrire", en: "Register" },

  // ADMIN SIDEBAR
  "admin.section.principal": { ar: "الرئيسية", fr: "Principal", en: "Principal" },
  "admin.section.catalogue": { ar: "الكتالوج", fr: "Catalogue", en: "Catalogue" },
  "admin.section.finances": { ar: "المالية", fr: "Finances", en: "Finances" },
  "admin.section.gestion": { ar: "الإدارة", fr: "Gestion", en: "Management" },
  "admin.section.system": { ar: "النظام", fr: "Système", en: "System" },

  "admin.analytics": { ar: "التحليلات", fr: "Analytiques", en: "Analytics" },
  "admin.users": { ar: "المستخدمون", fr: "Utilisateurs", en: "Users" },
  "admin.tickets": { ar: "التذاكر", fr: "Tickets", en: "Tickets" },
  "admin.courses": { ar: "الدورات", fr: "Formations", en: "Courses" },
  "admin.categories": { ar: "الفئات", fr: "Catégories", en: "Categories" },
  "admin.centers": { ar: "مراكز التدريب", fr: "Centres de formation", en: "Training Centers" },
  "admin.purchases_history": { ar: "سجل الشراء", fr: "Historique d'achats", en: "Purchase History" },
  "admin.invoices": { ar: "الفواتير", fr: "Factures", en: "Invoices" },
  "admin.commissions": { ar: "العمولات", fr: "Commissions", en: "Commissions" },
  "admin.payouts": { ar: "المدفوعات", fr: "Versements", en: "Payouts" },
  "admin.coupons": { ar: "القسائم", fr: "Coupons", en: "Coupons" },
  "admin.knowledge_base": { ar: "قاعدة المعرفة", fr: "Base de connaissances", en: "Knowledge Base" },
  "admin.announcements": { ar: "الإعلانات", fr: "Annonces", en: "Announcements" },
  "admin.cert_templates": { ar: "قوالب الشهادات", fr: "Modèles certificat", en: "Certificate Templates" },
  "admin.permissions": { ar: "الصلاحيات", fr: "Permissions", en: "Permissions" },
  "admin.reports": { ar: "التقارير", fr: "Rapports", en: "Reports" },
  "admin.audit_log": { ar: "سجل المراجعة", fr: "Journal d'audit", en: "Audit Log" },
  "admin.settings": { ar: "الإعدادات", fr: "Paramètres", en: "Settings" },
  "admin.coaches": { ar: "المدربون", fr: "Coachs", en: "Coaches" },
  "admin.price_requests": { ar: "طلبات التسعير", fr: "Demandes de prix", en: "Price Requests" },

  // COMMON
  "common.save": { ar: "حفظ", fr: "Enregistrer", en: "Save" },
  "common.cancel": { ar: "إلغاء", fr: "Annuler", en: "Cancel" },
  "common.delete": { ar: "حذف", fr: "Supprimer", en: "Delete" },
  "common.edit": { ar: "تعديل", fr: "Modifier", en: "Edit" },
  "common.create": { ar: "إنشاء", fr: "Créer", en: "Create" },
  "common.search": { ar: "بحث", fr: "Rechercher", en: "Search" },
  "common.filter": { ar: "تصفية", fr: "Filtrer", en: "Filter" },
  "common.loading": { ar: "جاري التحميل...", fr: "Chargement...", en: "Loading..." },
  "common.empty": { ar: "لا توجد بيانات", fr: "Aucune donnée", en: "No data" },
  "common.yes": { ar: "نعم", fr: "Oui", en: "Yes" },
  "common.no": { ar: "لا", fr: "Non", en: "No" },
  "common.status.active": { ar: "نشط", fr: "Actif", en: "Active" },
  "common.status.inactive": { ar: "غير نشط", fr: "Inactif", en: "Inactive" },
  "common.status.pending": { ar: "قيد الانتظار", fr: "En attente", en: "Pending" },
  "common.status.approved": { ar: "مقبول", fr: "Approuvé", en: "Approved" },
  "common.status.rejected": { ar: "مرفوض", fr: "Rejeté", en: "Rejected" },

  // TICKETS
  "ticket.open": { ar: "مفتوح", fr: "Ouvert", en: "Open" },
  "ticket.in_progress": { ar: "قيد المعالجة", fr: "En cours", en: "In Progress" },
  "ticket.resolved": { ar: "محلول", fr: "Résolu", en: "Resolved" },
  "ticket.closed": { ar: "مغلق", fr: "Fermé", en: "Closed" },
  "ticket.priority.low": { ar: "منخفض", fr: "Faible", en: "Low" },
  "ticket.priority.medium": { ar: "متوسط", fr: "Moyen", en: "Medium" },
  "ticket.priority.high": { ar: "عالي", fr: "Élevé", en: "High" },
  "ticket.priority.urgent": { ar: "عاجل", fr: "Urgent", en: "Urgent" },

  // COURSES
  "course.free": { ar: "مجاني", fr: "Gratuit", en: "Free" },
  "course.paid": { ar: "مدفوع", fr: "Payant", en: "Paid" },
  "course.beginner": { ar: "مبتدئ", fr: "Débutant", en: "Beginner" },
  "course.intermediate": { ar: "متوسط", fr: "Intermédiaire", en: "Intermediate" },
  "course.advanced": { ar: "متقدم", fr: "Avancé", en: "Advanced" },
  "course.published": { ar: "منشور", fr: "Publié", en: "Published" },
  "course.draft": { ar: "مسودة", fr: "Brouillon", en: "Draft" },

  // COACH SIDEBAR
  "coach.section.principal": { ar: "الرئيسية", fr: "Principal", en: "Principal" },
  "coach.section.content": { ar: "المحتوى", fr: "Contenu", en: "Content" },
  "coach.section.finances": { ar: "المالية", fr: "Finances", en: "Finances" },
  "coach.section.account": { ar: "الحساب", fr: "Compte", en: "Account" },

  "coach.dashboard": { ar: "لوحة القيادة", fr: "Tableau de bord", en: "Dashboard" },
  "coach.courses": { ar: "دوراتي", fr: "Mes formations", en: "My Courses" },
  "coach.students": { ar: "الطالبات", fr: "Étudiantes", en: "Students" },
  "coach.announcements": { ar: "الإعلانات", fr: "Annonces", en: "Announcements" },
  "coach.price_requests": { ar: "طلبات التسعير", fr: "Demandes de prix", en: "Price Requests" },
  "coach.earnings": { ar: "الأرباح", fr: "Revenus", en: "Earnings" },
  "coach.profile": { ar: "الملف الشخصي", fr: "Profil", en: "Profile" },

  "coach.new_course": { ar: "دورة جديدة", fr: "Nouvelle formation", en: "New Course" },
  "coach.manage_content": { ar: "إدارة المحتوى", fr: "Gérer le contenu", en: "Manage Content" },
  "coach.chapters": { ar: "الفصول", fr: "Chapitres", en: "Chapters" },
  "coach.lessons": { ar: "الدروس", fr: "Leçons", en: "Lessons" },
  "coach.add_chapter": { ar: "إضافة فصل", fr: "Ajouter un chapitre", en: "Add Chapter" },
  "coach.add_lesson": { ar: "إضافة درس", fr: "Ajouter une leçon", en: "Add Lesson" },

  // STUDENT SIDEBAR
  "student.section.principal": { ar: "الرئيسية", fr: "Principal", en: "Principal" },
  "student.section.learning": { ar: "التعلّم", fr: "Apprentissage", en: "Learning" },
  "student.section.account": { ar: "الحساب", fr: "Compte", en: "Account" },

  "student.dashboard": { ar: "الرئيسية", fr: "Accueil", en: "Home" },
  "student.marketplace": { ar: "المتجر", fr: "Marketplace", en: "Marketplace" },
  "student.my_courses": { ar: "دوراتي", fr: "Mes formations", en: "My Courses" },
  "student.certificates": { ar: "شهاداتي", fr: "Certificats", en: "Certificates" },
  "student.purchases": { ar: "مشترياتي", fr: "Mes achats", en: "My Purchases" },
  "student.support": { ar: "الدعم الفني", fr: "Support", en: "Support" },
  "nav.help_center": { ar: "مركز المساعدة", fr: "Centre d'aide", en: "Help Center" },
  "student.profile": { ar: "الملف الشخصي", fr: "Profil", en: "Profile" },

  // MARKETPLACE
  "marketplace.title": { ar: "استكشفي دورات جديدة", fr: "Découvrez de nouvelles formations", en: "Discover new courses" },
  "marketplace.subtitle": { ar: "دورات معتمدة من مدربات وخبيرات لمساعدتك على تطوير مسيرتك المهنية", fr: "Des formations certifiées par des coachs expertes pour développer votre carrière", en: "Certified courses from expert coaches to grow your career" },
  "marketplace.search_placeholder": { ar: "ابحثي عن دورة، مهارة أو مدربة...", fr: "Rechercher une formation, une compétence, une coach...", en: "Search a course, skill, or coach..." },
  "marketplace.all_categories": { ar: "كل الفئات", fr: "Toutes les catégories", en: "All Categories" },
  "marketplace.all_levels": { ar: "كل المستويات", fr: "Tous les niveaux", en: "All Levels" },
  "marketplace.free_only": { ar: "مجاني فقط", fr: "Gratuit uniquement", en: "Free only" },
  "marketplace.paid_only": { ar: "مدفوع فقط", fr: "Payant uniquement", en: "Paid only" },
  "marketplace.sort_newest": { ar: "الأحدث", fr: "Plus récentes", en: "Newest" },
  "marketplace.sort_popular": { ar: "الأكثر شعبية", fr: "Plus populaires", en: "Most popular" },
  "marketplace.no_results": { ar: "لا توجد دورات مطابقة", fr: "Aucune formation trouvée", en: "No courses found" },
  "marketplace.enroll_free": { ar: "التسجيل مجانًا", fr: "S'inscrire gratuitement", en: "Enroll for free" },
  "marketplace.buy_now": { ar: "الشراء الآن", fr: "Acheter maintenant", en: "Buy now" },
  "marketplace.continue_learning": { ar: "متابعة التعلّم", fr: "Continuer l'apprentissage", en: "Continue learning" },
  "marketplace.signup_cta_title": { ar: "ابدئي رحلتك التعليمية اليوم", fr: "Commencez votre parcours dès aujourd'hui", en: "Start your learning journey today" },
  "marketplace.signup_cta_body": { ar: "أنشئي حسابًا مجانيًا للوصول إلى مئات الدورات وتتبع تقدمك والحصول على شهادات معتمدة.", fr: "Créez un compte gratuit pour accéder à des centaines de formations, suivre votre progression et obtenir des certificats.", en: "Create a free account to access hundreds of courses, track your progress, and earn certificates." },
  "marketplace.create_free_account": { ar: "إنشاء حساب مجاني", fr: "Créer un compte gratuit", en: "Create a free account" },
  "marketplace.login_prompt": { ar: "لديك حساب بالفعل؟", fr: "Vous avez déjà un compte ?", en: "Already have an account?" },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key]?.[lang] ?? key;
}
