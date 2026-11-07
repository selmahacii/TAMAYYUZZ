import { Switch, Route, Router as WouterRouter, Redirect, useParams } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import NotFound from "@/pages/not-found";

import SplashPage from "@/pages/SplashPage";
import OnboardingPage from "@/pages/OnboardingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import MarketplacePage from "@/pages/MarketplacePage";
import CoursePublicDetailPage from "@/pages/CoursePublicDetailPage";
import CertificatePublicPage from "@/pages/CertificatePublicPage";

import StudentHomePage from "@/pages/student/HomePage";
import StudentExplorePage from "@/pages/student/ExploreCoursesPage";
import MyCoursesPage from "@/pages/student/MyCoursesPage";
import StudentProfilePage from "@/pages/student/ProfilePage";
import StudentLearningPage from "@/pages/student/LearningPage";
import StudentExamPage from "@/pages/student/ExamPage";
import StudentCertificatesPage from "@/pages/student/CertificatesPage";
import StudentPurchasesPage from "@/pages/student/PurchasesPage";
import StudentSupportPage from "@/pages/student/SupportPage";
import HelpCenterPage from "@/pages/HelpCenterPage";

import CoachDashboardPage from "@/pages/coach/DashboardPage";
import CourseFormPage from "@/pages/coach/CourseFormPage";
import CoachProfilePage from "@/pages/coach/ProfilePage";
import LessonsPage from "@/pages/coach/LessonsPage";
import CoachStudentsPage from "@/pages/coach/StudentsPage";
import CoachPriceRequestsPage from "@/pages/coach/PriceRequestsPage";
import CoachAnnouncementsPage from "@/pages/coach/AnnouncementsPage";
import CoachCoursesPage from "@/pages/coach/CoursesPage";
import CoachEarningsPage from "@/pages/coach/EarningsPage";

import AdminDashboardPage from "@/pages/admin/DashboardPage";
import AdminAnalyticsPage from "@/pages/admin/AnalyticsPage";
import AdminCoachesPage from "@/pages/admin/CoachesPage";
import AdminCoursesPage from "@/pages/admin/CoursesPage";
import AdminUsersPage from "@/pages/admin/UsersPage";
import AdminCouponsPage from "@/pages/admin/CouponsPage";
import AdminReportsPage from "@/pages/admin/ReportsPage";
import AdminTicketsPage from "@/pages/admin/TicketsPage";
import AdminCategoriesPage from "@/pages/admin/CategoriesPage";
import AdminCentersPage from "@/pages/admin/CentersPage";
import AdminPriceRequestsPage from "@/pages/admin/PriceRequestsPage";
import AdminPurchasesPage from "@/pages/admin/PurchasesPage";
import AdminInvoicesPage from "@/pages/admin/InvoicesPage";
import AdminCommissionsPage from "@/pages/admin/CommissionsPage";
import AdminPayoutsPage from "@/pages/admin/PayoutsPage";
import AdminKnowledgeBasePage from "@/pages/admin/KnowledgeBasePage";
import AdminAnnouncementsPage from "@/pages/admin/AnnouncementsPage";
import AdminCertTemplatesPage from "@/pages/admin/CertTemplatesPage";
import AdminPermissionsPage from "@/pages/admin/PermissionsPage";
import AdminAuditLogPage from "@/pages/admin/AuditLogPage";
import AdminSettingsPage from "@/pages/admin/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
});

// The public course detail page (/course/:id) is the single, canonical
// implementation — it correctly handles both free and paid courses for any
// auth state. This keeps old /student/course/:id links working without
// duplicating (and drifting out of sync with) that logic.
function RedirectToPublicCourse() {
  const { id } = useParams<{ id: string }>();
  return <Redirect to={`/course/${id}`} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/course/:id" component={CoursePublicDetailPage} />
      <Route path="/certificate/:code" component={CertificatePublicPage} />
      <Route path="/help" component={HelpCenterPage} />

      {/* Student */}
      <Route path="/student/home"><ProtectedRoute allowedRoles={["student"]}><StudentHomePage /></ProtectedRoute></Route>
      <Route path="/student/courses"><ProtectedRoute allowedRoles={["student"]}><StudentExplorePage /></ProtectedRoute></Route>
      <Route path="/student/explore"><ProtectedRoute allowedRoles={["student"]}><StudentExplorePage /></ProtectedRoute></Route>
      <Route path="/student/course/:id"><ProtectedRoute allowedRoles={["student"]}><RedirectToPublicCourse /></ProtectedRoute></Route>
      <Route path="/student/my-courses"><ProtectedRoute allowedRoles={["student"]}><MyCoursesPage /></ProtectedRoute></Route>
      <Route path="/student/learn/:id"><ProtectedRoute allowedRoles={["student"]}><StudentLearningPage /></ProtectedRoute></Route>
      <Route path="/student/learn/:id/exam"><ProtectedRoute allowedRoles={["student"]}><StudentExamPage /></ProtectedRoute></Route>
      <Route path="/student/certificates"><ProtectedRoute allowedRoles={["student"]}><StudentCertificatesPage /></ProtectedRoute></Route>
      <Route path="/student/purchases"><ProtectedRoute allowedRoles={["student"]}><StudentPurchasesPage /></ProtectedRoute></Route>
      <Route path="/student/support"><ProtectedRoute allowedRoles={["student"]}><StudentSupportPage /></ProtectedRoute></Route>
      <Route path="/student/profile"><ProtectedRoute allowedRoles={["student"]}><StudentProfilePage /></ProtectedRoute></Route>

      {/* Coach */}
      <Route path="/coach/dashboard"><ProtectedRoute allowedRoles={["coach"]}><CoachDashboardPage /></ProtectedRoute></Route>
      <Route path="/coach/courses"><ProtectedRoute allowedRoles={["coach"]}><CoachCoursesPage /></ProtectedRoute></Route>
      <Route path="/coach/earnings"><ProtectedRoute allowedRoles={["coach"]}><CoachEarningsPage /></ProtectedRoute></Route>
      <Route path="/coach/course/new"><ProtectedRoute allowedRoles={["coach"]}><CourseFormPage /></ProtectedRoute></Route>
      <Route path="/coach/course/:id/edit"><ProtectedRoute allowedRoles={["coach"]}><CourseFormPage /></ProtectedRoute></Route>
      <Route path="/coach/course/:id/lessons"><ProtectedRoute allowedRoles={["coach"]}><LessonsPage /></ProtectedRoute></Route>
      <Route path="/coach/students"><ProtectedRoute allowedRoles={["coach"]}><CoachStudentsPage /></ProtectedRoute></Route>
      <Route path="/coach/course/:id/students"><ProtectedRoute allowedRoles={["coach"]}><CoachStudentsPage /></ProtectedRoute></Route>
      <Route path="/coach/price-requests"><ProtectedRoute allowedRoles={["coach"]}><CoachPriceRequestsPage /></ProtectedRoute></Route>
      <Route path="/coach/announcements"><ProtectedRoute allowedRoles={["coach"]}><CoachAnnouncementsPage /></ProtectedRoute></Route>
      <Route path="/coach/profile"><ProtectedRoute allowedRoles={["coach"]}><CoachProfilePage /></ProtectedRoute></Route>

      {/* Admin */}
      <Route path="/admin/dashboard"><ProtectedRoute allowedRoles={["admin"]}><AdminDashboardPage /></ProtectedRoute></Route>
      <Route path="/admin/analytics"><ProtectedRoute allowedRoles={["admin"]}><AdminAnalyticsPage /></ProtectedRoute></Route>
      <Route path="/admin/coaches"><ProtectedRoute allowedRoles={["admin"]}><AdminCoachesPage /></ProtectedRoute></Route>
      <Route path="/admin/courses"><ProtectedRoute allowedRoles={["admin"]}><AdminCoursesPage /></ProtectedRoute></Route>
      <Route path="/admin/users"><ProtectedRoute allowedRoles={["admin"]}><AdminUsersPage /></ProtectedRoute></Route>
      <Route path="/admin/tickets"><ProtectedRoute allowedRoles={["admin"]}><AdminTicketsPage /></ProtectedRoute></Route>
      <Route path="/admin/categories"><ProtectedRoute allowedRoles={["admin"]}><AdminCategoriesPage /></ProtectedRoute></Route>
      <Route path="/admin/centers"><ProtectedRoute allowedRoles={["admin"]}><AdminCentersPage /></ProtectedRoute></Route>
      <Route path="/admin/price-requests"><ProtectedRoute allowedRoles={["admin"]}><AdminPriceRequestsPage /></ProtectedRoute></Route>
      <Route path="/admin/purchases"><ProtectedRoute allowedRoles={["admin"]}><AdminPurchasesPage /></ProtectedRoute></Route>
      <Route path="/admin/invoices"><ProtectedRoute allowedRoles={["admin"]}><AdminInvoicesPage /></ProtectedRoute></Route>
      <Route path="/admin/commissions"><ProtectedRoute allowedRoles={["admin"]}><AdminCommissionsPage /></ProtectedRoute></Route>
      <Route path="/admin/payouts"><ProtectedRoute allowedRoles={["admin"]}><AdminPayoutsPage /></ProtectedRoute></Route>
      <Route path="/admin/coupons"><ProtectedRoute allowedRoles={["admin"]}><AdminCouponsPage /></ProtectedRoute></Route>
      <Route path="/admin/knowledge-base"><ProtectedRoute allowedRoles={["admin"]}><AdminKnowledgeBasePage /></ProtectedRoute></Route>
      <Route path="/admin/announcements"><ProtectedRoute allowedRoles={["admin"]}><AdminAnnouncementsPage /></ProtectedRoute></Route>
      <Route path="/admin/certificate-templates"><ProtectedRoute allowedRoles={["admin"]}><AdminCertTemplatesPage /></ProtectedRoute></Route>
      <Route path="/admin/permissions"><ProtectedRoute allowedRoles={["admin"]}><AdminPermissionsPage /></ProtectedRoute></Route>
      <Route path="/admin/reports"><ProtectedRoute allowedRoles={["admin"]}><AdminReportsPage /></ProtectedRoute></Route>
      <Route path="/admin/audit-log"><ProtectedRoute allowedRoles={["admin"]}><AdminAuditLogPage /></ProtectedRoute></Route>
      <Route path="/admin/settings"><ProtectedRoute allowedRoles={["admin"]}><AdminSettingsPage /></ProtectedRoute></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
