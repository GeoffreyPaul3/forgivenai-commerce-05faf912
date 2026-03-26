import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Add Products",
    description: "Import from your website or add manually. AI generates descriptions, tags, and categories.",
  },
  {
    number: "02",
    title: "AI Creates Content",
    description: "Automatically generate marketing videos, social posts, and campaign creatives.",
  },
  {
    number: "03",
    title: "Sell Everywhere",
    description: "Customers find you on WhatsApp, web, or through agents. AI handles conversations.",
  },
  {
    number: "04",
    title: "Automate & Scale",
    description: "Orders process, payments clear, and deliveries track — all on autopilot.",
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 px-6 bg-card">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-gold font-body text-sm tracking-widest uppercase">Process</span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-foreground mt-3">
            How It Works
          </h2>
        </motion.div>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="flex items-start gap-8 py-10 border-b border-border last:border-0"
            >
              <span className="text-gold/30 font-heading text-6xl md:text-7xl font-bold leading-none select-none">
                {step.number}
              </span>
              <div className="pt-2">
                <h3 className="font-heading text-2xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground font-body max-w-lg">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
