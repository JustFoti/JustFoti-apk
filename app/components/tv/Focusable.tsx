'use client';

import React, { forwardRef, useCallback, useRef, useEffect } from 'react';
import { useTVNavigation } from './TVNavigationProvider';

export interface FocusableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Content to render */
  children: React.ReactNode;
  /** Called when element is selected (Enter/click) */
  onSelect?: () => void;
  /** Focus group for navigation */
  group?: string;
  /** Priority for focus selection (higher = preferred) */
  priority?: number;
  /** Whether this should be the primary focus target */
  primary?: boolean;
  /** Skip this element in navigation */
  skip?: boolean;
  /** Custom element type */
  as?: keyof JSX.IntrinsicElements;
  /** Additional class when focused */
  focusedClassName?: string;
}

/**
 * Focusable - Wrapper component for TV/keyboard navigation
 * Wraps any content and makes it navigable with arrow keys
 */
export const Focusable = forwardRef<HTMLDivElement, FocusableProps>(
  (
    {
      children,
      onSelect,
      group,
      priority = 0,
      primary = false,
      skip = false,
      as: Component = 'div',
      focusedClassName = '',
      className = '',
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const elementRef = (ref as React.RefObject<HTMLDivElement>) || internalRef;
    const tvNav = useTVNavigation();

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
        onSelect?.();
      },
      [onClick, onSelect]
    );

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e);
        
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      },
      [onKeyDown, onSelect]
    );

    // Register as primary focus target
    useEffect(() => {
      if (primary && tvNav?.isEnabled && elementRef.current) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          tvNav.focusElement(elementRef.current);
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [primary, tvNav?.isEnabled]);

    const Element = Component as any;

    return (
      <Element
        ref={elementRef}
        className={className}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={skip ? -1 : 0}
        role="button"
        data-tv-focusable={!skip ? 'true' : undefined}
        data-tv-group={group}
        data-tv-priority={priority}
        data-tv-primary={primary ? 'true' : undefined}
        data-tv-skip={skip ? 'true' : undefined}
        {...props}
      >
        {children}
      </Element>
    );
  }
);

Focusable.displayName = 'Focusable';

/**
 * FocusableButton - Button variant of Focusable
 */
export interface FocusableButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  onSelect?: () => void;
  group?: string;
  priority?: number;
  primary?: boolean;
}

export const FocusableButton = forwardRef<HTMLButtonElement, FocusableButtonProps>(
  ({ children, onSelect, group, priority = 0, primary = false, onClick, ...props }, ref) => {
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        onSelect?.();
      },
      [onClick, onSelect]
    );

    return (
      <button
        ref={ref}
        onClick={handleClick}
        data-tv-focusable="true"
        data-tv-group={group}
        data-tv-priority={priority}
        data-tv-primary={primary ? 'true' : undefined}
        {...props}
      >
        {children}
      </button>
    );
  }
);

FocusableButton.displayName = 'FocusableButton';

/**
 * FocusableLink - Link variant of Focusable
 */
export interface FocusableLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  group?: string;
  priority?: number;
  primary?: boolean;
}

export const FocusableLink = forwardRef<HTMLAnchorElement, FocusableLinkProps>(
  ({ children, group, priority = 0, primary = false, ...props }, ref) => {
    return (
      <a
        ref={ref}
        data-tv-focusable="true"
        data-tv-group={group}
        data-tv-priority={priority}
        data-tv-primary={primary ? 'true' : undefined}
        {...props}
      >
        {children}
      </a>
    );
  }
);

FocusableLink.displayName = 'FocusableLink';

/**
 * FocusGroup - Container that groups focusable elements
 * Navigation within a group is prioritized
 */
export interface FocusGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Unique group identifier */
  groupId: string;
  /** Direction of navigation within group */
  direction?: 'horizontal' | 'vertical' | 'grid';
  children: React.ReactNode;
}

export const FocusGroup = forwardRef<HTMLDivElement, FocusGroupProps>(
  ({ groupId, direction = 'horizontal', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-tv-group={groupId}
        data-tv-direction={direction}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FocusGroup.displayName = 'FocusGroup';

export default Focusable;
