'use client';

/**
 * Error Display Component
 * Reusable component for displaying API errors with retry functionality
 */


import { APIError } from '@/types/api';
import { getErrorMessage, shouldShowRetry } from '@/lib/utils/api-client';
import styles from './ErrorDisplay.module.css';

interface ErrorDisplayProps {
  error: APIError | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'inline' | 'banner' | 'modal';
  showDetails?: boolean;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
  showDetails = false,
}: ErrorDisplayProps) {
  if (!error) {
    return null;
  }

  const apiError = isAPIError(error) ? error : convertToAPIError(error);
  const message = getErrorMessage(apiError);
  const canRetry = shouldShowRetry(apiError);

  if (variant === 'banner') {
    return (
      <div className={styles.banner}>
        <div className={styles.bannerContent}>
          <div className={styles.bannerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className={styles.bannerText}>
            <p className={styles.bannerMessage}>{message}</p>
            {showDetails && process.env.NODE_ENV === 'development' && (
              <p className={styles.bannerDetails}>
                {apiError.code} - {apiError.statusCode}
              </p>
            )}
          </div>
          <div className={styles.bannerActions}>
            {canRetry && onRetry && (
              <button onClick={onRetry} className={styles.retryButton}>
                Retry
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className={styles.dismissButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className={styles.modalTitle}>Error</h3>
          <p className={styles.modalMessage}>{message}</p>
          {showDetails && process.env.NODE_ENV === 'development' && (
            <div className={styles.modalDetails}>
              <p>Code: {apiError.code}</p>
              <p>Status: {apiError.statusCode}</p>
            </div>
          )}
          <div className={styles.modalActions}>
            {canRetry && onRetry && (
              <button onClick={onRetry} className={styles.primaryButton}>
                Try Again
              </button>
            )}
            {onDismiss && (
              <button onClick={onDismiss} className={styles.secondaryButton}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className={styles.inline}>
      <div className={styles.inlineIcon}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeWidth="2" />
          <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div className={styles.inlineContent}>
        <p className={styles.inlineMessage}>{message}</p>
        {showDetails && process.env.NODE_ENV === 'development' && (
          <p className={styles.inlineDetails}>
            {apiError.code} ({apiError.statusCode})
          </p>
        )}
      </div>
      {canRetry && onRetry && (
        <button onClick={onRetry} className={styles.inlineRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Type guard for APIError
 */
function isAPIError(error: any): error is APIError {
  return (
    error &&
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    typeof error.statusCode === 'number' &&
    typeof error.retryable === 'boolean'
  );
}

/**
 * Convert generic Error to APIError
 */
function convertToAPIError(error: Error): APIError {
  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    statusCode: 500,
    retryable: false,
  };
}
