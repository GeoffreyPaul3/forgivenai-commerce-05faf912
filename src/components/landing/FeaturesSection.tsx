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
    title: "Unified Inventory",
    description: "Streamline your product catalog with detailed attributes and sophisticated descriptions that resonate with your target audience.",
    benefit: "Cohesive Cataloging"
  },
  {
    icon: Video,
    title: "Creative Studio",
    description: "Transform standard product images into high-impact marketing visuals that capture attention and drive conversions.",
    benefit: "Instant Visual Assets"
  },
  {
    icon: MessageSquare,
    title: "Seamless Sales",
    description: "Engage customers directly through intelligent messaging channels that provide a personalized shopping experience.",
    benefit: "Direct Customer Engagement"
  },
  {
    icon: CreditCard,
    title: "Global Commerce",
    description: "Secure, integrated payment solutions and automated order tracking for a frictionless customer journey.",
    benefit: "Reliable Transactions"
  },
  {
    icon: Users,
    title: "Sales Network",
    description: "Empower a scalable network of partners and ambassadors with an intuitive referral and performance tracking system.",
    benefit: "Scalable Growth"
  },
  {
    icon: Zap,
    title: "Operational Flow",
    description: "Synchronize your entire business—from inventory to logistics—with a responsive and reliable core infrastructure.",
    benefit: "Optimized Efficiency"
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
              Engineered for <br />
              <span className="italic">Total Control</span>
            </h2>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-maroon/60 text-lg max-w-md font-body"
          >
            Our unified platform provides the essential tools to optimize every touchpoint of your fashion and lifestyle brand.
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
