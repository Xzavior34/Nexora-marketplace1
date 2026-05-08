import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, MapPin, Calendar, Briefcase } from 'lucide-react';
import { z } from 'zod';

const CATEGORIES = [
  'Laundry',
  'Food Delivery',
  'Assignment Help',
  'Tutoring',
  'Errands',
  'Tech Support',
  'Photography',
  'Other',
];

const taskSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().min(20, 'Description must be at least 20 characters').max(1000),
  category: z.string().min(1, 'Please select a category'),
  price: z.number().min(100, 'Minimum price is ₦100').max(1000000, 'Maximum price is ₦1,000,000'),
  location: z.string().optional(),
  deadline: z.string().optional(),
});

export default function PostGig() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    location: '',
    deadline: '',
  });

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate('/auth');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validated = taskSchema.parse({
        title: form.title,
        description: form.description,
        category: form.category,
        price: parseFloat(form.price) || 0,
        location: form.location || undefined,
        deadline: form.deadline || undefined,
      });

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: validated.title,
          description: validated.description,
          category: validated.category,
          price_kobo: validated.price * 100,
          location: validated.location || null,
          deadline: validated.deadline || null,
          poster_id: user!.id,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Get user profile for name and email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', user!.id)
        .single();

      // Sync gig creator to Brevo List #9 (fire and forget)
      if (profile) {
        supabase.functions.invoke('send-brevo-verification', {
          body: { 
            email: profile.email, 
            fullName: profile.full_name,
            listId: 9,
          },
        }).then(({ error: brevoError }) => {
          if (brevoError) console.error("Brevo List #9 (Gig Creator) Sync Failed:", brevoError);
          else console.log("Brevo List #9 (Gig Creator) Sync Success");
        });
      }

      toast.success('Gig posted successfully!');
      navigate('/gigs');

    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            fieldErrors[e.path[0] as string] = e.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast.error('Failed to post gig. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-hero">
        <div className="container max-w-2xl py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Post a Gig</h1>
              <p className="text-sm text-primary-foreground/70">Find someone to help you</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Gig Details
            </CardTitle>
            <CardDescription>
              Fill in the details of the task you need help with
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Need help with laundry"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you need done in detail..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price">Budget (₦) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g., 2000"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  min={100}
                />
                <p className="text-xs text-muted-foreground">20% platform fee will be deducted from the worker's pay</p>
                {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location (Optional)
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Hall 2, FUNAAB"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label htmlFor="deadline" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Deadline (Optional)
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Post Gig
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
