import { motion } from "framer-motion";
import {
  ShoppingBag,
  MessageSquare,
  Video,
  CreditCard,
  Users,
  BarChart3,
  Bot,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: ShoppingBag,
    title: "Product Management",
    description: "AI-powered product onboarding with auto-generated descriptions and smart categorization.",
  },
  {
    icon: Video,
    title: "UGC Content Engine",
    description: "Generate marketing videos, social posts, and campaign creatives from product data automatically.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Commerce",
    description: "AI sales agent on WhatsApp that answers questions, recommends products, and captures orders.",
  },
  {
    icon: CreditCard,
    title: "Payment Processing",
    description: "Seamless checkout with PayChangu integration, automated payment tracking and reconciliation.",
  },
  {
    icon: Users,
    title: "Agent & Referral System",
    description: "Manage sales agents with referral codes, commission tracking, and performance dashboards.",
  },
  {
    icon: Bot,
    title: "AI Business Assistant",
    description: "Get restocking suggestions, trend analysis, and campaign recommendations powered by AI.",
  },
  {
    icon: Zap,
    title: "Workflow Automation",
    description: "Event-driven workflows that trigger on product creation, orders, and payments automatically.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Real-time sales, revenue, and product performance dashboards with actionable insights.",
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const FeaturesSection = () => {
  return (
    <section className="py-24 px-6">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-gold font-body text-sm tracking-widest uppercase">Capabilities</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mt-3">
            Everything You Need to Scale
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-4 font-body">
            A complete operating system that handles every aspect of your fashion commerce business.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={item}
              className="group p-6 rounded-xl border border-border bg-card hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm font-body leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
