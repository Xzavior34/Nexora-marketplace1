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
        title="UniGigs - University Student Freelance Marketplace | Earn Money on Campus"
        description="The #1 trusted marketplace for university students worldwide. Post tasks, find gigs, earn money on campus, and get paid securely with instant payouts. Join thousands of students earning today!"
        keywords="university freelance, student jobs, campus gigs, earn money college, student marketplace, freelance students, university tasks, student services, campus work, side hustle students, unigigs, uni gigs"
        ogType="website"
        canonical="https://unigigs.lovable.app"
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
