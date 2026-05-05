import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Play, ChevronDown, ShoppingBasket } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  const scrollToCapabilities = () => {
    const element = document.getElementById("capabilities");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section 
      ref={containerRef}
      className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black"
    >
      {/* Cinematic Background Layering */}
      <div className="absolute inset-0 z-0">
        <motion.div 
          style={{ y: y1 }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(90,15,28,0.4),rgba(0,0,0,0.9))] z-10" />
          <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.5 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"
          />
        </motion.div>
      </div>

      {/* Advanced Light Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-gold rounded-full blur-[150px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.1, 0.15, 0.1] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-maroon rounded-full blur-[200px]" 
        />
      </div>

      {/* Content Container */}
      <motion.div 
        className="relative z-20 container mx-auto px-6 h-full flex items-center justify-center pt-24"
      >
        <div className="flex flex-col items-center text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "backOut" }}
            className="inline-flex items-center gap-3 px-5 py-1.5 rounded-full border border-gold/20 bg-white/5 backdrop-blur-xl mb-6 shadow-[0_0_30px_rgba(234,179,8,0.1)]"
          >
            <ShoppingBasket className="w-3.5 h-3.5 text-gold" />
            <span className="text-gold-light text-[9px] font-black tracking-[0.4em] uppercase">
              Unified Retail Ecosystem
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="font-heading text-5xl md:text-7xl lg:text-[7rem] font-bold text-white mb-6 tracking-tighter leading-[0.9]"
          >
            The Future of <br />
            <span className="text-gradient-gold italic pr-4">Retail</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-cream/60 text-base md:text-xl max-w-2xl mx-auto mb-10 font-body font-extralight tracking-wide leading-relaxed"
          >
            Scale your brand with an elegant, all-in-one platform built for ambitious fashion and lifestyle businesses. Expand your reach and streamline operations effortlessly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-6 items-center"
          >
            <Link to="/dashboard">
              <Button 
                size="lg" 
                className="h-16 px-10 rounded-full bg-gold hover:bg-gold-light text-maroon-dark font-black text-lg transition-all duration-700 hover:scale-105 hover:shadow-[0_0_50px_rgba(234,179,8,0.5)] group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
                </span>
              </Button>
            </Link>
            <button 
              onClick={scrollToCapabilities}
              className="flex items-center gap-4 text-gold hover:text-gold-light transition-all duration-500 group"
            >
              <div className="w-14 h-14 rounded-full border border-gold/30 flex items-center justify-center group-hover:bg-gold/10 transition-colors">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <span className="font-bold text-sm tracking-[0.2em] uppercase">Explore Platform</span>
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Decorative Bottom Elements */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-0 w-full px-12 flex items-end justify-between z-30 pointer-events-none"
      >
        <div className="flex flex-col gap-4">
          <div className="w-[1px] h-32 bg-gradient-to-t from-gold/50 to-transparent" />
          <span className="text-[10px] text-gold/40 tracking-[0.5em] uppercase vertical-text">Bespoke Solutions</span>
        </div>
        
        <div className="flex flex-col items-end gap-4 text-right">
          <span className="text-[10px] text-gold/40 tracking-[0.5em] uppercase">Powered by</span>
          <span className="font-heading text-lg text-cream/30 italic">Forgiven Shopping Centre</span>
          <div className="w-[1px] h-32 bg-gradient-to-t from-gold/50 to-transparent" />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
