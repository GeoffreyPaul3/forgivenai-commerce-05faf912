import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthPage from "./pages/Auth.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import { useEffect } from "react";
import { getAppMode } from "@/lib/app-mode";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ReferralTracker = () => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("referral_code", ref);
      console.log("Captured referral code:", ref);
    }
  }, []);
  return null;
};

const RootRedirect = () => {
  const appMode = getAppMode();
  
  useEffect(() => {
    console.log("RootRedirect: hostname =", window.location.hostname, "appMode =", appMode);
    if (appMode !== "admin") {
      // Use window.location.assign for a clean redirect within the same origin
      window.location.assign("/dashboard");
    }
  }, [appMode]);

  if (appMode !== "admin") {
    return (
      <div className="min-h-screen bg-maroon-dark flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
        <p className="text-white font-body">Detecting portal: {appMode}...</p>
      </div>
    );
  }
  
  return <Index />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ReferralTracker />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
