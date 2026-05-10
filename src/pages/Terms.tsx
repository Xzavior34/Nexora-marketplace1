import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Terms of Service | Nexora"
        description="Read Nexora's Terms of Service. Understand your responsibilities and our policies for using the platform."
        canonical="https://unigig.site/terms"
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
            <CardTitle className="text-2xl sm:text-3xl">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last updated: January 2025</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Nexora ("the Platform"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">2. User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">You are solely responsible for:</strong>
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>All activities that occur under your account</li>
                <li>The accuracy and legality of any content you post</li>
                <li>Fulfilling any gigs or tasks you accept</li>
                <li>Ensuring that your interactions with other users are professional and lawful</li>
                <li>Complying with all applicable local, state, and national laws</li>
                <li>Any disputes that arise between you and other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">3. Platform Role & Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Nexora serves as a marketplace connecting students for gig-based work. We are <strong className="text-foreground">not</strong> a party 
                to any agreement between users. We do not guarantee the quality, safety, or legality of gigs posted.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-3">
                <strong className="text-foreground">Nexora shall not be held liable for:</strong>
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Any disputes between users</li>
                <li>The quality or outcome of work performed</li>
                <li>Financial losses resulting from transactions on the platform</li>
                <li>Any indirect, incidental, or consequential damages</li>
                <li>Content posted by users</li>
                <li>Third-party actions or services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">4. Escrow & Payments</h2>
              <p className="text-muted-foreground leading-relaxed">
                Payments are held in escrow until the gig is marked as completed. A <strong className="text-foreground">10% service fee</strong> is 
                deducted during withdrawal. By using our payment system, you agree to these terms.
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Funds are released only after the task poster confirms completion</li>
                <li>Disputes may delay fund release pending resolution</li>
                <li>Refunds are at the discretion of Nexora based on dispute investigation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">5. Prohibited Activities</h2>
              <p className="text-muted-foreground leading-relaxed">Users are prohibited from:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Posting fraudulent, misleading, or illegal gigs</li>
                <li>Circumventing platform fees by arranging payments outside the platform</li>
                <li>Harassing, threatening, or abusing other users</li>
                <li>Using the platform for academic dishonesty (e.g., exam cheating, plagiarism)</li>
                <li>Creating multiple accounts to manipulate the system</li>
                <li>Sharing login credentials with others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">6. Account Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent 
                activity, or negatively impact the platform community. Users may also delete their accounts at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">7. Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                Users are encouraged to resolve disputes directly. Nexora may, at its discretion, mediate disputes 
                but is not obligated to do so. Our decision in dispute cases is final.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">8. Indemnification</h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless Nexora, its owners, employees, and affiliates from any 
                claims, damages, losses, or expenses arising from your use of the platform or violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">9. Modifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these terms at any time. Continued use of the platform after changes constitutes 
                acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">10. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these terms, contact us at{' '}
                <a href="mailto:support@unigig.site" className="text-primary hover:underline">
                  support@unigig.site
                </a>
              </p>
            </section>

            <div className="bg-muted/50 rounded-lg p-4 mt-8">
              <p className="text-sm text-muted-foreground text-center">
                By using Nexora, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
