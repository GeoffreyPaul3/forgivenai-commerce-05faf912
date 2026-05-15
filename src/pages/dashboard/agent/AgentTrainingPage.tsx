import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  BookOpen, CheckCircle, AlertTriangle, DollarSign, Package,
  Lightbulb, MessageSquare, ShieldAlert, Users, Star, ChevronDown,
  ChevronUp, Trophy, Phone, GraduationCap, FileText, ClipboardList,
  Banknote, UserCheck, Heart, Megaphone, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const sections = [
  {
    id: "welcome",
    icon: Heart,
    color: "text-pink-500 bg-pink-500/10",
    badge: "Onboarding",
    title: "Welcome to the Forgiven Family",
    description: "Your journey as a Forgiven SC Sales Agent starts here.",
    content: (
      <div className="space-y-4 font-body text-sm text-foreground/90">
        <p>Welcome to the <strong>Forgiven Shopping Centre Sales Team!</strong> We are excited to have you on board, and we are committed to supporting you on this journey of earning and growing.</p>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
          <p className="font-bold text-primary">This handbook will help you:</p>
          <ul className="space-y-1 pl-2">
            {["Understand your commission structure","Learn how to sell effectively and professionally","Follow our rules and guidelines","Know how to earn money and succeed as a Forgiven SC Sales Agent"].map(t => (
              <li key={t} className="flex items-start gap-2"><CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5"/><span>{t}</span></li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {[
            { title: "Integrity", desc: "Honesty and transparency in everything we do. Building trust with agents and customers is at the core of our brand." },
            { title: "Excellence", desc: "Top-tier quality products and professional service. Our aim is to exceed expectations with every sale." },
            { title: "Empowerment", desc: "We empower agents to take control of their financial future through our commission-based programme." },
          ].map(v => (
            <div key={v.title} className="rounded-xl border border-border bg-card p-3">
              <p className="font-bold text-foreground text-sm mb-1">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "commission",
    icon: DollarSign,
    color: "text-emerald-500 bg-emerald-500/10",
    badge: "Earnings",
    title: "Commission System",
    description: "How you earn 10% on every successful sale.",
    content: (
      <div className="space-y-4 font-body text-sm text-foreground/90">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="font-bold text-emerald-600 text-base mb-1">Your Rate: 10% Commission Per Sale</p>
          <p className="text-muted-foreground">Example: If a product sells for <strong>MWK 40,000</strong>, your commission is <strong>MWK 4,000</strong>.</p>
        </div>
        <div className="space-y-2">
          {[
            { label: "When recorded?", value: "After the order is delivered or picked up by the customer." },
            { label: "Payout day?", value: "Every Friday — based on sales completed in the previous week." },
            { label: "From Jan 2026?", value: "Commissions paid every two weeks (twice a month)." },
            { label: "How to track?", value: "Request your weekly commission summary from Admin at any time." },
            { label: "Payment method?", value: "Bank transfers ONLY. No cash, no Airtel Money, no Mpamba." },
          ].map(r => (
            <div key={r.label} className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/>
              <div>
                <span className="font-bold text-foreground">{r.label} </span>
                <span className="text-muted-foreground">{r.value}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
          <p className="font-bold text-blue-600 mb-2">Repeat Customer Policy</p>
          <p className="text-sm text-muted-foreground">If a customer you brought buys again <strong>within 30 days</strong>, the commission still goes to you. After 30 days, that customer becomes a Forgiven SC customer and no commission is earned.</p>
        </div>
      </div>
    ),
  },
  {
    id: "payment",
    icon: Banknote,
    color: "text-yellow-500 bg-yellow-500/10",
    badge: "Critical",
    title: "Payment Rules",
    description: "STRICT rules to protect you, the customer, and the brand.",
    content: (
      <div className="space-y-4 font-body text-sm text-foreground/90">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5"/>
          <div>
            <p className="font-bold text-red-600">STRICT RULE: Agents must NEVER receive money from customers.</p>
            <p className="text-muted-foreground mt-1">Customers must ONLY pay to Forgiven Shopping Centre accounts. No order is valid without Proof of Payment (POP).</p>
          </div>
        </div>
        <p className="font-bold text-foreground">Official Payment Channels:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { bank: "National Bank of Malawi (NBM)", branch: "Lilongwe Service Centre", acc: "1009408537", name: "Forgiven Shopping Centre" },
            { bank: "FDH Bank", branch: "Lilongwe Old Town Branch", acc: "1920000180907", name: "Forgiven Shopping Centre" },
          ].map(b => (
            <div key={b.bank} className="rounded-xl border border-border bg-card p-3">
              <p className="font-bold text-sm text-foreground">{b.bank}</p>
              <p className="text-xs text-muted-foreground">Branch: {b.branch}</p>
              <p className="text-xs font-mono text-primary mt-1">Acc: {b.acc}</p>
              <p className="text-xs text-muted-foreground">{b.name}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="font-bold text-sm text-foreground mb-2">Mobile Money</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Airtel Money: </span><span className="font-mono text-primary">2265949</span><br/><span className="text-muted-foreground text-[10px]">Tuntufye Mwalwenje</span></div>
            <div><span className="text-muted-foreground">TNM Mpamba: </span><span className="font-mono text-primary">2028745</span><br/><span className="text-muted-foreground text-[10px]">Tuntufye Mwalwenje</span></div>
          </div>
        </div>
        <div className="bg-yellow-500/5 border border-yellow-400/30 rounded-2xl p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Refund Policy:</strong> Forgiven SC does NOT issue refunds for any reason. Customers may exchange an item if the product meets exchange conditions.
        </div>
      </div>
    ),
  },
  {
    id: "orders",
    icon: Package,
    color: "text-blue-500 bg-blue-500/10",
    badge: "Process",
    title: "Order Process",
    description: "Step-by-step: how to process an order and earn your commission.",
    content: (
      <div className="space-y-3 font-body text-sm text-foreground/90">
        {[
          { step: "1", title: "Customer Chooses Product", desc: "Confirm size, colour, and price with the customer." },
          { step: "2", title: "Share Payment Details", desc: "Send the official Forgiven SC payment channels above." },
          { step: "3", title: "Receive Proof of Payment (POP)", desc: "Ask the customer to send a screenshot of their payment." },
          { step: "4", title: "Submit Order to Admin", desc: "Send the following to Admin: POP screenshot · Customer's name · Product(s) ordered · Size/Colour · Delivery/Pickup address · Your name (Agent) · Customer's phone number" },
          { step: "5", title: "Order Confirmation", desc: "Admin verifies payment and prepares the order for delivery or pickup." },
          { step: "6", title: "Earn Commission", desc: "Once the order is confirmed and delivered, your 10% is added to your balance." },
        ].map(s => (
          <div key={s.step} className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">{s.step}</div>
            <div>
              <p className="font-bold text-foreground">{s.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "rules",
    icon: ShieldAlert,
    color: "text-primary bg-primary/10",
    badge: "Rules",
    title: "Agent Guidelines & Rules",
    description: "Follow these at all times to protect yourself, customers, and the brand.",
    content: (
      <div className="space-y-4 font-body text-sm text-foreground/90">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="font-bold text-emerald-600 flex items-center gap-2"><CheckCircle className="w-4 h-4"/>What You CAN Do</p>
            {["Promote and sell Forgiven SC products","Share official product photos and descriptions","Follow our official pricing for all sales","Use provided captions for social media posts","Submit complaints and report challenges","Suggest new products for us to stock","Share important customer feedback"].map(t => (
              <div key={t} className="flex gap-2 text-xs p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5"/><span>{t}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="font-bold text-red-500 flex items-center gap-2"><XCircle className="w-4 h-4"/>What You CANNOT Do</p>
            {["Handle customer payments directly","Change prices or offer unauthorised discounts","Create your own promotional materials without approval","Engage in unprofessional behaviour","Speak negatively about the shop or other agents","Create your own posters or logos without permission","Screenshot customer numbers for personal use"].map(t => (
              <div key={t} className="flex gap-2 text-xs p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5"/><span>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-orange-500/5 border border-orange-400/30 rounded-2xl p-4">
          <p className="font-bold text-orange-600 mb-2">Warning & Removal System</p>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-500/10"><span className="font-bold text-yellow-600">1st</span> Written Warning</div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10"><span className="font-bold text-orange-600">2nd</span> 14-day Probation Period</div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10"><span className="font-bold text-red-600">3rd</span> Immediate Termination + loss of all pending commissions</div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3"><strong>Major violations</strong> (immediate removal): receiving payments directly, misleading customers, selling unauthorised products, unprofessional conduct.</p>
        </div>
      </div>
    ),
  },
  {
    id: "group",
    icon: MessageSquare,
    color: "text-teal-500 bg-teal-500/10",
    badge: "Community",
    title: "WhatsApp Group Conduct",
    description: "Keep the group professional and productive.",
    content: (
      <div className="space-y-4 font-body text-sm text-foreground/90">
        <p className="text-muted-foreground">The WhatsApp group is for <strong>official business use only</strong>. Keep it clean and professional at all times.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-bold text-emerald-600 mb-2">✅ Allowed</p>
            {["Stock updates","Order updates and processing","Training materials and motivation","Asking Admin for support","Sharing approved promotional content","Reporting challenges while making a sale"].map(t => (
              <div key={t} className="text-xs py-1.5 px-2 mb-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10">{t}</div>
            ))}
          </div>
          <div>
            <p className="font-bold text-red-500 mb-2">❌ Not Allowed</p>
            {["Gossip or personal chats","Fights or arguments","Politics or religion","Posting other products","Voice notes (unless requested)","Flooding with unnecessary messages","Memes or jokes","Off-topic conversations"].map(t => (
              <div key={t} className="text-xs py-1.5 px-2 mb-1 rounded-lg bg-red-500/5 border border-red-500/10">{t}</div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic">Rudeness = immediate removal.</p>
      </div>
    ),
  },
  {
    id: "success",
    icon: Star,
    color: "text-amber-500 bg-amber-500/10",
    badge: "Growth",
    title: "Success Tips & Top Agent Rewards",
    description: "Be consistent. Be motivated. Top performers earn well.",
    content: (
      <div className="space-y-4 font-body text-sm text-foreground/90">
        <div className="bg-amber-500/5 border border-amber-400/30 rounded-2xl p-4">
          <p className="font-bold text-amber-600 mb-3">Top Performance Tips</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { tip: "Post 3–5 times daily", detail: "On WhatsApp Status, Facebook, and social media." },
              { tip: "Use strong captions", detail: "Sell the lifestyle, not just the product." },
              { tip: "Respond quickly", detail: "Faster responses lead to quicker sales." },
              { tip: "Ask for the sale", detail: "\"Shall I reserve one for you?\" — creates urgency." },
              { tip: "Stay consistent", detail: "Your income depends on your daily commitment." },
              { tip: "Use proper pictures", detail: "Always use official images provided by Forgiven SC." },
            ].map(t => (
              <div key={t.tip} className="p-2.5 rounded-xl bg-card border border-border">
                <p className="font-bold text-xs text-foreground">{t.tip}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <p className="font-bold text-primary flex items-center gap-2 mb-2"><Trophy className="w-4 h-4"/>Top Agent Rewards</p>
          <p className="text-xs text-muted-foreground mb-3">Once you become a Top Agent, you are entitled to:</p>
          <div className="grid grid-cols-2 gap-2">
            {["Official organisation shirt","Organisation cap","Physical product catalogue","Invitations to company events","Mentorship opportunities","Early access to new products"].map(r => (
              <div key={r} className="flex gap-1.5 text-xs p-2 rounded-lg bg-primary/5 border border-primary/10">
                <Star className="w-3 h-3 text-primary shrink-0 mt-0.5"/>{r}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "qualifications",
    icon: UserCheck,
    color: "text-violet-500 bg-violet-500/10",
    badge: "Eligibility",
    title: "Qualifications & Support",
    description: "What you need to work with us and how to get help.",
    content: (
      <div className="space-y-4 font-body text-sm text-foreground/90">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-bold mb-3">To work with us, you must:</p>
          <div className="space-y-2">
            {["Own a smartphone","Be able to read and understand both English and Chichewa","Be able to speak fluently in both English and Chichewa","Be motivated, responsible, and able to commit time to making sales"].map(q => (
              <div key={q} className="flex gap-2 text-xs p-2 rounded-lg bg-muted/40">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5"/><span>{q}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="font-bold mb-3 flex items-center gap-2"><Phone className="w-4 h-4 text-primary"/>Contacts for Support</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <span className="text-muted-foreground">WhatsApp:</span><span className="font-bold text-foreground">+265 997 128 899</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <span className="text-muted-foreground">Direct Calls:</span><span className="font-bold text-foreground">+265 981 199 702</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <span className="text-muted-foreground">Location:</span><span className="font-bold text-foreground">Lilongwe, Area 5, Karson House, Office #18</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {["Instagram: Forgiven Shopping Centre", "Facebook: Forgiven Shopping Centre", "TikTok: Forgiven Shopping Centre"].map(s => (
              <span key={s} className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{s}</span>
            ))}
          </div>
        </div>
      </div>
    ),
  },
];

export default function AgentTrainingPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(["welcome"]));

  const toggle = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOpen = openSections.size === sections.length;
  const toggleAll = () => {
    if (allOpen) setOpenSections(new Set());
    else setOpenSections(new Set(sections.map(s => s.id)));
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, hsl(var(--sidebar-background)) 0%, #1a0630 100%)" }}
      >
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #A21D7F 0%, transparent 60%)" }}
        />
        <div className="relative p-8 flex flex-col md:flex-row md:items-center gap-4">
          <div className="p-4 rounded-2xl bg-white/10 shrink-0">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-[#E8B4E8] opacity-80">Stage 3</span>
              <Badge className="bg-white/10 text-white border-white/20 text-[10px]">Active</Badge>
            </div>
            <h1 className="font-heading text-3xl font-bold text-white">Training & Enablement Hub</h1>
            <p className="text-white/60 font-body mt-1 text-sm">
              Master the business model, learn to sell correctly, and unlock your full earning potential.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 shrink-0"
          >
            {allOpen ? "Collapse All" : "Expand All"}
          </Button>
        </div>
      </motion.div>

      {/* Progress chips */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              if (!openSections.has(s.id)) toggle(s.id);
              setTimeout(() => document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors"
          >
            <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
            {s.title.split(" ").slice(0, 2).join(" ")}
          </button>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, i) => {
          const Icon = section.icon;
          const isOpen = openSections.has(section.id);
          return (
            <motion.div
              key={section.id}
              id={`section-${section.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Collapsible open={isOpen} onOpenChange={() => toggle(section.id)}>
                <Card className="rounded-3xl border-border overflow-hidden hover:shadow-md transition-shadow">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/20 transition-colors pb-4 select-none">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${section.color} shrink-0`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <CardTitle className="font-heading text-base">{section.title}</CardTitle>
                              <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider hidden sm:flex">
                                {section.badge}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs">{section.description}</CardDescription>
                          </div>
                        </div>
                        <div className="shrink-0 text-muted-foreground">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <CardContent className="pt-0 pb-6 border-t border-border">
                            <div className="pt-4">
                              {section.content}
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom motivation card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-3xl p-6 border border-primary/20 bg-primary/5"
      >
        <div className="flex gap-4 items-start">
          <div className="p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-lg font-bold text-foreground">Final Message from Management</h3>
            <p className="text-sm text-muted-foreground font-body mt-2 leading-relaxed">
              "Forgiven SC wants every agent to <strong className="text-foreground">WIN</strong>. Follow the rules, stay committed, and you will earn well.
              Your income depends on your consistency and effort. Keep positive, active, and engaged every day.
              <strong className="text-foreground"> We rise and succeed together.</strong>"
            </p>
            <p className="text-xs text-primary font-bold mt-3">— Monica Kuthembamwale, Store & Business Development Manager</p>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
