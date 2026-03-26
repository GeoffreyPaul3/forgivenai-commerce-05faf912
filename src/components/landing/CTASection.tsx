import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 px-6">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-maroon-gradient rounded-2xl p-12 md:p-16 text-center relative overflow-hidden"
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gold/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <h2 className="font-heading text-4xl md:text-5xl font-bold text-cream mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-cream/60 font-body text-lg max-w-xl mx-auto mb-8">
              Join forward-thinking brands already using AI to automate their entire commerce operation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" className="text-base px-8 py-6">
                Start Building Now
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
              <Button variant="heroOutline" size="lg" className="text-base px-8 py-6">
                Talk to Sales
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
