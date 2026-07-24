import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, UserCircle2, MapPin, Building, Briefcase } from "lucide-react";
import { OnboardingState } from "../hooks/useOnboardingState";

interface Phase2ProfileSetupProps {
  state: OnboardingState;
  update: (s: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DISTRICTS = [
  "Blantyre", "Lilongwe", "Mzuzu", "Zomba", "Kasungu", "Mangochi",
  "Salima", "Dedza", "Karonga", "Mchinji", "Nkhata Bay", "Mulanje"
];

const CATEGORIES = [
  "Fashion & Apparel", "Shoes & Footwear", "Beauty & Cosmetics",
  "Electronics", "Home & Living", "Luxury & Designer",
  "Kids & Baby", "Accessories & Watches"
];

const CHANNELS = [
  "WhatsApp Status", "WhatsApp Groups", "Facebook Profile",
  "Facebook Groups", "Instagram", "TikTok", "Physical/In-person Network"
];

export default function Phase2ProfileSetup({ state, update, onNext, onBack }: Phase2ProfileSetupProps) {
  
  const handleProfileChange = (key: keyof OnboardingState["profileData"], value: string) => {
    update({ profileData: { ...state.profileData, [key]: value } });
  };

  const toggleCategory = (cat: string) => {
    const current = state.preferredCategories;
    const next = current.includes(cat)
      ? current.filter(c => c !== cat)
      : [...current, cat];
    update({ preferredCategories: next });
  };

  const toggleChannel = (ch: string) => {
    const current = state.salesChannels;
    const next = current.includes(ch)
      ? current.filter(c => c !== ch)
      : [...current, ch];
    update({ salesChannels: next });
  };

  // Determine if ready to advance (completion >= 70%)
  const isReady = state.profileCompletion >= 70;

  // Render a donut chart for completion
  const strokeDasharray = `${state.profileCompletion} 100`;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto space-y-8 pb-10"
    >
      <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-card p-6 rounded-3xl border border-border shadow-sm">
        <div>
          <h2 className="text-3xl font-heading font-black">Complete Your Profile</h2>
          <p className="text-muted-foreground mt-1 text-sm font-body">
            We need a few details to get your account ready for payouts and deliveries.
            Reach at least 70% to continue.
          </p>
        </div>
        
        {/* Live Completion Donut */}
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            <path
              className="text-muted/20"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            <motion.path
              className={state.profileCompletion >= 70 ? "text-emerald-500" : "text-primary"}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeDasharray={strokeDasharray}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xl font-heading font-black leading-none">{state.profileCompletion}%</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Personal Details */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCircle2 className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-bold text-lg">Personal Details</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Full Name</label>
              <Input 
                value={state.profileData.fullName || ""} 
                onChange={e => handleProfileChange("fullName", e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Phone (WhatsApp)</label>
              <Input 
                value={state.profileData.phone || ""} 
                onChange={e => handleProfileChange("phone", e.target.value)}
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">National ID Number</label>
              <Input 
                value={state.profileData.nationalId || ""} 
                onChange={e => handleProfileChange("nationalId", e.target.value)}
                className="bg-muted/30"
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <h3 className="font-heading font-bold text-lg">Location & Logistics</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">District</label>
              <Select value={state.profileData.district} onValueChange={v => handleProfileChange("district", v)}>
                <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select District" /></SelectTrigger>
                <SelectContent>
                  {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Area / Township</label>
              <Input 
                value={state.profileData.area || ""} 
                onChange={e => handleProfileChange("area", e.target.value)}
                placeholder="e.g. Nkolokoti, Area 25"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Nearest Landmark</label>
              <Input 
                value={state.profileData.landmark || ""} 
                onChange={e => handleProfileChange("landmark", e.target.value)}
                placeholder="e.g. Near the main mosque"
                className="bg-muted/30"
              />
            </div>
          </div>
        </div>

        {/* Payout Details */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-5 h-5 text-amber-500" />
            <h3 className="font-heading font-bold text-lg">Payout Details (Where to send commission)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Mobile Money Number</label>
              <Input 
                value={state.profileData.mobileMoney || ""} 
                onChange={e => handleProfileChange("mobileMoney", e.target.value)}
                placeholder="Airtel/TNM number"
                className="bg-muted/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Registered Name</label>
              <Input 
                value={state.profileData.mobileMoneyName || ""} 
                onChange={e => handleProfileChange("mobileMoneyName", e.target.value)}
                className="bg-muted/30"
              />
            </div>
          </div>
        </div>

        {/* Sales Preferences */}
        <div className="p-6 rounded-3xl bg-card border border-border space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-5 h-5 text-purple-500" />
            <h3 className="font-heading font-bold text-lg">Sales Strategy</h3>
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Preferred Categories (Select up to 3)</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  disabled={!state.preferredCategories.includes(cat) && state.preferredCategories.length >= 3}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    state.preferredCategories.includes(cat)
                      ? "bg-primary text-white border-primary"
                      : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">How will you sell? (Select all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(ch => (
                <button
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    state.salesChannels.includes(ch)
                      ? "bg-purple-500 text-white border-purple-500"
                      : "bg-muted/20 text-muted-foreground border-border hover:bg-muted/50"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Estimated Customers per Month</label>
            <Select value={state.estimatedCustomers} onValueChange={v => update({ estimatedCustomers: v })}>
              <SelectTrigger className="bg-muted/30 md:w-1/2"><SelectValue placeholder="Select estimate" /></SelectTrigger>
              <SelectContent>
                {["1 - 10", "11 - 25", "26 - 50", "50+"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

        </div>

      </div>

      <div className="flex justify-between items-center pt-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="mr-2 w-4 h-4" /> Back
        </Button>
        <Button 
          onClick={onNext}
          disabled={!isReady}
          className={`h-12 px-8 rounded-full font-heading font-black transition-all ${
            isReady ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105" : "bg-muted text-muted-foreground"
          }`}
        >
          {isReady ? "Continue" : `Reach 70% to Continue`}
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
