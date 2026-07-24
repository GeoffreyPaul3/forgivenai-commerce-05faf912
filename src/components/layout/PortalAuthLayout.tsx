import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "@/assets/forgiven.png";
import agentBg from "@/assets/agent_signup_woman.png";
import vendorProductsImg from "@/assets/vendor_auth_products.png";
import { 
  ShieldCheck, Zap, TrendingUp, Users, Globe, CheckCircle2, 
  Coins, Megaphone, Package, ShoppingBag, Tag, Percent, 
  Truck, Phone, Mail, Heart, Facebook, Instagram, Store, Headphones, CreditCard,
  UserPlus, ArrowRight
} from "lucide-react";
import { getRedirectUrl } from "@/lib/app-mode";

interface PortalAuthLayoutProps {
  children: React.ReactNode;
  mode: "vendor" | "agent";
  formMode: "login" | "signup" | "forgot" | "reset";
  setFormMode: (mode: "login" | "signup" | "forgot" | "reset") => void;
  mobileShowForm: boolean;
  setMobileShowForm: (show: boolean) => void;
}

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.852.002-2.63-1.023-5.101-2.887-6.967a9.77 9.77 0 0 0-6.974-2.879c-5.443 0-9.866 4.418-9.87 9.852-.001 1.777.472 3.511 1.371 5.062L1.87 21.057l4.777-1.903zm11.603-4.767c.3-.15 1.771-.874 2.045-.973.274-.1.457-.15.657.15.2.3.771.973.945 1.173.173.2.346.225.646.075.3-.15 1.269-.467 2.417-1.492.893-.797 1.496-1.782 1.671-2.082.173-.3.018-.462-.132-.612-.135-.135-.3-.35-.45-.525-.15-.175-.2-.3-.3-.5-.1-.2-.05-.375.025-.525.075-.15.657-1.583.9-2.175.236-.575.474-.497.657-.506.168-.008.361-.01.554-.01.193 0 .506.072.771.36.265.287 1.012.988 1.012 2.409 0 1.421-.988 2.793-1.12 2.973-.133.18-1.945 2.97-4.712 4.162-.658.284-1.172.453-1.572.58.66.42 1.269.38 1.745.31.53-.08 1.771-.724 2.021-1.422.25-.698.25-1.297.175-1.422-.075-.125-.275-.2-.575-.35z" />
  </svg>
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.81-.74-3.94-1.69-.22-.19-.42-.39-.62-.6v6.2c.03 2.02-.63 4.09-2.03 5.56-1.55 1.67-3.9 2.58-6.17 2.4-2.58-.15-5.06-1.74-6.09-4.14-1.24-2.73-.66-6.17 1.45-8.24 1.7-1.72 4.23-2.34 6.55-1.7v4.04c-1.24-.39-2.67-.11-3.64.76-.94.8-1.29 2.14-1.02 3.3.33 1.54 1.83 2.67 3.4 2.56 1.44-.04 2.72-1.04 3.08-2.43.08-.34.12-.68.12-1.02V.02z" />
  </svg>
);

const layoutContent = {
  agent: {
    badge: "Sales Agents Program",
    heading: "TURN YOUR PHONE INTO INCOME.",
    description: "Join the Tiyiphulira Limodzi Sales Agents Program and earn commissions without buying stock.",
    features: [
      {
        icon: Package,
        title: "NO STOCK TO BUY",
        desc: "We handle inventory so you don't have to."
      },
      {
        icon: Truck,
        title: "WE DELIVER",
        desc: "Fast and reliable delivery to your customers."
      },
      {
        icon: Coins,
        title: "YOU EARN",
        desc: "Earn up to 15% commission on every successful sale."
      },
      {
        icon: Megaphone,
        title: "WE SUPPORT YOU",
        desc: "Get marketing materials, updates and dedicated agent support."
      }
    ],
    highlightBox: {
      title: "Tiyiphulira Limodzi",
      benefits: [
        "Let us earn together.",
        "Let us grow together.",
        "Let us benefit together."
      ]
    },
    footerHighlights: [
      { icon: ShoppingBag, title: "WIDE PRODUCT RANGE", desc: "Access quality products your customers love." },
      { icon: Tag, title: "COMPETITIVE PRICES", desc: "Offer the best prices and close more sales." },
      { icon: Percent, title: "ATTRACTIVE COMMISSIONS", desc: "Earn higher as you grow your sales." },
      { icon: Truck, title: "RELIABLE DELIVERY", desc: "Fast and secure delivery to your customers." }
    ],
    contactInfo: {
      phone: "+265 997 128 899",
      email: "agents@forgivensc.com"
    },
    trustSeal: {
      title: "Trusted. Secure. Rewarding.",
      desc1: "Your success is our priority.",
      desc2: "You sell, we support, you earn."
    }
  },
  vendor: {
    badge: "Vendor Portal",
    heading: "Grow your business with Forgiven.",
    description: "Join our trusted network of vendors and reach thousands of customers across Malawi and beyond.",
    features: [
      {
        icon: Users,
        title: "Wider Reach",
        desc: "Access a growing customer base throughout the country."
      },
      {
        icon: TrendingUp,
        title: "Real-time Insights",
        desc: "Track your sales, inventory and performance in one place."
      },
      {
        icon: ShieldCheck,
        title: "Secure & Reliable",
        desc: "We ensure secure transactions and data protection."
      },
      {
        icon: Headphones,
        title: "Dedicated Support",
        desc: "Our team is here to help you succeed at every step."
      }
    ],
    footerHighlights: [
      { icon: ShoppingBag, title: "Increase Sales", desc: "Sell more with our established customer network." },
      { icon: Tag, title: "Competitive Edge", desc: "Offer quality products with ease and efficiency." },
      { icon: Truck, title: "Nationwide Delivery", desc: "We handle logistics so you can focus on your business." },
      { icon: CreditCard, title: "Timely Payments", desc: "Get paid securely and on time for every order." }
    ],
    contactInfo: {
      phone: "+265 881 123 456",
      email: "vendors@forgivensc.com"
    },
    trustSeal: {
      title: "Trusted. Verified. Connected.",
      desc1: "We verify all vendors and maintain the highest",
      desc2: "standards to protect our customers and partners."
    }
  }
};

export default function PortalAuthLayout({ 
  children, 
  mode,
  formMode,
  setFormMode,
  mobileShowForm,
  setMobileShowForm
}: PortalAuthLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const data = layoutContent[mode];
  const isAgent = mode === "agent";

  return (
    <div className={`min-h-screen flex flex-col justify-between relative overflow-hidden select-none ${isAgent ? 'bg-[#111111]' : 'bg-[#fcfcff]'}`}>
      
      {/* Mobile Top Header (hidden on desktop) */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-white border-b border-neutral-100 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="rounded-lg bg-white p-1.5 flex items-center justify-center shadow-md border border-neutral-100">
            <img src={logo} alt="Forgiven" className="w-8 h-8 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-lg font-extrabold tracking-tight leading-none uppercase text-neutral-900">
              Forgiven
            </span>
            <span className="text-gold text-[7px] uppercase tracking-[0.3em] font-extrabold mt-0.5">
              Shopping Centre
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              window.location.href = getRedirectUrl(isAgent ? "vendor" : "agent");
            }}
            className={`flex items-center gap-1.5 border ${isAgent ? 'border-[#3c1c4b]/20 text-[#3c1c4b]' : 'border-[#1c2c5b]/20 text-[#1c2c5b]'} px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white shadow-sm transition-all`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{isAgent ? "Agent Portal" : "Vendor Portal"}</span>
          </button>
          
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10 w-full">
        
        {/* Marketing Side (Left Column) */}
        <div className={`${mobileShowForm ? 'hidden lg:flex' : 'flex'} w-full lg:w-[54%] p-6 sm:p-10 xl:p-12 flex-col justify-between relative overflow-hidden min-h-[480px] lg:min-h-screen ${isAgent ? '' : 'bg-[#fcfcff] border-t lg:border-t-0 lg:border-r border-neutral-100'}`}>
          
          {/* Agent Mode background image & dark overlay */}
          {isAgent && (
            <>
              {/* Desktop background */}
              <div 
                className="hidden lg:block absolute inset-0 bg-cover bg-center -z-10 brightness-[0.95]"
                style={{ backgroundImage: `url(${agentBg})` }}
              />
              <div className="hidden lg:block absolute inset-0 bg-gradient-to-r from-maroon-dark/95 via-maroon-dark/85 to-maroon-dark/30 -z-10" />
              
              {/* Mobile background (light) and floating woman image */}
              <div className="lg:hidden absolute inset-0 bg-[#f8f6f9] -z-20" />
              <div 
                className="lg:hidden absolute right-[-60px] sm:right-[-20px] bottom-0 w-[80%] max-w-[320px] h-[55%] bg-no-repeat bg-contain bg-bottom -z-10 pointer-events-none opacity-90"
                style={{ backgroundImage: `url(${agentBg})` }}
              />
            </>
          )}

          {/* Top Logo and Badge (shown on desktop only since mobile has its own sticky header) */}
          <div className="hidden lg:block space-y-6">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <div className="rounded-xl bg-white p-2 flex items-center justify-center shadow-md border border-neutral-100">
                <img src={logo} alt="Forgiven Shopping Centre" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className={`font-heading text-2xl lg:text-3xl font-extrabold tracking-tight leading-none uppercase ${isAgent ? 'text-white' : 'text-neutral-900'}`}>
                  Forgiven
                </span>
                <span className="text-gold text-[9px] uppercase tracking-[0.4em] font-extrabold mt-1">
                  Shopping Centre
                </span>
              </div>
            </Link>

            <div>
              <span className={`inline-flex items-center gap-2 border px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase ${isAgent ? 'bg-maroon-dark/50 backdrop-blur-md border-gold/30 text-gold' : 'bg-[#f8f5fa] border-maroon/10 text-maroon'}`}>
                {isAgent ? <Users className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                {data.badge}
              </span>
            </div>
          </div>

          {/* Mobile-only Badge (placed inside the scroll content) */}
          <div className="lg:hidden mb-4">
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase ${isAgent ? 'bg-[#3c1c4b] text-white' : 'bg-[#f8f5fa] border border-maroon/10 text-maroon'}`}>
              {isAgent ? <Users className="w-3.5 h-3.5 text-gold" /> : <Store className="w-3.5 h-3.5 text-maroon" />}
              {isAgent ? "SALES AGENTS PROGRAM" : "VENDOR PORTAL"}
            </span>
          </div>

          {/* Heading and Benefit List */}
          <div className="max-w-xl space-y-6 my-auto pt-4 relative">
            <h1 className={`font-heading text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-tight uppercase ${isAgent ? 'text-neutral-900 lg:text-white' : 'text-neutral-900'}`}>
              {isAgent ? (
                <>
                  TURN YOUR <br className="hidden sm:inline" />
                  PHONE INTO <br className="hidden sm:inline" />
                  <span className="text-maroon lg:text-gold">INCOME.</span>
                </>
              ) : (
                <>
                  Grow your business <span className="text-maroon">with Forgiven.</span>
                </>
              )}
            </h1>
            
            <p className={`text-sm xl:text-base font-body leading-relaxed max-w-[75%] sm:max-w-lg ${isAgent ? 'text-neutral-600 lg:text-cream/90' : 'text-neutral-600'}`}>
              {data.description}
            </p>

            {/* List of 4 features */}
            <div className="grid grid-cols-1 gap-5 pt-2 max-w-[70%] sm:max-w-lg">
              {data.features.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-3.5 items-start">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${isAgent ? 'bg-[#3c1c4b] text-white lg:bg-white/10 lg:border lg:border-white/20 lg:text-gold' : 'bg-[#f8f5fa] border border-maroon/5 text-maroon'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className={`font-black text-xs tracking-wider uppercase ${isAgent ? 'text-neutral-900 lg:text-white' : 'text-neutral-950'}`}>
                        {item.title}
                      </h4>
                      <p className={`text-[11px] leading-relaxed font-body ${isAgent ? 'text-neutral-500 lg:text-cream/70' : 'text-neutral-500'}`}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle Brush-Style banner */}
            {isAgent && data.highlightBox && (
              <div className="relative overflow-hidden rounded-3xl bg-[#3c1c4b] px-6 py-5 shadow-xl text-white flex flex-col sm:flex-row items-center gap-4 border border-white/10 mt-6">
                {/* Left side: Icon and handwriting title */}
                <div className="flex items-center gap-3.5 flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                    <Users className="w-6 h-6 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-['Playball'] text-2xl lg:text-3xl text-gold leading-none">
                      {data.highlightBox.title}
                    </h3>
                  </div>
                </div>
                
                {/* Divider on larger screens */}
                <div className="hidden sm:block w-[1px] h-10 bg-white/20" />
                
                {/* Right side: Benefits list */}
                <div className="space-y-1 text-xs font-semibold text-white/95 w-full">
                  {data.highlightBox.benefits.map((benefit, bIdx) => {
                    const text = benefit.replace("Let us ", "");
                    const verb = text.includes("earn") ? "earn" : text.includes("grow") ? "grow" : text.includes("benefit") ? "benefit" : "";
                    const display = verb ? (
                      <>Let us <span className="text-gold font-bold">{verb}</span> together.</>
                    ) : benefit;
                    
                    return (
                      <div key={bIdx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                        <span>{display}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vendor Mode Bottom Staged Product Graphic */}
            {!isAgent && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.3 }}
                className="pt-4 flex justify-center lg:justify-start items-end"
              >
                <img src={vendorProductsImg} alt="Vendor Products" className="max-w-[420px] w-full object-contain" />
              </motion.div>
            )}

            {/* Mobile-only Highlights Card (Product range, Competitive prices, etc.) */}
            <div className="lg:hidden bg-white rounded-3xl p-5 border border-neutral-100 shadow-lg shadow-neutral-900/5 mt-6 w-full">
              <div className="grid grid-cols-2 gap-4">
                {data.footerHighlights.map((hl, hlIdx) => {
                  const HlIcon = hl.icon;
                  return (
                    <div key={hlIdx} className="flex flex-col items-center text-center p-2 rounded-2xl">
                      <div className={`p-2 rounded-xl ${isAgent ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'} flex-shrink-0 mb-2`}>
                        <HlIcon className="w-5 h-5" />
                      </div>
                      <h5 className="text-[10px] font-black text-neutral-900 leading-tight tracking-wider uppercase mb-1">
                        {hl.title}
                      </h5>
                      <p className="text-[9px] text-neutral-500 font-medium leading-normal max-w-[120px]">
                        {hl.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile-only CTA Buttons */}
            <div className="lg:hidden flex flex-col gap-3.5 pt-4 w-full">
              {/* APPLY NOW */}
              <button
                onClick={() => {
                  setFormMode("signup");
                  setMobileShowForm(true);
                }}
                className="w-full flex items-center justify-between px-6 py-3.5 bg-gradient-to-r from-[#ab0979] to-[#490c6a] text-white rounded-2xl shadow-xl shadow-purple-900/10 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-1 bg-white/10 rounded-lg">
                    <UserPlus className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black tracking-wider uppercase">APPLY NOW</div>
                    <div className="text-[10px] text-white/80">Become an {isAgent ? "Agent" : "Vendor"}</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* SIGN IN */}
              <button
                onClick={() => {
                  setFormMode("login");
                  setMobileShowForm(true);
                }}
                className={`w-full flex items-center justify-between px-6 py-3.5 bg-white border ${isAgent ? 'border-[#490c6a] text-[#490c6a]' : 'border-[#1c2c5b] text-[#1c2c5b]'} rounded-2xl shadow-sm hover:bg-neutral-50 active:scale-[0.98] transition-all`}
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-1 ${isAgent ? 'bg-[#490c6a]/5 text-[#490c6a]' : 'bg-[#1c2c5b]/5 text-[#1c2c5b]'} rounded-lg`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-black tracking-wider uppercase">
                      {isAgent ? "AGENT SIGN IN" : "VENDOR SIGN IN"}
                    </div>
                    <div className="text-[10px] text-neutral-500">I already have an account</div>
                  </div>
                </div>
              </button>
            </div>

          </div>

          {/* Desktop-only Bottom Grid Highlights (Agent mode only) */}
          {isAgent && (
            <div className="hidden lg:grid grid-cols-4 gap-4 bg-white/95 rounded-2xl p-4 border border-white/10 shadow-lg max-w-3xl">
              {data.footerHighlights.map((hl, hlIdx) => {
                const HlIcon = hl.icon;
                return (
                  <div key={hlIdx} className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-maroon-dark/5 text-maroon flex-shrink-0">
                      <HlIcon className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <h5 className="text-[10px] font-black text-neutral-900 leading-tight tracking-wide uppercase">
                        {hl.title}
                      </h5>
                      <p className="text-[9px] text-neutral-500 font-body leading-normal">
                        {hl.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Auth Column (Right Column) */}
        <div className={`${mobileShowForm ? 'flex w-full' : 'hidden lg:flex'} flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative min-h-[calc(100vh-80px)] lg:min-h-screen ${isAgent ? 'bg-[#f4f3f6]' : 'bg-[#fbfcff]'}`}>
          
          {/* Top header navigation for desktop vendor mode */}
          {!isAgent && (
            <div className="hidden lg:flex absolute top-10 right-12">
              <Link to="/auth" className="flex items-center gap-2 border border-maroon/20 hover:border-maroon px-5 py-2 rounded-full text-xs font-bold text-maroon bg-white shadow-sm transition-all">
                <Store className="w-4 h-4" />
                <span>Vendor Portal</span>
              </Link>
            </div>
          )}

          {/* Mobile Back Button to return to landing page */}
          {mobileShowForm && (
            <button
              onClick={() => setMobileShowForm(false)}
              className="lg:hidden absolute top-6 left-6 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-600 hover:text-maroon transition-colors bg-white px-4 py-2.5 rounded-xl shadow-sm border border-neutral-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Info</span>
            </button>
          )}

          {/* Mobile logo header (hidden when form is active to prevent overlap) */}
          {!mobileShowForm && (
            <div className="lg:hidden absolute top-6 left-6">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="rounded-lg bg-white p-1.5 flex items-center justify-center shadow-md">
                  <img src={logo} alt="Forgiven" className="w-8 h-8 object-contain" />
                </div>
                <span className="font-heading text-lg font-bold text-neutral-900 tracking-tight leading-none uppercase">
                  Forgiven
                </span>
              </Link>
            </div>
          )}

          {/* White Card Container */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[420px] bg-white rounded-[32px] shadow-2xl shadow-neutral-900/5 border border-neutral-100/80 p-6 sm:p-8 lg:p-10 flex flex-col gap-6 my-auto"
          >
            {/* Center avatar badge */}
            <div className="flex justify-center -mt-2">
              <div className="w-16 h-16 rounded-full bg-[#fcfafc] border border-maroon/10 flex items-center justify-center shadow-md shadow-maroon/5">
                <img src={logo} alt="FSC" className="w-9 h-9 object-contain" />
              </div>
            </div>

            {/* Card form fields */}
            <div>
              {children}
            </div>

            {/* Trusted Security Banner */}
            <div className="bg-[#f8f5fa] border border-maroon/5 rounded-2xl p-4 flex gap-3.5 items-start">
              <div className="p-2 rounded-xl bg-white border border-maroon/10 text-maroon flex-shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-neutral-900">
                  {data.trustSeal.title}
                </h5>
                <p className="text-[10px] text-neutral-500 font-body leading-relaxed">
                  {data.trustSeal.desc1}
                  <br />
                  {data.trustSeal.desc2}
                </p>
              </div>
            </div>
          </motion.div>

        </div>

      </div>

      {/* Desktop-only Vendor Mode Bottom Highlights Block */}
      {!isAgent && (
        <div className="hidden lg:block bg-white border-t border-neutral-100 py-10 px-6 lg:px-12 w-full z-10">
          <div className="max-w-6xl mx-auto space-y-6">
            <h3 className="text-center font-heading text-xl lg:text-2xl font-bold text-neutral-800 tracking-tight uppercase">
              Why vendors choose Forgiven Shopping Centre
            </h3>
            <div className="grid grid-cols-4 gap-6">
              {data.footerHighlights.map((hl, hlIdx) => {
                const HlIcon = hl.icon;
                return (
                  <div key={hlIdx} className="bg-[#fbfcff] rounded-2xl p-5 border border-neutral-100/60 shadow-sm flex items-start gap-4 hover:border-maroon/20 transition-all">
                    <div className="p-2.5 rounded-xl bg-maroon/5 text-maroon flex-shrink-0 shadow-inner">
                      <HlIcon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-neutral-900 tracking-wide uppercase">
                        {hl.title}
                      </h4>
                      <p className="text-xs text-neutral-500 font-body leading-relaxed">
                        {hl.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp, Email, & Social Footer Bar */}
      <div className={`py-6 px-4 sm:px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4 z-10 text-center md:text-left border-t border-white/5 ${isAgent ? 'bg-[#1c0c30] text-cream/70' : 'bg-[#0f172a] text-cream/70'}`}>
        
        {/* WhatsApp & Email */}
        <div className="flex flex-col sm:flex-row justify-center gap-y-2 gap-x-8 text-xs font-medium">
          <a href={`https://wa.me/${data.contactInfo.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center md:justify-start gap-2 hover:text-green-400 transition-colors">
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
              <WhatsAppIcon className="w-3.5 h-3.5" />
            </div>
            <span>Need help? WhatsApp us: <span className="text-white font-bold">{data.contactInfo.phone}</span></span>
          </a>
          <a href={`mailto:${data.contactInfo.email}`} className="flex items-center justify-center md:justify-start gap-2 hover:text-gold transition-colors">
            <div className={`w-6 h-6 rounded-full ${isAgent ? 'bg-purple-500' : 'bg-blue-500'} flex items-center justify-center text-white`}>
              <Mail className="w-3.5 h-3.5" />
            </div>
            <span>Email us: <span className="text-white font-bold">{data.contactInfo.email}</span></span>
          </a>
        </div>

        {/* Social Follow */}
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 text-xs font-medium">
          <span>Follow us:</span>
          <div className="flex items-center gap-3 text-white/95">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-white/10 hover:text-blue-400 transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-white/10 hover:text-pink-400 transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-white/10 hover:text-teal-400 transition-colors">
              <TikTokIcon className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Empowering text & heart icon */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-lg">
            {isAgent ? <Users className="w-3.5 h-3.5 text-gold" /> : <Store className="w-3.5 h-3.5 text-gold" />}
            <span className="text-[10px] tracking-wide uppercase font-extrabold text-white">
              {isAgent ? "Empowering agents." : "Empowering vendors."}
            </span>
          </div>
          <span>Growing together.</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse ml-1" />
        </div>

      </div>

      {/* Hamburger Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-white z-50 shadow-2xl p-6 flex flex-col justify-between lg:hidden text-neutral-900"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <span className="font-heading text-lg font-bold text-neutral-900 uppercase">Menu</span>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-neutral-100">
                    <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Portals</div>
                  
                  <Link 
                    to="/" 
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 font-semibold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Store className="w-5 h-5 text-maroon" />
                    <span>Main Shop Website</span>
                  </Link>

                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = getRedirectUrl("agent");
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 font-semibold text-left ${isAgent ? 'bg-purple-50 text-purple-900' : ''}`}
                  >
                    <Users className="w-5 h-5 text-maroon" />
                    <span>Sales Agent Portal</span>
                  </button>

                  <button 
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = getRedirectUrl("vendor");
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 font-semibold text-left ${!isAgent ? 'bg-blue-50 text-blue-900' : ''}`}
                  >
                    <Store className="w-5 h-5 text-maroon" />
                    <span>Vendor Portal</span>
                  </button>
                </div>

                <div className="space-y-4 pt-2 border-t border-neutral-100">
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Account Access</div>
                  
                  <button 
                    onClick={() => {
                      setFormMode("login");
                      setMobileShowForm(true);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 font-semibold text-left ${mobileShowForm && formMode === "login" ? 'bg-purple-50 text-purple-900' : ''}`}
                  >
                    <ShieldCheck className="w-5 h-5 text-maroon" />
                    <span>Sign In</span>
                  </button>

                  <button 
                    onClick={() => {
                      setFormMode("signup");
                      setMobileShowForm(true);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 font-semibold text-left ${mobileShowForm && formMode === "signup" ? 'bg-purple-50 text-purple-900' : ''}`}
                  >
                    <UserPlus className="w-5 h-5 text-maroon" />
                    <span>Sign Up</span>
                  </button>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="text-xs text-neutral-500">Need immediate help?</div>
                <a 
                  href={`https://wa.me/${data.contactInfo.phone.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-2 text-xs font-semibold text-green-600 hover:underline"
                >
                  <WhatsAppIcon className="w-4 h-4 text-green-500" />
                  <span>WhatsApp Support</span>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
