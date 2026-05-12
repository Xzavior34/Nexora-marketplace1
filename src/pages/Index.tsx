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
        title="Nexora — Nigeria's National Economic Opportunity Platform"
        description="Nigeria's intelligent national gig economy. Verified professionals, AI-matched opportunities, Squad Escrow security, and Ajo peer-to-peer savings. Economic empowerment for every Nigerian."
        keywords="Nexora, Nigeria gig economy, economic empowerment, verified professionals, AI marketplace, Squad escrow, Ajo savings, artisan Nigeria, national opportunity platform"
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
