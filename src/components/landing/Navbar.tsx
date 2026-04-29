import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLandingActions } from "@/hooks/useLandingActions";

const Navbar = () => {
  const { openWhatsApp } = useLandingActions();
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8 }}
      className="fixed top-0 left-0 right-0 z-50 bg-maroon-dark/80 backdrop-blur-xl border-b border-gold/10"
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gold flex items-center justify-center transition-transform duration-500 group-hover:rotate-[360deg] shrink-0">
            <span className="font-heading font-black text-maroon-dark text-lg">F</span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-heading text-xl font-bold text-white tracking-tight leading-none">Forgiven</span>
            <span className="text-gold text-[8px] uppercase tracking-[0.3em] font-bold mt-1">AI Commerce OS</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-10">
          {["Capabilities", "UGC", "Methodology"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-cream/50 hover:text-gold text-xs font-bold uppercase tracking-widest transition-all duration-300 relative group"
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          <Button 
            onClick={() => openWhatsApp()}
            className="hidden sm:flex rounded-full bg-gold hover:bg-gold-light text-maroon-dark font-bold px-6 border-none transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Chat with Sales AI
          </Button>
          <Link to="/dashboard">
            <Button variant="outline" className="rounded-full border-gold/20 text-gold hover:bg-gold/5 px-4 sm:px-6 transition-all duration-300 whitespace-nowrap">
              Enter Platform
            </Button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
