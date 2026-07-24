import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp, CheckCircle, Gift, ArrowRight } from "lucide-react";
import logo from "@/assets/forgiven.png";
import { useState } from "react";
import { Input } from "@/components/ui/input";

interface Phase1WelcomeProps {
  onNext: () => void;
}

export default function Phase1Welcome({ onNext }: Phase1WelcomeProps) {
  const [estSales, setEstSales] = useState<string>("200000");

  const expectedCommission = (parseInt(estSales.replace(/\D/g, "") || "0", 10) * 0.1).toLocaleString("en-US");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="w-24 h-24 mx-auto bg-white rounded-3xl shadow-xl flex items-center justify-center border-4 border-primary/20"
        >
          <img src={logo} alt="FSC Logo" className="w-16 h-16 object-contain" />
        </motion.div>
        
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-heading font-black text-foreground tracking-tight">
            Welcome to the <span className="text-primary">Forgiven Family</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body max-w-2xl mx-auto">
            Your journey as a Forgiven Shopping Centre Sales Partner starts here. We empower you to build your own business, with zero upfront costs.
          </p>
        </div>
      </div>

      {/* Mission & Vision Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-heading font-black">Our Mission</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            To provide high-quality, affordable products to Malawi while empowering individuals to achieve financial independence through our Sales Partner network.
          </p>
        </div>
        <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-heading font-black">How You Earn</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You earn a commission on every successful sale you generate. Our tier-based system means the more you sell, the higher your commission rate grows.
          </p>
        </div>
      </div>

      {/* Commission Tiers */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground text-center">Your Growth Path</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { tier: "Tier 1", rate: "8%", range: "MWK 0 - 200K", cls: "bg-blue-50 border-blue-200 text-blue-700" },
            { tier: "Tier 2", rate: "10%", range: "MWK 200K - 500K", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { tier: "Tier 3", rate: "12%", range: "MWK 500K - 1M", cls: "bg-amber-50 border-amber-200 text-amber-700" },
            { tier: "Tier 4", rate: "15%", range: "MWK 1M+", cls: "bg-primary/10 border-primary/30 text-primary" },
          ].map((t, i) => (
            <motion.div
              key={t.tier}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-2xl border text-center ${t.cls}`}
            >
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">{t.tier}</p>
              <p className="text-3xl font-heading font-black">{t.rate}</p>
              <p className="text-[10px] mt-1 font-bold opacity-70">{t.range}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Calculator & Referrals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
          <h3 className="font-heading font-black text-lg">Earnings Calculator</h3>
          <p className="text-xs text-muted-foreground">Estimate your monthly sales to see potential earnings (at 10% average).</p>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Est. Monthly Sales (MWK)</label>
              <Input
                value={estSales}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setEstSales(val ? Number(val).toLocaleString("en-US") : "");
                }}
                className="mt-1 font-mono font-bold"
              />
            </div>
            <div className="flex-1 text-right">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Projected Earnings</label>
              <p className="text-2xl font-heading font-black text-emerald-600 mt-1">MWK {expectedCommission}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm flex flex-col justify-center">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg">Earn from Referrals</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Once certified, you can invite others to join the Forgiven Family. You'll earn a bonus for every successful agent you refer who makes their first sale.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-8 flex justify-center">
        <Button
          onClick={onNext}
          className="h-14 px-10 rounded-full text-lg font-heading font-black bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 group transition-all hover:scale-105"
        >
          Let's Begin <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>
    </motion.div>
  );
}
