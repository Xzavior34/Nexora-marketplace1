import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyToken(token);
    } else {
      setStatus('error');
      setMessage('No verification token found. Please check your email link.');
    }
  }, [searchParams]);

  const verifyToken = async (token: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-token', {
        body: { token },
      });

      if (error) throw error;

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to verify email. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'loading' && (
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-xl">
            {status === 'loading' && 'Verifying your email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <Button 
              onClick={() => navigate('/dashboard')} 
              className="w-full"
            >
              Go to Dashboard
            </Button>
          )}
          {status === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Back to Sign In
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/auth?resend=true')} 
                className="w-full"
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Verification Email
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
