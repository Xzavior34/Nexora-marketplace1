import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, GraduationCap, Shield, Wallet, Mail } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { NIGERIAN_UNIVERSITIES, isFUNAABStudent } from '@/lib/nigerianUniversities';

const emailSchema = z.string().email({ message: 'Please enter a valid email address' });

const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(2, 'Full name is required'),
  university: z.string().min(1, 'Please select your university'),
  referralCode: z.string().optional(),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  
  const [activeTab, setActiveTab] = useState('signin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSending, setResetSending] = useState(false);
  
  const [signUpForm, setSignUpForm] = useState({ email: '', password: '', fullName: '', university: '', referralCode: '' });
  const [signInForm, setSignInForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && user) navigate('/dashboard');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (searchParams.get('resend') === 'true') setActiveTab('signup');
  }, [searchParams]);

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('unigig_pending_ref', refCode);
      setSignUpForm(prev => ({ ...prev, referralCode: refCode }));
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`, 
        }
      });
      
      if (error) throw error;
    } catch (err) {
      console.error('Google Auth Error:', err);
      toast.error('Google sign-in failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) { toast.error('Enter your email'); return; }
    setResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    }
    setResetSending(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validated = signUpSchema.parse(signUpForm);
      
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { 
            full_name: validated.fullName,
            university: validated.university,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered. Try signing in.' });
        } else {
          toast.error(error.message);
        }
        return;
      }

      // ---------------------------------------------------------
      // NEW REFERRAL LOGIC: Using RPC to bypass RLS restrictions
      // ---------------------------------------------------------
      const refCode = validated.referralCode || searchParams.get('ref') || localStorage.getItem('unigig_pending_ref');
      if (refCode && data.user) {
        const { error: rpcError } = await (supabase.rpc as any)('apply_referral_code', { 
          new_user_id: data.user.id, 
          ref_code: refCode 
        });
        
        if (rpcError) {
          console.error("Referral failed to save:", rpcError);
        } else {
          console.log("Referral linked successfully!");
          localStorage.removeItem('unigig_pending_ref'); // Clean up after successful link
        }
      }
      // ---------------------------------------------------------

      if (data.user) {
        supabase.functions.invoke('send-brevo-verification', {
          body: { email: validated.email, fullName: validated.fullName, listId: 7, university: validated.university },
        }).catch(console.error);

        if (isFUNAABStudent(validated.university)) {
          supabase.functions.invoke('send-brevo-verification', {
            body: { email: validated.email, fullName: validated.fullName, listId: 10, university: validated.university },
          }).catch(console.error);
        }

        setEmailSentTo(validated.email);
        setShowEmailSent(true);
        toast.success("Account created! Please check your email.");
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => { if (e.path[0]) fieldErrors[e.path[0] as string] = e.message; });
        setErrors(fieldErrors);
      } else {
        toast.error("Signup failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    try {
      const validated = signInSchema.parse(signInForm);
      const { error } = await supabase.auth.signInWithPassword({ email: validated.email, password: validated.password });

      if (error) {
        if (error.message.includes('Invalid login')) setErrors({ password: 'Invalid email or password' });
        else if (error.message.includes('Email not confirmed')) toast.error("Please verify your email address.");
        else toast.error(error.message);
        return;
      }

      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => { if (e.path[0]) fieldErrors[e.path[0] as string] = e.message; });
        setErrors(fieldErrors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
              <p className="text-muted-foreground text-sm">Enter your email to receive a reset link</p>
            </div>
            <div className="space-y-4">
              <Input type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="h-12" />
              <Button onClick={handleForgotPassword} className="w-full h-12" disabled={resetSending}>
                {resetSending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Send Reset Link
              </Button>
              <Button variant="ghost" onClick={() => setShowForgotPassword(false)} className="w-full">Back to Sign In</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showEmailSent) {
    return (
      <>
        <SEOHead title="Verify Your Email - Nexora" description="Check your email to verify your Nexora account." />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Check your inbox</h2>
                <p className="text-muted-foreground">We sent a verification link to <strong>{emailSentTo}</strong></p>
                <p className="text-sm text-muted-foreground mt-2">Click the link in the email to activate your account.</p>
              </div>
              <Button variant="ghost" onClick={() => setShowEmailSent(false)} className="w-full">Back to Sign In</Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead 
        title="Sign In - Nexora | University Nigerian Marketplace"
        description="Sign in or create your Nexora account to start earning money as a university student freelancer."
      />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-hero flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold text-foreground">Nexora</span>
            </div>
            <p className="text-muted-foreground">For Nigerians, By Students</p>
          </div>

          <Card className="shadow-lg">
            <CardContent className="pt-6">
              {/* Google Sign-In */}
              <Button
                variant="outline"
                className="w-full h-12 mb-4 text-base gap-3"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4 mt-0">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input id="signin-email" type="email" placeholder="you@example.com" value={signInForm.email} onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })} className="h-12 text-base" />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label htmlFor="signin-password">Password</Label>
                        <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs text-primary hover:underline">Forgot password?</button>
                      </div>
                      <Input id="signin-password" type="password" placeholder="••••••••" value={signInForm.password} onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })} className="h-12 text-base" />
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>
                    <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4 mt-0">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input type="text" placeholder="John Doe" value={signUpForm.fullName} onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })} className="h-12 text-base" />
                      {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="you@example.com" value={signUpForm.email} onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })} className="h-12 text-base" />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>University</Label>
                      <Select value={signUpForm.university} onValueChange={(v) => setSignUpForm({ ...signUpForm, university: v })}>
                        <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Select your university" /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {NIGERIAN_UNIVERSITIES.map((uni) => (<SelectItem key={uni} value={uni}>{uni}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      {errors.university && <p className="text-sm text-destructive">{errors.university}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" placeholder="••••••••" value={signUpForm.password} onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })} className="h-12 text-base" />
                      {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Referral Code (Optional)</Label>
                      <Input type="text" placeholder="e.g. JOHN2026" value={signUpForm.referralCode} onChange={(e) => setSignUpForm({ ...signUpForm, referralCode: e.target.value })} className="h-12 text-base" />
                      {errors.referralCode && <p className="text-sm text-destructive">{errors.referralCode}</p>}
                    </div>

                    <Button type="submit" className="w-full h-12 text-base" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className="mx-auto h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Students Worldwide</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Secure Escrow</p>
            </div>
            <div className="space-y-2">
              <div className="mx-auto h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Instant Payouts</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
