import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBasket } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-black">
      {/* Cinematic background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(90,15,28,0.45),rgba(0,0,0,0.95))] z-10" />
        <motion.div
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.45 }}
          transition={{ duration: 3, ease: "easeOut" }}
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay"
        />
      </div>

      {/* Ambient glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary rounded-full blur-[160px]"
        />
        <motion.div
          animate={{ scale: [1.15, 1, 1.15], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
          className="absolute bottom-[-10%] right-[-10%] w-[65%] h-[65%] bg-maroon rounded-full blur-[200px]"
        />
      </div>

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "backOut" }}
          className="inline-flex items-center gap-2.5 px-5 py-1.5 rounded-full border border-gold/20 bg-white/5 backdrop-blur-xl mb-8 shadow-[0_0_30px_rgba(234,179,8,0.08)]"
        >
          <ShoppingBasket className="w-3 h-3 text-gold" />
          <span className="text-gold-light text-[9px] font-black tracking-[0.45em] uppercase">
            Forgiven Shopping Centre
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
          className="font-heading text-5xl md:text-7xl lg:text-[7.5rem] font-bold text-white tracking-tighter leading-[0.88] mb-12"
        >
          Command<br />
          <span className="text-gradient-gold italic pr-3">Centre</span>
        </motion.h1>

        {/* Single CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.55 }}
        >
          <Link to="/dashboard">
            <Button
              size="lg"
              id="enter-command-centre"
              className="h-16 px-12 rounded-full bg-gold hover:bg-gold-light text-maroon-dark font-black text-lg transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(234,179,8,0.45)] group relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2.5">
                Enter Command Centre
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
              </span>
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Thin gold bottom line — no text */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 1.2, duration: 1.4, ease: [0.23, 1, 0.32, 1] }}
        className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent origin-center"
      />
    </section>
  );
};

export default HeroSection;
