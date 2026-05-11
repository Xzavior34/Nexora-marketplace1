import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Briefcase, ShoppingBag, Sparkles, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const steps = [
  {
    icon: Sparkles,
    title: 'Welcome to Nexora! 🎉',
    description: "The Intelligent Freelance Economy for every Nigerian. Let's give you a 30-second tour.",
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Briefcase,
    title: 'AI Smart Match',
    description: 'Our AI ranks gigs based on your skills, location and freshness. Stop scrolling, start earning.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: ShieldCheck,
    title: 'Squad Escrow Security',
    description: 'Every Naira locked in escrow until work is delivered. Zero scams. Guaranteed payouts.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: ShoppingBag,
    title: 'AjoSquad Auto-Savings',
    description: 'Every payout auto-skims into your Vault, building a credit identity that unlocks micro-loans.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
  },
];

interface Props {
  onComplete: () => void;
}

export function OnboardingTutorial({ onComplete }: Props) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true } as any)
        .eq('id', user.id);
      if (error) throw error;
      onComplete();
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
    else handleFinish();
  };

  const handleBack = () => { if (currentStep > 0) setCurrentStep(currentStep - 1); };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-strong rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-8 text-center space-y-6">
          <div className={`mx-auto h-20 w-20 rounded-2xl ${step.bg} flex items-center justify-center transition-all duration-300`}>
            <Icon className={`h-10 w-10 ${step.color}`} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />
          ))}
        </div>

        <div className="p-6 pt-2 flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={handleFinish} className="text-muted-foreground" disabled={loading}>Skip</Button>
          <div className="flex gap-2">
            {currentStep > 0 && <Button variant="outline" onClick={handleBack} disabled={loading}>Back</Button>}
            <Button onClick={handleNext} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
