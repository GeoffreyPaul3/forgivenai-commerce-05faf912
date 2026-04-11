import { motion } from "framer-motion";
import { 
  ShoppingBag, 
  Video, 
  MessageSquare, 
  CreditCard, 
  Users, 
  Bot, 
  Zap, 
  BarChart3,
  Check
} from "lucide-react";

const features = [
  {
    icon: ShoppingBag,
    title: "Product Hub",
    description: "AI-driven onboarding that extracts 200+ fabric, fit, and style attributes into sophisticated brand-aligned descriptors.",
    benefit: "Precision Cataloging"
  },
  {
    icon: Video,
    title: "UGC Studio",
    description: "Convert flat imagery into cinematic high-conversion short-form videos featuring AI avatars (fal.ai + Veo 3.1).",
    benefit: "Zero Production Lag"
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Sales Agent",
    description: "Multi-modal persistent AI agents that handle sales, support, and orders with the elegance of a personal shopper.",
    benefit: "Twilio-Powered Concierge"
  },
  {
    icon: CreditCard,
    title: "Order & Pay",
    description: "Integrated global checkout with PayChangu. Automated order tracking and fulfillment synchronization.",
    benefit: "Frictionless Settlement"
  },
  {
    icon: Users,
    title: "Agent Matrix",
    description: "A high-performance multi-level referral and commission ecosystem for brand ambassadors and field agents.",
    benefit: "Organic Growth Engine"
  },
  {
    icon: Zap,
    title: "Event Architecture",
    description: "A sophisticated event-driven backend that triggers marketing, inventory, and logistics in real-time.",
    benefit: "Synchronized Operations"
  }
];

const FeaturesSection = () => {
  return (
    <section id="capabilities" className="py-32 bg-white relative">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-24 gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl"
          >
            <h2 className="font-heading text-5xl md:text-6xl font-bold text-maroon-dark leading-[1.1]">
              The Core <br />
              <span className="italic">Systems of Success</span>
            </h2>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-maroon/60 text-lg max-w-md font-body"
          >
            Forgiven AI Commerce OS provides the essential infrastructure to automate every touchpoint of your fashion brand.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              className="group"
            >
              <div className="relative mb-8 overflow-hidden rounded-2xl bg-cream p-10 transition-all duration-500 group-hover:bg-maroon-dark group-hover:shadow-[0_20px_40px_rgba(90,15,28,0.1)]">
                <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-maroon/5 text-maroon transition-all duration-500 group-hover:bg-white/10 group-hover:text-gold group-hover:rotate-12">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-maroon-dark transition-colors duration-500 group-hover:text-white">
                  {feature.title}
                </h3>
                <p className="mt-4 text-maroon/60 transition-colors duration-500 group-hover:text-cream/70 font-body">
                  {feature.description}
                </p>
                
                <div className="mt-8 flex items-center gap-2 text-sm font-bold tracking-tight text-gold opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-2">
                  <Check className="h-4 w-4" />
                  {feature.benefit}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
