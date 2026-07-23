import HeroSection from "@/components/landing/HeroSection";

import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Forgiven Shopping Centre";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Forgiven Shopping Centre — Command Centre.");
    }
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-black">
      <HeroSection />
    </div>
  );
};

export default Index;
