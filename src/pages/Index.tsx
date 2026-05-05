import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Forgiven Shopping Centre — Elevate Your Retail Business";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "The premier commerce solution for modern brands. Streamline your retail operations, empower your sales network, and grow your business with our unified platform.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
