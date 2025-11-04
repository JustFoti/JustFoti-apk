'use client';

/**
 * Mobile Optimization Demo
 * Demonstrates all mobile optimization features
 */

import React, { useState } from 'react';
import { useIsMobile, useIsTablet } from '@/app/lib/hooks/useMediaQuery';
import { useGestures } from '@/app/lib/hooks/useGestures';
import { useTouchOptimization } from '@/app/lib/hooks/useTouchOptimization';
import { MobileLayout } from '@/app/components/layout/MobileLayout';
import { ResponsiveContentGrid } from '@/app/components/content/ResponsiveContentGrid';
import styles from './MobileOptimizationDemo.module.css';

export const MobileOptimizationDemo: React.FC = () => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { triggerHaptic } = useTouchOptimization();

  const [gestureLog, setGestureLog] = useState<string[]>([]);

  const logGesture = (gesture: string) => {
    setGestureLog((prev) => [gesture, ...prev].slice(0, 5));
    triggerHaptic('light');
  };

  const gestures = useGestures({
    onSwipeLeft: () => logGesture('Swipe Left'),
    onSwipeRight: () => logGesture('Swipe Right'),
    onSwipeUp: () => logGesture('Swipe Up'),
    onSwipeDown: () => logGesture('Swipe Down'),
    onDoubleTap: () => logGesture('Double Tap'),
    onLongPress: () => logGesture('Long Press'),
    onPinchIn: (scale) => logGesture(`Pinch In (${scale.toFixed(2)})`),
    onPinchOut: (scale) => logGesture(`Pinch Out (${scale.toFixed(2)})`),
  });

  const mockItems = Array.from({ length: 12 }, (_, i) => ({
    id: `${i}`,
    title: `Movie ${i + 1}`,
    overview: 'A great movie with an interesting plot.',
    posterPath: `/api/placeholder/300/450?text=Movie${i + 1}`,
    backdropPath: `/api/placeholder/1280/720?text=Backdrop${i + 1}`,
    releaseDate: '2024-01-01',
    rating: 7.5 + Math.random() * 2,
    voteCount: 1000,
    mediaType: (i % 2 === 0 ? 'movie' : 'tv') as 'movie' | 'tv',
    genres: [{ id: 1, name: 'Action' }],
  }));

  return (
    <MobileLayout hasBottomNav={isMobile} hasTopNav={true}>
      <div className={styles.demo}>
        {/* Device Info */}
        <section className={styles.section}>
          <h2 className={styles.heading}>Device Detection</h2>
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span>Device Type:</span>
              <strong>
                {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
              </strong>
            </div>
            <div className={styles.infoRow}>
              <span>Viewport Width:</span>
              <strong>{typeof window !== 'undefined' ? window.innerWidth : 0}px</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Pixel Ratio:</span>
              <strong>
                {typeof window !== 'undefined' ? window.devicePixelRatio : 1}x
              </strong>
            </div>
          </div>
        </section>

        {/* Gesture Demo */}
        <section className={styles.section}>
          <h2 className={styles.heading}>Gesture Controls</h2>
          <div
            className={styles.gestureArea}
            {...gestures}
          >
            <p className={styles.gestureText}>
              Try gestures here:
              <br />
              Swipe, Double Tap, Long Press, Pinch
            </p>
          </div>
          <div className={styles.gestureLog}>
            <h3 className={styles.subheading}>Gesture Log:</h3>
            {gestureLog.length === 0 ? (
              <p className={styles.emptyLog}>No gestures detected yet</p>
            ) : (
              <ul className={styles.logList}>
                {gestureLog.map((gesture, index) => (
                  <li key={index} className={styles.logItem}>
                    {gesture}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Touch Targets */}
        <section className={styles.section}>
          <h2 className={styles.heading}>Touch-Friendly Buttons</h2>
          <div className={styles.buttonGrid}>
            <button
              className={styles.touchButton}
              onClick={() => {
                triggerHaptic('light');
                alert('Light haptic');
              }}
            >
              Light
            </button>
            <button
              className={styles.touchButton}
              onClick={() => {
                triggerHaptic('medium');
                alert('Medium haptic');
              }}
            >
              Medium
            </button>
            <button
              className={styles.touchButton}
              onClick={() => {
                triggerHaptic('heavy');
                alert('Heavy haptic');
              }}
            >
              Heavy
            </button>
          </div>
          <p className={styles.note}>
            All buttons are 44x44px minimum for touch accessibility
          </p>
        </section>

        {/* Responsive Grid */}
        <section className={styles.section}>
          <h2 className={styles.heading}>Responsive Content Grid</h2>
          <ResponsiveContentGrid
            items={mockItems}
            onItemSelect={(id) => alert(`Selected: ${id}`)}
          />
        </section>

        {/* Safe Areas */}
        <section className={styles.section}>
          <h2 className={styles.heading}>Safe Area Support</h2>
          <div className={styles.safeAreaDemo}>
            <div className={styles.safeAreaBox}>
              <p>This content respects safe area insets on notched devices</p>
            </div>
          </div>
        </section>

        {/* Responsive Typography */}
        <section className={styles.section}>
          <h2 className={styles.heading}>Responsive Typography</h2>
          <div className={styles.typographyDemo}>
            <p className="text-responsive-sm">Small responsive text</p>
            <p className="text-responsive-base">Base responsive text</p>
            <p className="text-responsive-lg">Large responsive text</p>
            <p className="text-responsive-xl">Extra large responsive text</p>
          </div>
        </section>
      </div>
    </MobileLayout>
  );
};

export default MobileOptimizationDemo;
