import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import AuthLayout from "@/components/layout/AuthLayout";
import PortalAuthLayout from "@/components/layout/PortalAuthLayout";
import { Mail, Lock, User, ArrowRight, Loader2, KeyRound, CheckCircle2, Store, Phone, Clock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAppMode, getRedirectUrl, type AppMode } from "@/lib/app-mode";

type AuthMode = "login" | "signup" | "forgot" | "reset";

/** Synchronously detect Supabase password-recovery tokens in the URL.
 * Supabase appends: /auth#access_token=...&type=recovery
 * We parse this BEFORE first render so the initial mode is correct,
 * preventing the login form from flashing or the event being missed.
 */
function detectInitialAuthMode(): AuthMode {
  if (typeof window === "undefined") return "login";
  // Check URL hash fragment (primary format Supabase uses)
  const hash = window.location.hash.substring(1);
  if (hash) {
    const params = new URLSearchParams(hash);
    if (params.get("type") === "recovery") return "reset";
  }
  // Check query string (older or email-link format)
  const search = new URLSearchParams(window.location.search);
  if (search.get("type") === "recovery") return "reset";
  return "login";
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>(detectInitialAuthMode);
  const [mobileShowForm, setMobileShowForm] = useState(() => {
    const initial = detectInitialAuthMode();
    return initial === "reset";
  });
  const appMode = getAppMode();
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<'admin' | 'vendor' | 'agent'>(
    appMode === "admin" ? "admin" : appMode === "agent" ? "agent" : "vendor"
  );
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isPortal = appMode === "vendor" || appMode === "agent";

  // Dynamic style tokens based on Light/Dark Card Theme
  const labelClass = isPortal
    ? "text-xs font-semibold text-neutral-700 block mb-1.5 pl-1"
    : "text-[10px] uppercase font-bold text-gold/60 tracking-widest pl-1 block mb-1.5";
  
  const inputClass = isPortal
    ? "bg-white border-neutral-200 text-neutral-900 placeholder:text-neutral-400 pl-10 h-12 focus-visible:ring-primary/20 focus-visible:border-primary focus:ring-primary/20 focus:border-primary rounded-xl focus:border-maroon transition-all"
    : "bg-white/5 border-white/10 text-white pl-10 h-12 focus:border-gold/50";
  
  const iconClass = isPortal
    ? "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
    : "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20";
  
  const eyeIconClass = isPortal
    ? "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 hover:text-maroon transition-colors"
    : "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 hover:text-gold transition-colors";

  const linkTextClass = isPortal
    ? "text-neutral-500 hover:text-maroon font-medium transition-colors"
    : "text-cream/40 hover:text-cream/60 transition-colors";

  const forgotTextClass = isPortal
    ? "text-xs text-maroon hover:text-maroon-light font-semibold transition-colors"
    : "text-[10px] text-gold/60 hover:text-gold uppercase tracking-wider transition-colors";

  // Sync role with appMode
  useEffect(() => {
    if (appMode === "admin") setRole("admin");
    else if (appMode === "vendor") setRole("vendor");
    else if (appMode === "agent") setRole("agent");
  }, [appMode]);

  // Listen for PASSWORD_RECOVERY event — secondary safety net in case the
  // hash is processed after mount (e.g. Supabase PKCE flow on some clients)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Belt-and-suspenders: if hash arrives after mount (SPA navigation), detect it
  useEffect(() => {
    const initialMode = detectInitialAuthMode();
    if (initialMode === "reset") setMode("reset");
  }, []);

  const [pendingApproval, setPendingApproval] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Fetch user profile to check approval status and role.
        // If RLS blocks the read or the row doesn't exist yet, we fall back to
        // the role stored in the JWT user_metadata (set at signup).
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", data.user.id)
          .single();

        console.log("[Auth] user.id:", data.user.id);
        console.log("[Auth] profile row:", profile, "| profileError:", profileError?.message);
        console.log("[Auth] JWT metadata role:", data.user.user_metadata?.role);

        // Block pending users — sign them out and show waiting screen
        if (profile?.status === "pending") {
          await supabase.auth.signOut();
          setPendingApproval(true);
          return;
        }

        if (profile?.status === "rejected") {
          await supabase.auth.signOut();
          throw new Error("Your account application has been declined. Please contact support.");
        }

        // Resolve role: prefer DB profile, fall back to JWT metadata
        const userRole: string | undefined =
          profile?.role ?? data.user.user_metadata?.role;

        console.log("[Auth] resolved userRole:", userRole, "| appMode:", getAppMode());
        console.log("[Auth] will redirect to:", userRole ? getRedirectUrl(userRole as "vendor"|"agent"|"admin") : "UNKNOWN");


        if (!userRole) {
          // Cannot determine role — sign out to keep state clean
          await supabase.auth.signOut();
          throw new Error("We couldn't verify your account role. Please contact support.");
        }

        toast({ title: "Access Granted", description: "Authentication successful. Welcome back." });

        // Always hard-redirect to the correct portal for this role
        // regardless of which subdomain the user is currently on.
        if (userRole === "vendor") {
          window.location.href = getRedirectUrl("vendor");
          return;
        } else if (userRole === "agent") {
          window.location.href = getRedirectUrl("agent");
          return;
        } else if (userRole === "admin") {
          window.location.href = getRedirectUrl("admin");
          return;
        }

        // Fallback — should never reach here given the check above
        await supabase.auth.signOut();
        throw new Error(`Unknown role "${userRole}". Please contact support.`);

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

        // All new signups — regardless of role — must wait for admin approval.
        // The DB trigger (handle_new_user) sets status='pending' for all roles,
        // so we just show the pending screen immediately.
        setPendingApproval(true);

      } else if (mode === "forgot") {
        // redirectTo must exactly match one of the URLs whitelisted in:
        // Supabase Dashboard → Authentication → URL Configuration → Redirect URLs
        // All three portals are covered by using the current origin.
        const redirectTo = `${window.location.origin}/auth`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
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
    login: {
      title: appMode === "admin" ? "Systems Access" : appMode === "agent" ? "Welcome to Agent Portal" : "Welcome to Vendor Portal",
      sub: appMode === "admin" ? "Access the central commerce control hub." : appMode === "agent" ? "Sign in to access your dashboard, track sales and grow your earnings." : "Sign in to manage your inventory, track orders and scale your business."
    },
    signup: {
      title: appMode === "vendor" ? "Partner with Forgiven" : appMode === "agent" ? "Join the Network" : "Administrator Registration",
      sub: appMode === "vendor" ? "Register as a certified vendor to access our distribution network." : appMode === "agent" ? "Become a certified sales agent and earn commissions." : "Initialize administrative credentials for the commerce ecosystem."
    },
    forgot: { title: "Credential Recovery", sub: "Enter your registered email to receive a secure reset link." },
    reset: { title: "Update Credentials", sub: "Establish a new secure password for your account." },
  };

  const formContent = (
    <>
      {/* Header — hidden on portal pages (PortalAuthLayout has its own gorgeous headlines matching the card) */}
      {appMode === "admin" && (
        <div className="text-center mb-8">
          <h1 className="font-heading text-2xl font-bold text-white mb-2">
            {headings[mode].title}
          </h1>
          <p className="text-cream/60 font-body text-sm">{headings[mode].sub}</p>
        </div>
      )}

      {/* Portal heading shown inside the form panel */}
      {isPortal && (
        <div className="text-center mb-6">
          <h2 className="font-heading text-2xl lg:text-3xl font-extrabold text-neutral-900 mb-2 leading-tight">
            {mode === "login" ? (
              <>
                Welcome to <span className="text-maroon block mt-1">{appMode === "agent" ? "Agent Portal" : "Vendor Portal"}</span>
              </>
            ) : mode === "signup" ? (
              <>
                Join the <span className="text-maroon block mt-1">{appMode === "agent" ? "Agents Program" : "Vendors Network"}</span>
              </>
            ) : (
              headings[mode].title
            )}
          </h2>
          <p className="text-neutral-500 font-body text-sm leading-relaxed max-w-sm mx-auto">{headings[mode].sub}</p>
        </div>
      )}

      {resetSent ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className={`w-8 h-8 ${isPortal ? 'text-maroon' : 'text-gold'}`} />
          </div>
          <p className={`${isPortal ? 'text-neutral-800' : 'text-white'} font-body`}>Check your email for the reset link.</p>
          <p className={`${isPortal ? 'text-neutral-500' : 'text-cream/40'} text-sm`}>Didn't receive it? Check spam or{" "}
            <button onClick={() => setResetSent(false)} className={`${isPortal ? 'text-maroon hover:text-maroon-light' : 'text-gold hover:text-gold-light'} font-bold`}>try again</button>
          </p>
          <button onClick={() => { setMode("login"); setResetSent(false); setMobileShowForm(true); }} className={`${isPortal ? 'text-neutral-500 hover:text-maroon' : 'text-cream/40 hover:text-cream/60'} text-sm mt-2`}>
            ← Back to Sign In
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="wait">
            {mode === "signup" && (
              <motion.div key="signup-fields" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-4">
                <div className="space-y-1">
                  <label className={labelClass}>
                    {appMode === "vendor" ? "Contact Person" : "Full Name"}
                  </label>
                  <div className="relative">
                    <User className={iconClass} />
                    <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>Phone Number</label>
                  <div className="relative">
                    <Phone className={iconClass} />
                    <Input type="tel" placeholder="e.g. +265 997 128 899" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} required />
                  </div>
                </div>
                {appMode === 'vendor' && (
                  <div className="space-y-1">
                    <label className={labelClass}>Business Name</label>
                    <div className="relative">
                      <Store className={iconClass} />
                      <Input placeholder="My Awesome Shop" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputClass} required />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {mode === "reset" && (
              <motion.div key="newpassword" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                <label className={labelClass}>New Password</label>
                <div className="relative">
                  <KeyRound className={iconClass} />
                  <Input type="password" placeholder="Min. 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} required minLength={6} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {mode !== "reset" && (
            <div className="space-y-1">
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <Mail className={iconClass} />
                <Input type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
              </div>
            </div>
          )}

          {(mode === "login" || mode === "signup") && (
            <div className="space-y-1">
              <label className={labelClass}>Password</label>
              <div className="relative">
                <Lock className={iconClass} />
                <Input type={showPassword ? "text" : "password"} placeholder={isPortal ? "Enter your password" : "••••••••"} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className={eyeIconClass}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Remember me & Forgot Password aligned row */}
          {(mode === "login" || mode === "signup") && (
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className={`rounded border-neutral-300 h-4 w-4 focus:ring-offset-0 ${isPortal ? 'accent-maroon text-maroon border-neutral-300 focus:ring-maroon' : 'accent-gold text-gold border-white/20 focus:ring-gold'}`}
                />
                <span className={isPortal ? 'text-xs text-neutral-600 font-medium' : 'text-xs text-cream/60 font-body'}>
                  Remember me
                </span>
              </label>
              {mode === "login" && (
                <button type="button" onClick={() => setMode("forgot")} className={forgotTextClass}>
                  Forgot password?
                </button>
              )}
            </div>
          )}

          <Button type="submit" disabled={loading} className={isPortal ? "w-full h-12 bg-maroon hover:bg-maroon-light text-white font-bold rounded-xl mt-6 group shadow-lg shadow-maroon/10 transition-all active:scale-95 flex items-center justify-center gap-2" : "w-full h-12 bg-gold hover:bg-gold-light text-maroon-dark font-bold rounded-xl mt-6 group shadow-lg shadow-gold/10 transition-all active:scale-95"}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <>
                <span>
                  {mode === "login" && "Sign In"}
                  {mode === "signup" && "Create Account"}
                  {mode === "forgot" && "Send Reset Link"}
                  {mode === "reset" && "Update Password"}
                </span>
                {mode !== "forgot" && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </>
            )}
          </Button>

          {(mode === "login" || mode === "signup") && (
            <div className={`mt-6 pt-5 border-t ${isPortal ? 'border-neutral-100' : 'border-white/5'} text-center`}>
              <p className="text-sm font-body">
                {mode === "login" ? (
                  <>
                    <span className={isPortal ? 'text-neutral-500' : 'text-cream/40'}>
                      {appMode === "admin" ? "New admin?" : appMode === "agent" ? "New agent?" : "New vendor?"}
                    </span>
                    <button type="button" onClick={() => setMode("signup")} className={`font-bold ml-1.5 inline-flex items-center gap-1 group/link ${isPortal ? 'text-maroon hover:text-maroon-light' : 'text-gold hover:text-gold-light'}`}>
                      Register now <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={isPortal ? 'text-neutral-500' : 'text-cream/40'}>Already have an account?</span>
                    <button type="button" onClick={() => setMode("login")} className={`font-bold ml-1.5 inline-flex items-center gap-1 group/link ${isPortal ? 'text-maroon hover:text-maroon-light' : 'text-gold hover:text-gold-light'}`}>
                      Sign In <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                )}
              </p>
            </div>
          )}

          {mode === "forgot" && (
            <div className="text-center mt-4">
              <button type="button" onClick={() => setMode("login")} className={linkTextClass}>← Back to Sign In</button>
            </div>
          )}
        </form>
      )}
    </>
  );

  // Pending approval screen — shown after signup or blocked login
  const pendingScreen = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-6 py-4"
    >
      <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto ${isPortal ? 'bg-maroon/5 border-maroon/10' : 'bg-gold/10 border-gold/20'}`}>
        <Clock className={`w-9 h-9 animate-pulse ${isPortal ? 'text-maroon' : 'text-gold'}`} />
      </div>
      <div className="space-y-2">
        <h2 className={`font-heading text-xl font-bold ${isPortal ? 'text-neutral-900' : 'text-white'}`}>Awaiting Approval</h2>
        <p className={`text-sm font-body leading-relaxed max-w-xs mx-auto ${isPortal ? 'text-neutral-500' : 'text-cream/60'}`}>
          Your account is under review. An administrator will approve your access shortly.
          You'll be able to sign in once approved.
        </p>
      </div>
      <div className={`border rounded-xl px-4 py-3 text-left space-y-1 ${isPortal ? 'bg-neutral-50 border-neutral-100' : 'bg-white/5 border-white/10'}`}>
        <p className={`text-xs font-bold uppercase tracking-wider ${isPortal ? 'text-maroon' : 'text-gold/80'}`}>What happens next?</p>
        <p className={`text-xs font-body ${isPortal ? 'text-neutral-500' : 'text-cream/50'}`}>Our admin team reviews new accounts and approves access within 24 hours.</p>
      </div>
      <button
        onClick={() => { setPendingApproval(false); setMode("login"); setMobileShowForm(true); }}
        className={`text-sm transition-colors ${isPortal ? 'text-neutral-500 hover:text-maroon' : 'text-cream/40 hover:text-cream/60'}`}
      >
        ← Back to Sign In
      </button>
    </motion.div>
  );

  const content = pendingApproval ? pendingScreen : formContent;

  if (appMode === "vendor" || appMode === "agent") {
    return (
      <PortalAuthLayout 
        mode={appMode}
        formMode={mode}
        setFormMode={setMode}
        mobileShowForm={mobileShowForm}
        setMobileShowForm={setMobileShowForm}
      >
        {content}
      </PortalAuthLayout>
    );
  }

  return (
    <AuthLayout>
      {content}
    </AuthLayout>
  );
}
