import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAppMode, getRedirectUrl, type AppMode } from "@/lib/app-mode";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  const appMode = getAppMode();

  useEffect(() => {
    // Step 1: Fast auth check — never hangs
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthenticated(!!session);
      
      // Step 2: Load profile details in background (non-blocking)
      if (session) {
        supabase
          .from("profiles")
          .select("status, role")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.status) setProfileStatus(data.status);
            if (data?.role) setUserRole(data.role);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    // Keep session in sync but don't re-block the UI
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
      if (!session) {
        setProfileStatus(null);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-maroon-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    console.log("ProtectedRoute: Not authenticated, redirecting to /auth on", window.location.hostname);
    // Ensuring we stay on the current subdomain/origin by using a relative path with window.location.assign
    window.location.assign("/auth");
    return (
      <div className="min-h-screen bg-maroon-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // HARD ENFORCEMENT: Check if role matches portal
  // Admins can oversee all portals; Vendors and Agents are restricted to their own.
  const isUnauthorizedForPortal = userRole !== "admin" && (
    (appMode === "vendor" && userRole !== "vendor") ||
    (appMode === "agent" && userRole !== "agent") ||
    (appMode === "admin" && userRole !== "admin")
  );

  if (isUnauthorizedForPortal && userRole) {
    const targetUrl = getRedirectUrl(userRole as AppMode);
    console.log("ProtectedRoute: Unauthorized for portal. Redirecting to", targetUrl);

    if (targetUrl) {
      window.location.href = targetUrl;
      return (
        <div className="min-h-screen bg-maroon-dark flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="w-8 h-8 text-gold animate-spin mb-4" />
          <p className="text-white font-body">Redirecting to your {userRole} portal...</p>
        </div>
      );
    }
  }

  if (profileStatus === "pending" && userRole !== "admin") {
    return (
      <div className="min-h-screen bg-maroon-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center mb-6 animate-pulse">
          <Lock className="w-10 h-10 text-gold" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-white mb-4">Waiting for Approval</h1>
        <p className="text-cream/60 max-w-sm mb-8 font-body">
          Your account is currently under review by our administrators.
          We'll notify you once you've been granted access to the platform.
        </p>
        <Button onClick={handleLogout} variant="outline" className="border-gold/20 text-gold hover:bg-gold/5">
          <LogOut className="mr-2 h-4 w-4" /> Back to Landing
        </Button>
      </div>
    );
  }

  if (profileStatus === "rejected") {
    return (
      <div className="min-h-screen bg-maroon-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-white mb-4">Access Denied</h1>
        <p className="text-cream/60 max-w-sm mb-8 font-body">
          Unfortunately, your request for access has been declined.
          If you believe this is an error, please contact support.
        </p>
        <Button onClick={handleLogout} variant="outline" className="border-white/10 text-white hover:bg-white/5">
          <LogOut className="mr-2 h-4 w-4" /> Sign Out
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

