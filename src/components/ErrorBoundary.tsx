import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="glass-card max-w-md w-full p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              {this.props.fallbackTitle || 'Something glitched'}
            </h2>
            <p className="text-sm text-muted-foreground">
              We caught an error so the app stays online. Try reloading — your data is safe.
            </p>
            {this.state.error?.message && (
              <p className="text-[11px] text-muted-foreground/70 font-mono mt-2 break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={this.reset}>
              Try again
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
