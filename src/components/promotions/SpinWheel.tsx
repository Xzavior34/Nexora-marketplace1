import { useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Prize {
  amount: number;
  label: string;
  probability: number;
  color: string;
}

const PRIZES: Prize[] = [
  { amount: 10000, label: '₦10k', probability: 0, color: '#fef3c7' }, 
  { amount: 0, label: '0', probability: 0.6, color: '#f1f5f9' }, 
  { amount: 100, label: '₦100', probability: 0.2, color: '#dcfce7' }, 
  { amount: 5000, label: '₦5k', probability: 0, color: '#fee2e2' }, 
  { amount: 200, label: '₦200', probability: 0.1, color: '#dbeafe' }, 
  { amount: 1000, label: '₦1k', probability: 0, color: '#fae8ff' }, 
  { amount: 300, label: '₦300', probability: 0.1, color: '#fef9c3' }, 
  { amount: 500, label: '₦500', probability: 0, color: '#ffedd5' }, 
];

interface SpinWheelProps {
  onWin: (amount: number) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  userId: string; // <-- Added this to pass to the RPC
}

export function SpinWheel({ onWin, isSpinning, setIsSpinning, userId }: SpinWheelProps) {
  const controls = useAnimation();
  const [rotation, setRotation] = useState(0);

  const spin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    try {
      // 1. Fetch secure random result AND deduct ticket in one move
      const { data, error } = await supabase.rpc('secure_spin_wheel', {
        p_user_id: userId
      });
      
      if (error) {
        if (error.message.includes('Insufficient spin tickets')) {
            toast.error("You don't have any valid Spin Tickets!");
        } else {
            throw error;
        }
        setIsSpinning(false);
        return;
      }

      // 2. Animate the wheel
      const result = data as { prizeIndex: number; amount: number; credited?: boolean };
      const winnerIndex = result.prizeIndex;
      const segmentAngle = 360 / PRIZES.length;
      const extraRotations = 8 + Math.floor(Math.random() * 5);
      const landingAngle = (winnerIndex * segmentAngle) + (segmentAngle / 2);
      const finalRotation = rotation + (extraRotations * 360) + (360 - landingAngle);
      
      setRotation(finalRotation);

      await controls.start({
        rotate: finalRotation,
        transition: { duration: 7, ease: [0.2, 0.8, 0, 1] },
      });

      setIsSpinning(false);
      
      // 3. Trigger the win logic in the parent component
      // (Wallet credit + transaction + notification already happened atomically server-side)
      onWin(result.amount);

    } catch (err) {
      console.error("Spin error:", err);
      toast.error("Failed to connect to the server. Try again.");
      setIsSpinning(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 -mt-2">
        <div className="w-8 h-10 bg-primary shadow-lg" 
             style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }} />
      </div>

      <div className="relative w-72 h-72 sm:w-96 sm:h-96 rounded-full border-8 border-primary shadow-2xl overflow-hidden bg-white">
        <motion.div animate={controls} className="w-full h-full relative" style={{ rotate: rotation }}>
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {PRIZES.map((prize, i) => {
              const angle = 360 / PRIZES.length;
              const startAngle = i * angle;
              const endAngle = (i + 1) * angle;
              const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
              const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
              const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
              const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
              
              return (
                <g key={i}>
                  <path d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`} fill={prize.color} stroke="#fff" strokeWidth="0.5" />
                  <text x="75" y="50" fill="#1e293b" fontSize="4" fontWeight="bold" textAnchor="middle" transform={`rotate(${startAngle + angle / 2}, 50, 50)`}>
                    {prize.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary rounded-full border-4 border-white flex items-center justify-center">
            <Sparkles className="text-white w-6 h-6" />
          </div>
        </motion.div>
      </div>

      <div className="mt-12">
        <Button size="lg" onClick={spin} disabled={isSpinning} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-12 py-8 rounded-2xl shadow-lg">
          <RotateCcw className={`w-6 h-6 mr-2 ${isSpinning ? 'animate-spin' : ''}`} />
          {isSpinning ? 'Spinning...' : 'SPIN TO WIN!'}
        </Button>
      </div>
    </div>
  );
}
