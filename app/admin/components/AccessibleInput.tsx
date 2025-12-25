'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';

interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showRequiredIndicator?: boolean;
}

const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required, 
    showRequiredIndicator = true,
    id,
    className,
    style,
    ...props 
  }, ref) => {
    const [focused, setFocused] = useState(false);
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const inputStyles = {
      width: '100%',
      padding: '12px 16px',
      background: 'rgba(255, 255, 255, 0.05)',
      border: `2px solid ${error ? '#ef4444' : focused ? '#7877c6' : 'rgba(255, 255, 255, 0.1)'}`,
      borderRadius: '8px',
      color: '#f8fafc',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease',
      minHeight: '44px', // Minimum touch target size
    };

    const labelStyles = {
      display: 'block',
      marginBottom: '6px',
      color: error ? '#ef4444' : '#f8fafc',
      fontSize: '14px',
      fontWeight: '500',
    };

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          ...style,
        }}
        className={className}
      >
        <label
          htmlFor={inputId}
          style={labelStyles}
        >
          {label}
          {required && showRequiredIndicator && (
            <span
              style={{ color: '#ef4444', marginLeft: '4px' }}
              aria-label="required"
            >
              *
            </span>
          )}
        </label>
        
        <input
          ref={ref}
          id={inputId}
          required={required}
          style={inputStyles}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[errorId, helperId].filter(Boolean).join(' ') || undefined}
          {...props}
        />
        
        {error && (
          <div
            id={errorId}
            role="alert"
            style={{
              color: '#ef4444',
              fontSize: '12px',
              marginTop: '4px',
            }}
          >
            {error}
          </div>
        )}
        
        {helperText && !error && (
          <div
            id={helperId}
            style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginTop: '4px',
            }}
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';

export default AccessibleInput;