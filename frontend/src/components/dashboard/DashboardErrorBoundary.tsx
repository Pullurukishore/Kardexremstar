'use client';

import React from 'react';

interface FallbackProps {
  error: Error;
  reset: () => void;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ComponentType<FallbackProps>;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class DashboardErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DashboardErrorBoundary caught an error:', error, errorInfo);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    const { error } = this.state;
    const { children, fallback: FallbackComponent } = this.props;

    if (error) {
      return <FallbackComponent error={error} reset={this.reset} />;
    }

    return children;
  }
}
