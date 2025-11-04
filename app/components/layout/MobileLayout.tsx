'use client';

/**
 * Mobile Layout Wrapper
 * Handles mobile-specific layout concerns including safe areas and bottom navigation
 */

import React, { useEffect } from 'react';
import { useIsMobile } from '@/app/lib/hooks/useMediaQuery';
import { useTouchOptimization } from '@/app/lib/hooks/useTouchOptimization';
import styles from './MobileLayout.module.css';

export interface MobileLayoutProps {
  children: React.ReactNode;
  hasBottomNav?: boolean;
  hasTopNav?: boolean;
  className?: string;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  hasBottomNav = false,
  hasTopNav = true,
  className = '',
}) => {
  const isMobile = useIsMobile();
  useTouchOptimization({
    preventDoubleTapZoom: true,
    preventContextMenu: true,
    enableFastClick: true,
    hapticFeedback: true,
  });

  // Set viewport meta tag for mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover'
      );
    }
  }, []);

  // Add touch-action to body
  useEffect(() => {
    if (isMobile) {
      document.body.style.touchAction = 'pan-y pinch-zoom';
      return () => {
        document.body.style.touchAction = '';
      };
    }
  }, [isMobile]);

  const layoutClasses = [
    styles.mobileLayout,
    hasBottomNav && styles.withBottomNav,
    hasTopNav && styles.withTopNav,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={layoutClasses}>
      <div className={styles.content}>{children}</div>
    </div>
  );
};

export default MobileLayout;
