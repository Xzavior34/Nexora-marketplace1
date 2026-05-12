import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import Categories from "@/components/Categories";
import TrustSection from "@/components/TrustSection";
import Footer from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";

const Index = () => {
  return (
    <main className="min-h-screen">
      <SEOHead
        title="Nexora — The Intelligent Freelance Economy"
        description="Nigeria's intelligent freelance economy. Find top artisans, web developers, and workers. AI-matched gigs, Squad Escrow security, and AjoSquad."
        keywords="Nexora, Nigeria freelance, AI marketplace, Squad escrow, AjoSquad, artisan nigeria, intelligent economy"
        ogType="website"
        canonical="https://unigig.site"
      />
      <HeroSection />
      <HowItWorks />
      <Categories />
      <TrustSection />
      <Footer />
    </main>
  );
};

export default Index;
