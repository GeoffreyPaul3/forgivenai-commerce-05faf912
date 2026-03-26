const Footer = () => {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gold flex items-center justify-center">
            <span className="font-heading font-bold text-maroon-dark text-xs">F</span>
          </div>
          <span className="font-heading text-sm font-semibold text-foreground">Forgiven AI Commerce</span>
        </div>
        <p className="text-muted-foreground text-sm font-body">
          © 2026 Forgiven Shopping Centre. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
