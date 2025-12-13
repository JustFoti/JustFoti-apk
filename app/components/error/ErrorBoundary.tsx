'use client';

/**
 * Global Error Boundary Component
 * Catches React errors and provides recovery UI
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'global' | 'route' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });

    // In production, you would send this to an error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI based on error level
      const level = this.props.level || 'component';
      
      if (level === 'global') {
        return <GlobalErrorFallback error={this.state.error} reset={this.handleReset} />;
      }

      if (level === 'route') {
        return <RouteErrorFallback error={this.state.error} reset={this.handleReset} />;
      }

      return <ComponentErrorFallback error={this.state.error} reset={this.handleReset} />;
    }

    return this.props.children;
  }
}

/**
 * Global Error Fallback - Full page error
 */
function GlobalErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.globalError}>
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className={styles.errorTitle}>Something went wrong</h1>
        <p className={styles.errorMessage}>
          We encountered an unexpected error. Don't worry, your data is safe.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className={styles.errorDetails}>
            <summary>Error details (development only)</summary>
            <pre>{error.message}</pre>
            <pre>{error.stack}</pre>
          </details>
        )}
        <div className={styles.errorActions}>
          <button onClick={reset} className={styles.primaryButton}>
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className={styles.secondaryButton}
          >
            Go to Homepage
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Route Error Fallback - Page-level error
 */
function RouteErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.routeError}>
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeWidth="2" />
            <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className={styles.errorTitle}>Page Error</h2>
        <p className={styles.errorMessage}>
          This page encountered an error. You can try reloading or go back.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className={styles.errorDetails}>
            <summary>Error details</summary>
            <pre>{error.message}</pre>
          </details>
        )}
        <div className={styles.errorActions}>
          <button onClick={reset} className={styles.primaryButton}>
            Reload Page
          </button>
          <button
            onClick={() => window.history.back()}
            className={styles.secondaryButton}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Component Error Fallback - Isolated component error
 */
function ComponentErrorFallback({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.componentError}>
      <div className={styles.errorIcon}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <line x1="15" y1="9" x2="9" y2="15" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="9" x2="15" y2="15" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <p className={styles.componentErrorText}>Failed to load this section</p>
      <button onClick={reset} className={styles.retryButton}>
        Retry
      </button>
    </div>
  );
}

/**
 * Hook for programmatic error handling
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}
