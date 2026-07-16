import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginForm } from "./components/auth/LoginForm";
import { ProtectedRoute } from "./pages/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Members from "./pages/Members";
import QRCodes from "./pages/QRCodes";
import ScanMode from "./pages/ScanMode";
import Memberships from "./pages/Memberships";
import EmailCenter from "./pages/EmailCenter";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import Revenue from "./pages/Revenue";
import Attendance from "./pages/Attendance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/members"
            element={
              <ProtectedRoute>
                <Members />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-codes"
            element={
              <ProtectedRoute>
                <QRCodes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan-mode"
            element={
              <ProtectedRoute>
                <ScanMode />
              </ProtectedRoute>
            }
          />
          <Route
            path="/memberships"
            element={
              <ProtectedRoute>
                <Memberships />
              </ProtectedRoute>
            }
          />
          <Route
            path="/emails"
            element={
              <ProtectedRoute>
                <EmailCenter />
              </ProtectedRoute>
            }
          />
          <Route 
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
          />
          {/* <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } /> */}
          <Route path="/revenue" element={
            <ProtectedRoute>
              <Revenue />
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
