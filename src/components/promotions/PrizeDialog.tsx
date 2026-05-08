import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Frown, PartyPopper, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PrizeDialogProps {
  open: boolean;
  onClose: () => void;
  amount: number;
}

export function PrizeDialog({ open, onClose, amount }: PrizeDialogProps) {
  const isWin = amount > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center p-0 overflow-hidden border-none shadow-2xl">
        <div className={`p-8 ${isWin ? 'bg-gradient-to-br from-primary to-green-700 text-white' : 'bg-slate-50 text-slate-900'}`}>
          <AnimatePresence mode="wait">
            {isWin ? (
              <motion.div
                key="win"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-6"
              >
                <div className="mx-auto w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                  <PartyPopper className="w-12 h-12 text-yellow-400" />
                </div>
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-3xl font-black tracking-tight text-white">CONGRATULATIONS!</DialogTitle>
                  <DialogDescription className="text-white/90 text-lg">
                    You just won <span className="font-bold text-white">₦{amount.toLocaleString()}</span>!
                  </DialogDescription>
                </DialogHeader>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center justify-center gap-3">
                  <Wallet className="w-6 h-6 text-yellow-400" />
                  <p className="font-medium text-white">Funds added to your wallet</p>
                </div>
                <Button 
                  onClick={onClose} 
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold h-14 rounded-xl shadow-lg"
                >
                  AWESOME!
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="loss"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-6"
              >
                <div className="mx-auto w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center text-slate-400">
                  <Frown className="w-12 h-12" />
                </div>
                <DialogHeader className="space-y-2">
                  <DialogTitle className="text-3xl font-black tracking-tight text-slate-900">SO CLOSE!</DialogTitle>
                  <DialogDescription className="text-slate-500 text-lg">
                    Better luck next time. Post more gigs to get more chances!
                  </DialogDescription>
                </DialogHeader>
                <Button 
                  onClick={onClose} 
                  variant="outline"
                  className="w-full border-2 h-14 rounded-xl font-bold"
                >
                  TRY AGAIN LATER
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
