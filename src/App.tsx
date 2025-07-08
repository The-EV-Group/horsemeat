
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/auth/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Layout } from "@/components/shared/Layout";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import NewContractor from "./pages/contractors/New";
import SearchContractors from "./pages/contractors/Search";
import PotentialRecruits from "./pages/recruits/List";
import AISearch from "./pages/AISearch";
import ManageKeywords from "./pages/keywords/Manage";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contractors/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewContractor />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/contractors/search"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SearchContractors />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruits"
              element={
                <ProtectedRoute>
                  <Layout>
                    <PotentialRecruits />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-search"
              element={
                <ProtectedRoute>
                  <Layout>
                    <AISearch />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/keywords"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ManageKeywords />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Account />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
