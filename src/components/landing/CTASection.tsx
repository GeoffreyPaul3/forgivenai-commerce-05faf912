import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-32 bg-maroon-dark relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gold/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto rounded-[3rem] bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 p-12 md:p-24 text-center backdrop-blur-xl"
        >
          <div className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold text-[10px] font-bold uppercase tracking-widest">
            <Mail className="w-3 h-3" />
            Limited Access Membership
          </div>

          <h2 className="font-heading text-4xl md:text-6xl font-bold text-white mb-8">
            Begin Your <span className="text-gradient-gold italic">Ascension</span>
          </h2>

          <p className="text-cream/60 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-body font-light">
            Join the elite fashion houses that have replaced manual chaos with intelligent cinematic automation.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" className="h-16 px-10 rounded-full bg-gold hover:bg-gold-light text-maroon-dark font-bold text-lg transition-all duration-500 hover:scale-105 group">
              Apply for Access
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="h-16 px-10 rounded-full border-white/20 text-white hover:bg-white/5 transition-all duration-500">
              Speak to a Specialist
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
