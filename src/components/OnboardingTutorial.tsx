import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Briefcase, ShoppingBag, Gift, Sparkles, School, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NIGERIAN_UNIVERSITIES } from '@/lib/nigerianUniversities';
import { toast } from 'sonner';

const steps = [
  {
    icon: Sparkles,
    title: 'Welcome to UniGig! 🎉',
    description: 'Your campus marketplace for gigs, products, and earnings. Let\'s show you around!',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    icon: Briefcase,
    title: 'Post & Do Gigs',
    description: 'Post tasks or apply for gigs. All payments are held securely in Escrow — no scams, guaranteed pay.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: ShoppingBag,
    title: 'The Marketplace',
    description: 'Buy and sell items directly using your UniGig wallet. No external payments needed!',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  {
    icon: School,
    title: 'Select Your Campus',
    description: 'Choose your university to see gigs and products near you.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  }
];

interface Props {
  onComplete: () => void;
}

export function OnboardingTutorial({ onComplete }: Props) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedUni, setSelectedUni] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    if (!user) return;
    
    // Validate university selection on the last step
    if (currentStep === steps.length - 1 && !selectedUni) {
      toast.error("Please select your university to continue");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          has_completed_onboarding: true,
          university: selectedUni || null // Save the uni they picked
        } as any)
        .eq('id', user.id);

      if (error) throw error;
      onComplete();
    } catch (err) {
      toast.error("Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-8 text-center space-y-6">
          <div className={`mx-auto h-20 w-20 rounded-2xl ${step.bg} flex items-center justify-center transition-all duration-300`}>
            <Icon className={`h-10 w-10 ${step.color}`} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
            <p className="text-muted-foreground leading-relaxed">{step.description}</p>
          </div>

          {/* University Selector showing ONLY on the last step */}
          {currentStep === steps.length - 1 && (
            <div className="pt-4 text-left">
              <Select onValueChange={setSelectedUni} value={selectedUni}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Search your University..." />
                </SelectTrigger>
                {/* FIX: Added z-[200] so it pops UP over the modal, and max-h so it scrolls properly */}
                <SelectContent className="z-[200] max-h-[250px]">
                  {NIGERIAN_UNIVERSITIES.map((uni) => (
                    <SelectItem key={uni} value={uni}>{uni}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2 pb-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentStep ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`} />
          ))}
        </div>

        <div className="p-6 pt-2 flex items-center justify-between gap-3">
          {/* We hide SKIP on the last step because we NEED the university data */}
          {currentStep < steps.length - 1 ? (
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep(steps.length - 1)} className="text-muted-foreground">Skip</Button>
          ) : <div />}
          
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
