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
import { ArrowLeft, Loader2, MapPin, Calendar, Briefcase, Mic, Sparkles, Wand2 } from 'lucide-react';
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
  const [aiPrice, setAiPrice] = useState<{ price: number; reason: string } | null>(null);
  const [aiLoading, setAiLoading] = useState<'price' | 'optimize' | 'voice' | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    location: '',
    deadline: '',
  });

  const fetchSmartPrice = async () => {
    if (!form.title || !form.category) { toast.error('Add a title and category first'); return; }
    setAiLoading('price');
    try {
      const { data, error } = await supabase.functions.invoke('gig-ai', {
        body: { action: 'price', payload: { title: form.title, category: form.category, location: form.location } },
      });
      if (error) throw error;
      setAiPrice({ price: data.price_naira, reason: data.reason });
      if (!form.price) setForm(f => ({ ...f, price: String(data.price_naira) }));
    } catch { toast.error('AI pricing unavailable'); } finally { setAiLoading(null); }
  };

  const optimizeDescription = async () => {
    if (!form.description) { toast.error('Write a rough description first'); return; }
    setAiLoading('optimize');
    try {
      const { data, error } = await supabase.functions.invoke('gig-ai', {
        body: { action: 'optimize', payload: { title: form.title, description: form.description } },
      });
      if (error) throw error;
      setForm(f => ({ ...f, description: data.description }));
      toast.success('Description professionalized ✨');
    } catch { toast.error('AI optimizer unavailable'); } finally { setAiLoading(null); }
  };

  const parseVoice = async () => {
    if (!voiceTranscript.trim()) { toast.error('Speak or type your gig first'); return; }
    setAiLoading('voice');
    try {
      const { data, error } = await supabase.functions.invoke('gig-ai', {
        body: { action: 'parse', payload: { transcript: voiceTranscript } },
      });
      if (error) throw error;
      setForm(f => ({ ...f, title: data.title || f.title, description: data.description || f.description, category: data.category || f.category }));
      setVoiceOpen(false);
      setVoiceTranscript('');
      toast.success('Voice gig captured 🎙️');
    } catch { toast.error('AI voice parser unavailable'); } finally { setAiLoading(null); }
  };

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
            {/* Voice-to-Gig */}
            <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow animate-pulse-glow shrink-0">
                  <Mic className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">AI Voice Post</p>
                  <p className="text-xs text-muted-foreground">Speak your gig — AI fills the form</p>
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setVoiceOpen(v => !v)}>
                {voiceOpen ? 'Close' : 'Try it'}
              </Button>
            </div>
            {voiceOpen && (
              <div className="mb-6 space-y-2">
                <Textarea
                  placeholder="🎙️ Speak or type naturally — e.g. 'I need someone to deliver food from Sabo to UI tomorrow morning, budget around 2k'"
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  rows={3}
                />
                <Button type="button" size="sm" onClick={parseVoice} disabled={aiLoading === 'voice'} className="w-full">
                  {aiLoading === 'voice' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Convert to Gig with AI
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" placeholder="e.g., Hire a developer to fix my site" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description *</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={optimizeDescription} disabled={aiLoading === 'optimize'} className="h-7 text-xs gap-1 text-primary">
                    {aiLoading === 'optimize' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    Professionalize
                  </Button>
                </div>
                <Textarea id="description" placeholder="Describe what you need done..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label htmlFor="price">Budget (₦) *</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={fetchSmartPrice} disabled={aiLoading === 'price'} className="h-7 text-xs gap-1 text-accent">
                    {aiLoading === 'price' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Nexora AI Suggestion
                  </Button>
                </div>
                <Input id="price" type="number" placeholder="e.g., 5000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} min={100} />
                {aiPrice && (
                  <div className="text-xs px-3 py-2 rounded-lg border border-accent/30 bg-accent/5 text-accent flex items-start gap-2">
                    <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                    <span><b>AI suggests ₦{aiPrice.price.toLocaleString()}</b> — {aiPrice.reason}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Funds are secured in Squad Escrow until you confirm the work is complete.</p>
                {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2"><MapPin className="h-4 w-4" />Location (Optional)</Label>
                <Input id="location" placeholder="e.g., Lagos, Ikeja" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline" className="flex items-center gap-2"><Calendar className="h-4 w-4" />Deadline (Optional)</Label>
                <Input id="deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
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
