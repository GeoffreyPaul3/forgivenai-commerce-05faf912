import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/layout/AuthLayout";
import PortalAuthLayout from "@/components/layout/PortalAuthLayout";
import { Mail, Lock, User, ArrowRight, Loader2, KeyRound, CheckCircle2, Store, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAppMode, getRedirectUrl, type AppMode } from "@/lib/app-mode";

type AuthMode = "login" | "signup" | "forgot" | "reset";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<'admin' | 'vendor' | 'agent'>('vendor');
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const appMode = getAppMode();

  // Sync role with appMode
  useEffect(() => {
    if (appMode === "admin") setRole("admin");
    else if (appMode === "vendor") setRole("vendor");
    else if (appMode === "agent") setRole("agent");
  }, [appMode]);

  // Listen for PASSWORD_RECOVERY event — fires when user clicks the reset link in email
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        // Fetch user role for redirection
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        const userRole = profile?.role;
        
        toast({ title: "Access Granted", description: "Authentication successful. Welcome back." });

        // Force redirect to correct portal if user is on the wrong one
        if (userRole === "vendor" && appMode !== "vendor") {
          window.location.href = getRedirectUrl("vendor");
          return;
        } else if (userRole === "agent" && appMode !== "agent") {
          window.location.href = getRedirectUrl("agent");
          return;
        } else if (userRole === "admin" && appMode !== "admin") {
          window.location.href = getRedirectUrl("admin");
          return;
        }

        navigate("/dashboard");

      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              full_name: fullName,
              role,
              phone,
              business_name: role === 'vendor' ? businessName : undefined
            } 
          },
        });
        if (error) throw error;
        
        const isAdmin = role === 'admin';
        toast({
          title: isAdmin ? "Admin account created!" : "Account created!",
          description: isAdmin 
            ? "Your administrator account is active. Please sign in." 
            : "Your account is awaiting administrator approval.",
        });

        if (isAdmin) {
          setMode("login");
          setEmail(email); // Keep email for convenience
        }

      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setResetSent(true);

      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast({ title: "Credentials Updated", description: "Security protocols updated. Please sign in." });
        await supabase.auth.signOut();
        setMode("login");
        setNewPassword("");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const headings: Record<AuthMode, { title: string; sub: string }> = {
    login:  { 
      title: appMode === "admin" ? "Systems Access" : "Portal Sign In", 
      sub: appMode === "admin" ? "Access the central commerce control hub." : "Manage your retail operations and performance." 
    },
    signup: { 
      title: appMode === "vendor" ? "Partner with Forgiven" : appMode === "agent" ? "Join the Commerce Network" : "Administrator Registration", 
      sub: appMode === "vendor" ? "Register as a certified vendor to access our distribution network." : appMode === "agent" ? "Become a certified agent and earn through premium retail." : "Initialize administrative credentials for the commerce ecosystem." 
    },
    forgot: { title: "Credential Recovery",      sub: "Enter your registered email to receive a secure reset link." },
    reset:  { title: "Update Credentials",        sub: "Establish a new secure password for your account." },
  };

  const formContent = (
    <>
      {/* Header — hidden on portal pages (PortalAuthLayout has its own headline) */}
      {appMode === "admin" && (
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-white mb-2">
            {headings[mode].title}
          </h1>
          <p className="text-cream/60 font-body text-sm">{headings[mode].sub}</p>
        </div>
      )}

      {/* Portal heading shown inside the form panel */}
      {appMode !== "admin" && (
        <div className="mb-8">
          <h2 className="font-heading text-2xl font-bold text-white mb-1">{headings[mode].title}</h2>
          <p className="text-cream/60 text-sm font-body">{headings[mode].sub}</p>
        </div>
      )}

      {resetSent ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-gold" />
          </div>
          <p className="text-white font-body">Check your email for the reset link.</p>
          <p className="text-cream/40 text-sm">Didn't receive it? Check spam or{" "}
            <button onClick={() => setResetSent(false)} className="text-gold hover:text-gold-light font-bold">try again</button>
          </p>
          <button onClick={() => { setMode("login"); setResetSent(false); }} className="text-cream/40 text-sm hover:text-cream/60 mt-2">
            ← Back to Sign In
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === "signup" && (
              <motion.div key="signup-fields" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gold/60 tracking-widest pl-1">
                    {appMode === "vendor" ? "Contact Person" : "Full Name"}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="bg-white/5 border-white/10 text-white pl-10 h-12 focus:border-gold/50" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-gold/60 tracking-widest pl-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <Input type="tel" placeholder="+265 99X XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/5 border-white/10 text-white pl-10 h-12 focus:border-gold/50" required />
                  </div>
                </div>
                {appMode === 'vendor' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gold/60 tracking-widest pl-1">Business Name</label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <Input placeholder="My Awesome Shop" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="bg-white/5 border-white/10 text-white pl-10 h-12 focus:border-gold/50" required />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {mode === "reset" && (
              <motion.div key="newpassword" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-gold/60 tracking-widest pl-1">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <Input type="password" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-white/5 border-white/10 text-white pl-10 h-12" required minLength={6} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {mode !== "reset" && (
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gold/60 tracking-widest pl-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/5 border-white/10 text-white pl-10 h-12 focus:border-gold/50" required />
              </div>
            </div>
          )}

          {(mode === "login" || mode === "signup") && (
            <div className="space-y-1">
              <div className="flex items-center justify-between pl-1">
                <label className="text-[10px] uppercase font-bold text-gold/60 tracking-widest">Password</label>
                {mode === "login" && (
                  <button type="button" onClick={() => setMode("forgot")} className="text-[10px] text-gold/60 hover:text-gold uppercase">Forgot Password?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-white/5 border-white/10 text-white pl-10 h-12 focus:border-gold/50" required />
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full h-12 bg-gold hover:bg-gold-light text-maroon-dark font-bold rounded-xl mt-6 group shadow-lg shadow-gold/10 transition-all active:scale-95">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                {mode === "login"  && "Sign In"}
                {mode === "signup" && "Create Account"}
                {mode === "forgot" && "Send Reset Link"}
                {mode === "reset"  && "Update Password"}
                {mode !== "forgot" && <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />}
              </>
            )}
          </Button>

          {(mode === "login" || mode === "signup") && (
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-cream/40 text-sm font-body">
                {mode === "login" ? (
                  <>{appMode === "admin" ? "New admin?" : "New to Forgiven?"}{" "}<button type="button" onClick={() => setMode("signup")} className="text-gold font-bold hover:text-gold-light ml-1">Create Account</button></>
                ) : (
                  <>Already have an account?{" "}<button type="button" onClick={() => setMode("login")} className="text-gold font-bold hover:text-gold-light ml-1">Sign In</button></>
                )}
              </p>
            </div>
          )}

          {mode === "forgot" && (
            <div className="text-center mt-4">
              <button type="button" onClick={() => setMode("login")} className="text-cream/40 text-sm hover:text-cream/60">← Back to Sign In</button>
            </div>
          )}
        </form>
      )}
    </>
  );

  if (appMode === "vendor" || appMode === "agent") {
    return <PortalAuthLayout mode={appMode}>{formContent}</PortalAuthLayout>;
  }

  return (
    <AuthLayout>
      {formContent}
    </AuthLayout>
  );
}
