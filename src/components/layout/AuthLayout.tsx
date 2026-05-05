import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "@/assets/forgiven.png";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-maroon-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gold/5 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gold/5 blur-[120px]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md z-10"
      >
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="rounded-lg bg-white/80 flex items-center justify-center shadow-lg shadow-gold/20">
              <img src={logo} alt="Forgiven Shop Logo" width={50} height={50}/>
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-2xl font-bold text-white tracking-tight leading-none uppercase">Forgiven</span>
              <span className="text-gold text-[10px] uppercase tracking-[0.4em] font-bold mt-1">Shopping Centre</span>
            </div>
          </Link>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl relative">
          {/* Decorative border gradient */}
          <div className="absolute -top-[1px] left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
          
          {children}
        </div>
        
        <p className="mt-8 text-center text-cream/40 text-sm font-body">
          &copy; {new Date().getFullYear()} Forgiven Shopping Centre. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
