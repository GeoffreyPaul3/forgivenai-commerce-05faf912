import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Product Synthesis",
    description: "Our Firecrawl engine extracts product data from any source, while Gemini AI synthesizes high-end attributes and brand-aligned catalog descriptors.",
  },
  {
    number: "02",
    title: "Content Generation",
    description: "fal.ai and Veo 3.1 automatically generate cinematic social media content and high-conversion marketings assets for your entire collection.",
  },
  {
    number: "03",
    title: "Sales Concierge",
    description: "Launch your WhatsApp AI sales agent and commerce hub. Automate entire customer journeys from first inquiry to final payment.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="methodology" className="py-32 bg-cream relative overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center mb-24">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-gold font-bold uppercase tracking-[0.3em] text-[10px] mb-4"
          >
            The Operating System
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-heading text-5xl md:text-6xl font-bold text-maroon-dark"
          >
            Bespoke <span className="italic underline decoration-gold/30 underline-offset-8">Automation</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-3 gap-16 relative">
          {/* Connector Line */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gold/10 hidden lg:block -translate-y-1/2" />
          
          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.2, duration: 0.8 }}
              className="relative group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-white border border-gold/20 flex items-center justify-center mb-8 relative z-10 transition-all duration-500 group-hover:bg-maroon-dark group-hover:border-maroon-dark">
                  <span className="font-heading text-2xl font-bold text-maroon-dark group-hover:text-gold transition-colors duration-500">
                    {step.number}
                  </span>
                </div>
                <h3 className="font-heading text-2xl font-bold text-maroon-dark mb-4">
                  {step.title}
                </h3>
                <p className="text-maroon/60 font-body leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
