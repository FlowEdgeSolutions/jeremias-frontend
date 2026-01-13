import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layouts/AppLayout";
import { PortalLayout } from "@/components/layouts/PortalLayout";
import { InternalRoute, CustomerRoute } from "@/components/common";

// App Pages
import { LeadsPage } from "@/pages/app/LeadsPage";
import { CustomersPage } from "@/pages/app/CustomersPage";
import { CustomerDetailPage } from "@/pages/app/CustomerDetailPage";
import { ProjectsPage } from "@/pages/app/ProjectsPage";
import { ProjectDetailPage } from "@/pages/app/ProjectDetailPage";
import { CreateProjectPage } from "@/pages/app/CreateProjectPage";
import { FinancePage } from "@/pages/app/FinancePage";
import { QualityPage } from "@/pages/app/QualityPage";
import { ArchivePage } from "@/pages/app/ArchivePage";
import { EmailsPage } from "@/pages/app/EmailsPage";
import { EmailCallbackPage } from "@/pages/app/EmailCallbackPage";
import { ProfilePage } from "@/pages/app/ProfilePage";
import { UserManagementPage } from "@/pages/app/UserManagementPage";
import { SettingsPage } from "@/pages/app/SettingsPage";

// Portal Pages
import { PortalLoginPage } from "@/pages/portal/PortalLoginPage";
import { PortalDashboardPage } from "@/pages/portal/PortalDashboardPage";
import { PortalProjectsPage } from "@/pages/portal/PortalProjectsPage";
import { PortalProjectDetailPage } from "@/pages/portal/PortalProjectDetailPage";
import { PortalOrderPage } from "@/pages/portal/PortalOrderPage";
import { PortalInvoicesPage } from "@/pages/portal/PortalInvoicesPage";
import { PortalAccountPage } from "@/pages/portal/PortalAccountPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Redirect root to app */}
            <Route path="/" element={<Navigate to="/app/leads" replace />} />

            {/* Internal App Routes - Protected for admin, sales, project_member */}
            <Route path="/app" element={
              <InternalRoute>
                <AppLayout />
              </InternalRoute>
            }>
              <Route index element={<Navigate to="/app/leads" replace />} />
              <Route path="leads" element={<LeadsPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/new" element={<CreateProjectPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="finance" element={<FinancePage />} />
              <Route path="quality" element={<QualityPage />} />
              <Route path="archive" element={<ArchivePage />} />
              <Route path="emails" element={<EmailsPage />} />
              <Route path="emails/callback" element={<EmailCallbackPage />} />
              <Route path="users" element={<UserManagementPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Portal Routes - Protected for customers */}
            <Route path="/portal/login" element={<PortalLoginPage />} />
            <Route path="/portal" element={
              <CustomerRoute>
                <PortalLayout />
              </CustomerRoute>
            }>
              <Route index element={<Navigate to="/portal/dashboard" replace />} />
              <Route path="dashboard" element={<PortalDashboardPage />} />
              <Route path="projects" element={<PortalProjectsPage />} />
              <Route path="projects/:id" element={<PortalProjectDetailPage />} />
              <Route path="orders/new" element={<PortalOrderPage />} />
              <Route path="invoices" element={<PortalInvoicesPage />} />
              <Route path="account" element={<PortalAccountPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
