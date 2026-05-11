import { Brain, ShieldCheck, PiggyBank, ArrowRight, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Brain,
    title: "1. Smart Match AI",
    description:
      "Our AI matches your skills, location, and economic context to the right gigs in seconds — no more endless scrolling.",
    color: "from-indigo-500 to-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "2. Squad Escrow Security",
    description:
      "Every Naira is locked in Squad Escrow until work is delivered. No scams. No off-platform payments. Just trust.",
    color: "from-cyan-500 to-sky-600",
  },
  {
    icon: PiggyBank,
    title: "3. AjoSquad Auto-Savings",
    description:
      "Every payout auto-skims into your AjoSquad Vault — building a credit identity and unlocking micro-loans.",
    color: "from-violet-500 to-fuchsia-600",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-gradient-mesh bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
            <Sparkles className="h-4 w-4" />
            The Intelligent Economy Stack
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-5 text-balance">
            Three pillars. One intelligent economy.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg leading-relaxed">
            AI matching. Bank-grade escrow. Automatic savings. Built for every Nigerian hustler.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-16 left-full w-full items-center justify-center z-0 px-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-border via-primary/30 to-border" />
                  <ArrowRight className="h-4 w-4 text-primary/50 mx-2 flex-shrink-0" />
                  <div className="flex-1 h-px bg-gradient-to-r from-border via-primary/30 to-border" />
                </div>
              )}

              <div className="glass-strong relative z-10 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 h-full group-hover:border-primary/40">
                <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-glow group-hover:scale-105 transition-transform duration-300`}>
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
