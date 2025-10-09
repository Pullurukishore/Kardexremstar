'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('Uncaught error:', error, errorInfo);
    
    // Check if this is a hydration error
    if (error.message.includes('Hydration') || error.message.includes('hydration')) {
      console.warn('Hydration error detected, attempting recovery...');
      // For hydration errors, try to recover by reloading
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }
    
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Something went wrong</h2>
              <p className="text-center text-slate-600">
                {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
              </p>
              <div className="mt-4 flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reload Page</span>
                </Button>
                <Button
                  variant="default"
                  onClick={this.handleReset}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </Button>
              </div>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6 overflow-hidden rounded-lg border border-red-200">
                <summary className="cursor-pointer bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
                  Error Details
                </summary>
                <pre className="max-h-60 overflow-auto bg-white p-4 text-xs text-red-600">
                  {this.state.error?.stack}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
