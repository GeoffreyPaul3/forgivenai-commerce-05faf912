import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "@/assets/forgiven.png";
import agentBg from "@/assets/agent_signup_woman.png";
import vendorProductsImg from "@/assets/vendor_auth_products.png";
import { 
  ShieldCheck, Zap, TrendingUp, Users, Globe, CheckCircle2, 
  Coins, Megaphone, Package, ShoppingBag, Tag, Percent, 
  Truck, Phone, Mail, Heart, Facebook, Instagram, Store, Headphones, CreditCard
} from "lucide-react";

interface PortalAuthLayoutProps {
  children: React.ReactNode;
  mode: "vendor" | "agent";
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

export default function PortalAuthLayout({ children, mode }: PortalAuthLayoutProps) {
  const data = layoutContent[mode];
  const isAgent = mode === "agent";

  return (
    <div className={`min-h-screen flex flex-col justify-between relative overflow-hidden select-none ${isAgent ? 'bg-[#111111]' : 'bg-[#fcfcff]'}`}>
      
      {/* Main Body */}
      <div className="flex-1 flex flex-col-reverse lg:flex-row relative z-10 w-full">
        
        {/* Marketing Side (Left Column) - Positioned below the card on mobile/tablet, side-by-side on desktop */}
        <div className={`flex w-full lg:w-[54%] p-6 sm:p-10 xl:p-12 flex-col justify-between relative overflow-hidden min-h-[480px] lg:min-h-screen ${isAgent ? '' : 'bg-[#fcfcff] border-t lg:border-t-0 lg:border-r border-neutral-100'}`}>
          
          {/* Agent Mode background image & dark overlay */}
          {isAgent && (
            <>
              <div 
                className="absolute inset-0 bg-cover bg-center -z-10 brightness-[0.95]"
                style={{ backgroundImage: `url(${agentBg})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-maroon-dark/95 via-maroon-dark/85 to-maroon-dark/30 -z-10" />
            </>
          )}

          {/* Top Logo and Badge */}
          <div className="space-y-6">
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

          {/* Heading and Benefit List */}
          <div className="max-w-xl space-y-6 my-auto pt-4">
            <h1 className={`font-heading text-4xl xl:text-5xl font-black tracking-tight leading-tight uppercase ${isAgent ? 'text-white' : 'text-neutral-900'}`}>
              {isAgent ? data.heading : (
                <>
                  Grow your business <span className="text-maroon">with Forgiven.</span>
                </>
              )}
            </h1>
            
            <p className={`text-sm xl:text-base font-body leading-relaxed max-w-lg ${isAgent ? 'text-cream/90' : 'text-neutral-600'}`}>
              {data.description}
            </p>

            {/* List of 4 features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {data.features.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-4 items-start">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border ${isAgent ? 'bg-white/10 border-white/20 text-gold' : 'bg-[#f8f5fa] border-maroon/5 text-maroon'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className={`font-extrabold text-sm tracking-wide uppercase ${isAgent ? 'text-white' : 'text-neutral-950'}`}>
                        {item.title}
                      </h4>
                      <p className={`text-xs leading-relaxed font-body ${isAgent ? 'text-cream/70' : 'text-neutral-500'}`}>
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle Brush-Style banner (Agent mode only) */}
            {isAgent && data.highlightBox && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-maroon/90 via-maroon-light/80 to-maroon/90 border border-white/10 px-6 py-4 shadow-xl">
                <h3 className="font-['Playball'] text-3xl text-gold text-center mb-3">
                  {data.highlightBox.title}
                </h3>
                <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-white font-medium">
                  {data.highlightBox.benefits.map((benefit, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-gold" />
                      <span>{benefit}</span>
                    </div>
                  ))}
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

          </div>

          {/* Bottom Grid Highlights (Agent mode only - shown inside left column) */}
          {isAgent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white/95 rounded-2xl p-4 border border-white/10 shadow-lg max-w-3xl">
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
        <div className={`flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative min-h-[calc(100vh-80px)] lg:min-h-screen ${isAgent ? 'bg-[#f4f3f6]' : 'bg-[#fbfcff]'}`}>
          
          {/* Top header navigation for desktop vendor mode */}
          {!isAgent && (
            <div className="hidden lg:flex absolute top-10 right-12">
              <Link to="/auth" className="flex items-center gap-2 border border-maroon/20 hover:border-maroon px-5 py-2 rounded-full text-xs font-bold text-maroon bg-white shadow-sm transition-all">
                <Store className="w-4 h-4" />
                <span>Vendor Portal</span>
              </Link>
            </div>
          )}

          {/* Mobile logo header */}
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

      {/* Vendor Mode Bottom Highlights Block - Clean and Centered */}
      {!isAgent && (
        <div className="bg-white border-t border-neutral-100 py-10 px-6 lg:px-12 w-full z-10">
          <div className="max-w-6xl mx-auto space-y-6">
            <h3 className="text-center font-heading text-xl lg:text-2xl font-bold text-neutral-800 tracking-tight uppercase">
              Why vendors choose Forgiven Shopping Centre
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="bg-[#0b0b0b] border-t border-white/5 py-4 px-4 sm:px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4 z-10 text-center md:text-left">
        
        {/* WhatsApp & Email */}
        <div className="flex flex-col sm:flex-row justify-center gap-y-2 gap-x-8 text-xs font-medium text-cream/70">
          <a href={`https://wa.me/${data.contactInfo.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center md:justify-start gap-2 hover:text-green-500 transition-colors">
            <WhatsAppIcon className="w-4 h-4 text-green-500" />
            <span>Need help? <span className="hidden sm:inline">WhatsApp us:</span> <span className="text-white font-bold">{data.contactInfo.phone}</span></span>
          </a>
          <a href={`mailto:${data.contactInfo.email}`} className="flex items-center justify-center md:justify-start gap-2 hover:text-gold transition-colors">
            <Mail className="w-4 h-4 text-gold" />
            <span>Email: <span className="text-white font-bold">{data.contactInfo.email}</span></span>
          </a>
        </div>

        {/* Social Follow */}
        <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 text-xs font-medium text-cream/70">
          <span>Follow us:</span>
          <div className="flex items-center gap-3 text-white/95">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-white/10 hover:text-blue-500 transition-colors">
              <Facebook className="w-4 h-4" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-white/10 hover:text-pink-500 transition-colors">
              <Instagram className="w-4 h-4" />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-white/10 hover:text-teal-400 transition-colors">
              <TikTokIcon className="w-4 h-4" />
            </a>
          </div>
          <span className="text-cream/40 font-body pl-2 hidden sm:inline border-l border-white/10">Forgiven Shopping Centre</span>
        </div>

        {/* Empowering text & heart icon */}
        <div className="flex items-center gap-2 text-xs font-medium text-cream/60">
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

    </div>
  );
}
