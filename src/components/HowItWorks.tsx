import { Store, CreditCard, CheckCircle, ArrowRight, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Store,
    title: "Post Gigs or Sell Items",
    description: "Need help with an errand or want to sell a textbook? Post it. Looking to earn or buy? Browse available tasks and marketplace products.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: CreditCard,
    title: "Secure Escrow Payment",
    description: "Whether hiring a student or buying a gadget, your money is held safely in our Vault until delivery. No scams, no stories.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: CheckCircle,
    title: "Confirm & Get Paid",
    description: "Task completed or item received? The buyer confirms delivery, and the funds are instantly released to the seller's wallet.",
    color: "from-amber-500 to-orange-600",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-gradient-mesh bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
            <Sparkles className="h-4 w-4" />
            Simple 3-Step Process
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 text-balance">
            Three Steps to Campus Commerce
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
            No stress, no long thing. Just post, pay securely, and prosper.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-16 left-full w-full items-center justify-center z-0 px-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-border via-primary/30 to-border" />
                  <ArrowRight className="h-4 w-4 text-primary/50 mx-2 flex-shrink-0" />
                  <div className="flex-1 h-px bg-gradient-to-r from-border via-primary/30 to-border" />
                </div>
              )}

              <div className="relative z-10 bg-card rounded-3xl p-8 border border-border/60 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2 h-full group-hover:border-primary/30">
                {/* Step Number */}
                <div className="absolute -top-4 -left-4 h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-forest-dark text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {index + 1}
                </div>

                {/* Icon */}
                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                  <step.icon className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-4">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
