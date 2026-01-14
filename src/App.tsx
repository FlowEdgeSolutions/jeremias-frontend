import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { AdminOrProjectManagerRoute, AdminRoute, InternalRoute } from "@/components/common";

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

import { PortalLoginPage } from "@/pages/portal/PortalLoginPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppIndexRedirect = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/portal/login" replace />;
  return <Navigate to={currentUser.role === "admin" ? "/app/leads" : "/app/projects"} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Redirect root to app */}
            <Route path="/" element={<Navigate to="/app" replace />} />

            {/* Internal App Routes - Protected for admin + project_manager */}
            <Route path="/app" element={
              <InternalRoute>
                <AppLayout />
              </InternalRoute>
            }>
              <Route index element={<AppIndexRedirect />} />
              <Route path="leads" element={<AdminRoute><LeadsPage /></AdminRoute>} />
              <Route path="customers" element={<AdminRoute><CustomersPage /></AdminRoute>} />
              <Route path="customers/:id" element={<AdminRoute><CustomerDetailPage /></AdminRoute>} />
              <Route path="projects" element={<AdminOrProjectManagerRoute><ProjectsPage /></AdminOrProjectManagerRoute>} />
              <Route path="projects/new" element={<AdminRoute><CreateProjectPage /></AdminRoute>} />
              <Route path="projects/:id" element={<AdminOrProjectManagerRoute><ProjectDetailPage /></AdminOrProjectManagerRoute>} />
              <Route path="finance" element={<AdminRoute><FinancePage /></AdminRoute>} />
              <Route path="quality" element={<AdminRoute><QualityPage /></AdminRoute>} />
              <Route path="archive" element={<AdminOrProjectManagerRoute><ArchivePage /></AdminOrProjectManagerRoute>} />
              <Route path="emails" element={<AdminRoute><EmailsPage /></AdminRoute>} />
              <Route path="emails/callback" element={<AdminRoute><EmailCallbackPage /></AdminRoute>} />
              <Route path="users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
              <Route path="profile" element={<AdminOrProjectManagerRoute><ProfilePage /></AdminOrProjectManagerRoute>} />
              <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
            </Route>

            {/* Login */}
            <Route path="/portal/login" element={<PortalLoginPage />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
