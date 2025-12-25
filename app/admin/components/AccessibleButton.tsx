'use client';

import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  ariaLabel?: string;
}

const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    icon, 
    ariaLabel,
    disabled,
    className,
    style,
    ...props 
  }, ref) => {
    const baseStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '500',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none',
      position: 'relative' as const,
      minHeight: size === 'sm' ? '32px' : size === 'lg' ? '48px' : '40px',
      padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '8px 16px',
      fontSize: size === 'sm' ? '14px' : size === 'lg' ? '16px' : '14px',
      opacity: disabled || loading ? 0.6 : 1,
    };

    const variantStyles = {
      primary: {
        background: 'linear-gradient(135deg, #7877c6 0%, #9333ea 100%)',
        color: '#ffffff',
        boxShadow: '0 2px 4px rgba(120, 119, 198, 0.2)',
      },
      secondary: {
        background: 'rgba(255, 255, 255, 0.05)',
        color: '#f8fafc',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      },
      danger: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#ffffff',
        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
      },
      ghost: {
        background: 'transparent',
        color: '#94a3b8',
        border: 'none',
      },
    };

    const focusStyles = {
      ':focus-visible': {
        outline: '2px solid #7877c6',
        outlineOffset: '2px',
      },
    };

    const hoverStyles = !disabled && !loading ? {
      ':hover': {
        transform: 'translateY(-1px)',
        boxShadow: variant === 'primary' ? '0 4px 8px rgba(120, 119, 198, 0.3)' :
                   variant === 'danger' ? '0 4px 8px rgba(239, 68, 68, 0.3)' :
                   '0 2px 4px rgba(255, 255, 255, 0.1)',
      },
    } : {};

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-busy={loading}
        style={{
          ...baseStyles,
          ...variantStyles[variant],
          ...style,
        }}
        className={`accessible-button ${className || ''}`}
        {...props}
      >
        {loading && (
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
            aria-hidden="true"
          />
        )}
        {icon && !loading && (
          <span aria-hidden="true">{icon}</span>
        )}
        {children}
        
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .accessible-button:focus-visible {
            outline: 2px solid #7877c6;
            outline-offset: 2px;
          }
          
          .accessible-button:not(:disabled):not([aria-busy="true"]):hover {
            transform: translateY(-1px);
          }
        `}</style>
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

export default AccessibleButton;