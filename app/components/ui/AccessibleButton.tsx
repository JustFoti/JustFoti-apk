/**
 * Accessible Button Component
 * Fully accessible button with proper ARIA attributes and keyboard support
 */

'use client';

import React, { forwardRef } from 'react';
import { useAccessibility } from '@/lib/hooks/useAccessibility';

export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaDescribedBy?: string;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      ariaLabel,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      ariaDescribedBy,
      disabled,
      className = '',
      onClick,
      ...props
    },
    ref
  ) => {
    const { announce } = useAccessibility();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || disabled) return;
      
      onClick?.(e);
      
      // Announce action to screen readers if needed
      if (ariaLabel && ariaPressed !== undefined) {
        announce(`${ariaLabel} ${ariaPressed ? 'pressed' : 'not pressed'}`);
      }
    };

    const variantClasses = {
      primary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
      ghost: 'bg-transparent hover:bg-white/10 text-white',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const baseClasses = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-400
      disabled:opacity-50 disabled:cursor-not-allowed
      ${variantClasses[variant]}
      ${sizeClasses[size]}
      ${className}
    `;

    return (
      <button
        ref={ref}
        className={baseClasses}
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span className="animate-spin" aria-hidden="true">
            ⟳
          </span>
        )}
        {!loading && icon && iconPosition === 'left' && (
          <span aria-hidden="true">{icon}</span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === 'right' && (
          <span aria-hidden="true">{icon}</span>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
