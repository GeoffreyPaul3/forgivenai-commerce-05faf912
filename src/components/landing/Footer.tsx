import { Link } from "react-router-dom";
import { useLandingActions } from "@/hooks/useLandingActions";

const Footer = () => {
  const { openWhatsApp } = useLandingActions();
  return (
    <footer className="py-24 bg-black border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
                <span className="font-heading font-black text-maroon-dark text-sm">F</span>
              </div>
              <span className="font-heading text-xl font-bold text-white tracking-tight">Forgiven Shopping Centre</span>
            </Link>
            <p className="text-cream/40 text-sm font-body leading-relaxed max-w-sm mb-8">
              The world's most sophisticated integrated commerce infrastructure for 
              forward-thinking fashion and lifestyle brands.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-heading font-bold mb-6 italic">Platform</h4>
            <ul className="space-y-4">
              {["Capabilities", "UGC Engine", "WhatsApp Agent", "Dashboard"].map(item => (
                <li key={item}>
                  <a href="#" className="text-cream/40 hover:text-gold text-sm transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-heading font-bold mb-6 italic">Connect</h4>
            <ul className="space-y-4">
              {["Email", "WhatsApp", "Instagram", "LinkedIn"].map(item => (
                <li key={item}>
                  <button 
                    onClick={() => item === "WhatsApp" ? openWhatsApp() : null}
                    className="text-cream/40 hover:text-gold text-sm transition-colors text-left"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-cream/20 text-xs font-body tracking-widest uppercase">
            © 2026 Forgiven Shopping Centre. Distributed by Elite Brands.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-cream/20 hover:text-gold text-[10px] uppercase font-bold tracking-[0.2em] transition-colors">Privacy</a>
            <a href="#" className="text-cream/20 hover:text-gold text-[10px] uppercase font-bold tracking-[0.2em] transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
