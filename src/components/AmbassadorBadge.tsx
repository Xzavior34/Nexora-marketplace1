import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AmbassadorBadge({ className }: { className?: string }) {
  return (
    <Badge className={`bg-amber-500/20 text-amber-600 border-amber-500/30 gap-1 ${className || ''}`}>
      <Shield className="h-3 w-3 fill-amber-500" />
      Ambassador
    </Badge>
  );
}
