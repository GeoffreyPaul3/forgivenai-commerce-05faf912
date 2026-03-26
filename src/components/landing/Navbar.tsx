import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-maroon-dark/80 backdrop-blur-lg border-b border-gold/10">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
            <span className="font-heading font-bold text-maroon-dark text-sm">F</span>
          </div>
          <span className="font-heading text-xl font-bold text-cream">Forgiven</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Features", "How It Works", "Pricing"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
              className="text-cream/60 hover:text-cream text-sm font-body transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="heroOutline" size="sm" className="text-xs">
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
