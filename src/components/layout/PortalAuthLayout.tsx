import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckCircle2, ShieldCheck, Zap, TrendingUp, Users, Globe } from "lucide-react";

interface PortalAuthLayoutProps {
  children: React.ReactNode;
  mode: "vendor" | "agent";
}

const content = {
  vendor: {
    title: "Premium Retail Infrastructure",
    subtitle: "Scale your inventory across high-traffic channels with precision logistics and automated fulfillment protocols.",
    features: [
      { icon: Globe, text: "Global commerce network" },
      { icon: Zap, text: "Seamless order fulfillment" },
      { icon: ShieldCheck, text: "Secure financial settlements" },
      { icon: TrendingUp, text: "Advanced performance tracking" },
    ]
  },
  agent: {
    title: "Professional Affiliate Commerce",
    subtitle: "Monetize your network with a curated catalogue of premium products and high-performance earnings.",
    features: [
      { icon: Users, text: "Precision referral tracking" },
      { icon: Zap, text: "Expedited commission payouts" },
      { icon: Globe, text: "Premium global inventory" },
      { icon: CheckCircle2, text: "Executive sales resources" },
    ]
  }
};

export default function PortalAuthLayout({ children, mode }: PortalAuthLayoutProps) {
  const current = content[mode];

  return (
    <div className="min-h-screen bg-maroon-dark flex flex-col lg:flex-row relative overflow-hidden">
      {/* Marketing Side (Left) */}
      <div className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-between relative z-10">
        <div className="absolute inset-0 bg-gold/5 blur-[120px] -z-10" />
        
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-gold flex items-center justify-center shadow-lg shadow-gold/20">
            <span className="font-heading font-black text-maroon-dark text-xl">F</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading text-2xl font-bold text-white tracking-tight leading-none uppercase">Forgiven</span>
            <span className="text-gold text-[10px] uppercase tracking-[0.4em] font-bold mt-1">Portal</span>
          </div>
        </Link>

        <div className="max-w-xl">
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="font-heading text-5xl font-bold text-white mb-6 leading-tight"
          >
            {current.title}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-cream/60 text-lg font-body mb-12"
          >
            {current.subtitle}
          </motion.p>

          <div className="grid grid-cols-2 gap-8">
            {current.features.map((feature, i) => (
              <motion.div 
                key={feature.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (i * 0.1) }}
                className="flex items-start gap-4"
              >
                <div className="p-2 rounded-lg bg-gold/10 border border-gold/20">
                  <feature.icon className="w-5 h-5 text-gold" />
                </div>
                <span className="text-cream/80 font-body text-sm pt-1">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-cream/30 text-xs font-body uppercase tracking-widest">
          Forgiven Shopping Centre
        </div>
      </div>

      {/* Auth Side (Right) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:bg-white/5 lg:backdrop-blur-3xl lg:border-l lg:border-white/10 relative">
        <div className="lg:hidden absolute top-8 left-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center">
              <span className="font-heading font-black text-maroon-dark text-lg">F</span>
            </div>
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/5 lg:bg-transparent backdrop-blur-2xl lg:backdrop-blur-none rounded-3xl border border-white/10 lg:border-none p-8 lg:p-0 shadow-2xl lg:shadow-none">
            {children}
          </div>
        </motion.div>
        
        <p className="mt-8 text-center text-cream/40 text-sm font-body lg:absolute lg:bottom-12 lg:mt-0">
          &copy; {new Date().getFullYear()} Forgiven Shopping Centre. All rights reserved.
        </p>
      </div>
    </div>
  );
}
