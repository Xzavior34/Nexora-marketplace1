import { Shield, Users, BadgeCheck, Lock, Banknote, Clock } from "lucide-react";

const trustPoints = [
  {
    icon: BadgeCheck,
    title: "Verified Students",
    description: "Join a trusted community of university students from around the world.",
  },
  {
    icon: Lock,
    title: "Escrow Protection",
    description: "Your money is held securely until you confirm the task is done. Zero risk.",
  },
  {
    icon: Banknote,
    title: "Naira Payments via Paystack",
    description: "Pay and get paid in Naira. Direct bank transfers, no hassle.",
  },
  {
    icon: Clock,
    title: "Instant Withdrawals",
    description: "Earned your money? Withdraw to your bank account instantly.",
  },
  {
    icon: Users,
    title: "Peer Reviews",
    description: "Rate and review after every gig. Build your campus reputation.",
  },
  {
    icon: Shield,
    title: "Dispute Resolution",
    description: "Issues? Our support team is here to mediate and resolve fairly.",
  },
];

const TrustSection = () => {
  return (
    <section id="trust" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-primary mb-3 uppercase tracking-wide">
            Why Trust Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Students, Secured Like Banks
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            We handle your money with the same care as Opay and Paystack. No cap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {trustPoints.map((point, index) => (
            <div
              key={index}
              className="flex gap-4 p-6 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors duration-300"
            >
              <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <point.icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">{point.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{point.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;