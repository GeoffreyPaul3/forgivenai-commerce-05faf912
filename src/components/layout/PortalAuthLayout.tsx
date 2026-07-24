import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "@/assets/forgiven.png";
import bgImage from "@/assets/agent_signup_woman.png";
import { 
  ShieldCheck, Zap, TrendingUp, Users, Globe, CheckCircle2, 
  Coins, Megaphone, Package, ShoppingBag, Tag, Percent, 
  Truck, Phone, Mail, Heart, Facebook, Instagram 
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
    badge: "Partner Vendors Program",
    heading: "SCALE YOUR RETAIL OPERATIONS.",
    description: "Partner with Forgiven Shopping Centre to distribute your inventory to hundreds of certified sales agents.",
    features: [
      {
        icon: Package,
        title: "SUPPLY ONLY",
        desc: "Focus on manufacturing and supply, we handle sales."
      },
      {
        icon: Users,
        title: "EXTENSIVE REACH",
        desc: "Gain instant access to active reseller channels."
      },
      {
        icon: ShieldCheck,
        title: "SECURE PAYOUTS",
        desc: "Automated settlements with real-time ledger tracking."
      },
      {
        icon: TrendingUp,
        title: "GROW SALES",
        desc: "Optimize distribution and scale inventory performance."
      }
    ],
    highlightBox: {
      title: "Forgiven Commerce",
      benefits: [
        "Supply together.",
        "Grow together.",
        "Succeed together."
      ]
    },
    footerHighlights: [
      { icon: ShieldCheck, title: "SECURE INFRASTRUCTURE", desc: "Industrial-grade inventory tracking and sync." },
      { icon: Coins, title: "AUTOMATED PAYMENTS", desc: "Automated clearing and transparent billing." },
      { icon: Zap, title: "SEAMLESS INTEGRATION", desc: "Simple bulk product uploads and API synchronization." },
      { icon: Globe, title: "BULK LOGISTICS", desc: "Dedicated cargo distribution and logistics networks." }
    ],
    contactInfo: {
      phone: "+265 997 128 899",
      email: "vendors@forgivensc.com"
    },
    trustSeal: {
      title: "Trusted. Secure. Collaborative.",
      desc1: "Your inventory is our priority.",
      desc2: "You supply, we distribute, you grow."
    }
  }
};

export default function PortalAuthLayout({ children, mode }: PortalAuthLayoutProps) {
  const data = layoutContent[mode];

  return (
    <div className="min-h-screen bg-[#f4f3f6] flex flex-col justify-between relative overflow-hidden select-none">
      
      {/* Main Body */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        
        {/* Marketing Side (Left Column) - Hidden on mobile/tablet, flex on desktop */}
        <div className="hidden lg:flex lg:w-[58%] p-12 flex-col justify-between relative overflow-hidden min-h-screen">
          {/* Background image & gradient overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center -z-10 brightness-[0.95]"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-maroon-dark/95 via-maroon-dark/85 to-maroon-dark/30 -z-10" />

          {/* Top Logo and Badge */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-3 group inline-flex">
              <div className="rounded-xl bg-white/95 p-1.5 flex items-center justify-center shadow-lg shadow-black/10">
                <img src={logo} alt="Forgiven Shopping Centre" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-none uppercase">
                  Forgiven
                </span>
                <span className="text-gold text-[9px] uppercase tracking-[0.4em] font-extrabold mt-1">
                  Shopping Centre
                </span>
              </div>
            </Link>

            <div>
              <span className="inline-flex items-center gap-2 bg-maroon-dark/50 backdrop-blur-md border border-gold/30 px-4 py-1.5 rounded-full text-[10px] font-extrabold text-gold tracking-wider uppercase">
                <Users className="w-3.5 h-3.5" />
                {data.badge}
              </span>
            </div>
          </div>

          {/* Heading and Benefit List */}
          <div className="max-w-xl space-y-6 my-auto">
            <h1 className="font-heading text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight uppercase">
              {data.heading}
            </h1>
            
            <p className="text-cream/90 text-sm lg:text-base font-body leading-relaxed max-w-lg">
              {data.description}
            </p>

            {/* List of 4 features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {data.features.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 text-gold shadow-md">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-white font-extrabold text-sm tracking-wide uppercase">
                        {item.title}
                      </h4>
                      <p className="text-cream/70 text-xs leading-relaxed font-body">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Middle Brush-Style banner */}
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
          </div>

          {/* Bottom Grid Highlights */}
          <div className="grid grid-cols-4 gap-4 bg-white/95 rounded-2xl p-4 border border-white/10 shadow-lg max-w-3xl">
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

        </div>

        {/* Auth Column (Right Column) */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative min-h-[calc(100vh-80px)] lg:min-h-screen">
          
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

      {/* WhatsApp, Email, & Social Footer Bar */}
      <div className="bg-[#0b0b0b] border-t border-white/5 py-4 px-4 sm:px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4 z-10 text-center md:text-left">
        
        {/* WhatsApp & Email */}
        <div className="flex flex-col sm:flex-row justify-center gap-y-2 gap-x-8 text-xs font-medium text-cream/70">
          <a href={`https://wa.me/${data.contactInfo.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center md:justify-start gap-2 hover:text-green-500 transition-colors">
            <WhatsAppIcon className="w-4 h-4 text-green-500" />
            <span>Need help? WhatsApp us: <span className="text-white font-bold">{data.contactInfo.phone}</span></span>
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
            <Users className="w-3.5 h-3.5 text-gold" />
            <span className="text-[10px] tracking-wide uppercase font-extrabold text-white">Empowering agents.</span>
          </div>
          <span>Growing together.</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500 animate-pulse ml-1" />
        </div>

      </div>

    </div>
  );
}
