import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Privacy Policy | Nexora"
        description="Nexora's Privacy Policy explains how we collect, use, and protect your personal information."
        canonical="https://unigig.site/privacy"
      />

      <div className="container max-w-4xl px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">We collect the following information:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Account Information:</strong> Name, email, location, phone number</li>
                <li><strong className="text-foreground">Profile Information:</strong> Bio, skills, profile photo</li>
                <li><strong className="text-foreground">Transaction Data:</strong> Payment history, wallet balance, bank details for withdrawals</li>
                <li><strong className="text-foreground">Usage Data:</strong> How you interact with our platform</li>
                <li><strong className="text-foreground">Communications:</strong> Messages exchanged on the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>To provide and improve our services</li>
                <li>To process payments and withdrawals</li>
                <li>To send notifications about your gigs and transactions</li>
                <li>To verify your identity and prevent fraud</li>
                <li>To resolve disputes between users</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your personal information. We may share information with:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong className="text-foreground">Payment Processors:</strong> Squad by GTCO for secure payment processing and escrow</li>
                <li><strong className="text-foreground">Email Services:</strong> For notifications and communications</li>
                <li><strong className="text-foreground">Legal Authorities:</strong> When required by law</li>
                <li><strong className="text-foreground">Other Users:</strong> Your public profile information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your data, including encryption, 
                secure servers, and regular security audits. However, no system is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and associated data</li>
                <li>Object to certain data processing</li>
                <li>Export your data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Cookies & Tracking</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to improve your experience, analyze usage, 
                and provide personalized content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your data as long as your account is active or as needed to provide services. 
                Transaction records may be kept longer for legal and accounting purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                For privacy-related questions, contact us at{' '}
                <a href="mailto:support@unigig.site" className="text-primary hover:underline">
                  support@unigig.site
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
