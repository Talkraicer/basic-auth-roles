import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { LeaderRoute } from "@/components/LeaderRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import SelfFeedback from "./pages/feedback/SelfFeedback";
import LeaderFeedback from "./pages/feedback/LeaderFeedback";
import FeedbackList from "./pages/feedback/FeedbackList";
import { GroupsList } from "./pages/groups/GroupsList";
import { GroupDetail } from "./pages/groups/GroupDetail";
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback/self"
              element={
                <ProtectedRoute>
                  <SelfFeedback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback/leader"
              element={
                <ProtectedRoute>
                  <LeaderFeedback />
                </ProtectedRoute>
              }
            />
            <Route
              path="/feedback/list"
              element={
                <ProtectedRoute>
                  <FeedbackList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <LeaderRoute>
                    <GroupsList />
                  </LeaderRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupname"
              element={
                <ProtectedRoute>
                  <LeaderRoute>
                    <GroupDetail />
                  </LeaderRoute>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
